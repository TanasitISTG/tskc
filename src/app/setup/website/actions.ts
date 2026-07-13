"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { readWebsiteImageFile } from "@/app/setup/website/file-input";
import { getDatabase } from "@/db/client";
import { requireSession } from "@/lib/auth-guards";
import { RESERVED_SUBDOMAINS, normalizeSubdomain } from "@/lib/tenancy";
import {
  WEBSITE_TEXT_FIELDS,
  type WebsiteField,
  type WebsiteFormState,
  type WebsiteFormValues,
  websiteContentToValues,
  websiteDraftContentSchema,
  websitePublishedContentSchema,
  websiteValuesToContent,
} from "@/lib/websites";
import { createAuthContext } from "@/server/auth-context";
import { requireSellerSubscriptionAccess } from "@/server/billing-service";
import {
  WebsiteStorageError,
  deleteWebsiteAssets,
  unreferencedWebsiteAssetKeys,
  uploadWebsiteAssets,
  type WebsiteAssetKind,
} from "@/server/r2";
import { findSellerShop } from "@/server/shops";
import { SubscriptionAccessError } from "@/server/subscriptions";
import {
  mergeWebsiteAssets,
  persistSellerWebsite,
  websiteConflictKind,
  type WebsiteIntent,
} from "@/server/websites";

function readValues(formData: FormData): WebsiteFormValues {
  const values = Object.fromEntries(
    WEBSITE_TEXT_FIELDS.map((field) => {
      const value = formData.get(field);
      return [field, typeof value === "string" ? value : ""];
    }),
  ) as WebsiteFormValues;

  if (formData.get("includeAccentColor") !== "on") {
    values.accentColor = "";
  }

  return values;
}

function errorState(
  values: WebsiteFormValues,
  message: string,
  fieldErrors: Partial<Record<WebsiteField, string[]>> = {},
): WebsiteFormState {
  return { status: "error", values, fieldErrors, message };
}

function validationErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Partial<Record<WebsiteField, string[]>> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string") {
      const websiteField = field as WebsiteField;
      fieldErrors[websiteField] = [...(fieldErrors[websiteField] ?? []), issue.message];
    }
  }

  return fieldErrors;
}

async function compensate(keys: string[]) {
  try {
    await deleteWebsiteAssets(keys);
  } catch {
    console.error("Failed to remove newly uploaded website assets after a database error");
  }
}

export async function saveWebsiteAction(
  _previousState: WebsiteFormState,
  formData: FormData,
): Promise<WebsiteFormState> {
  const values = readValues(formData);
  const identity = requireSession((await createAuthContext(await headers())).identity);

  try {
    await requireSellerSubscriptionAccess(identity.userId);
  } catch (error) {
    if (error instanceof SubscriptionAccessError) {
      return errorState(values, "An active subscription is required to save your website.");
    }

    throw error;
  }

  const database = getDatabase();
  const existingShop = await findSellerShop(database, identity.userId);
  const rawIntent = formData.get("intent");

  if (rawIntent !== "save" && rawIntent !== "publish") {
    return errorState(values, "Choose Save draft or Publish website and try again.");
  }

  const intent: WebsiteIntent = rawIntent;
  let subdomain: string;

  try {
    subdomain = normalizeSubdomain(values.subdomain);
  } catch {
    const normalized = values.subdomain.trim().toLowerCase();
    const message =
      normalized === ""
        ? "Subdomain is required to save your website."
        : RESERVED_SUBDOMAINS.includes(normalized as never)
          ? "This subdomain is reserved."
          : "Use 1–63 letters, numbers, or internal hyphens.";
    return errorState(values, "Fix the highlighted field and try again.", {
      subdomain: [message],
    });
  }

  const content = websiteValuesToContent(values);
  const parsed =
    intent === "publish"
      ? websitePublishedContentSchema.safeParse(content)
      : websiteDraftContentSchema.safeParse(content);

  if (!parsed.success) {
    return errorState(
      values,
      "Fix the highlighted fields and try again.",
      validationErrors(parsed.error),
    );
  }

  const removals = new Set<WebsiteAssetKind>(
    (["logo", "hero"] as const).filter(
      (kind) => formData.get(`remove${kind === "logo" ? "Logo" : "Hero"}`) === "on",
    ),
  );
  const files = Object.fromEntries(
    (["logo", "hero"] as const)
      .filter((kind) => !removals.has(kind))
      .map((kind) => [kind, readWebsiteImageFile(formData, kind)])
      .filter((entry): entry is [WebsiteAssetKind, File] => entry[1] !== undefined),
  );
  const shopId = existingShop?.id ?? randomUUID();
  let uploaded;

  try {
    uploaded = await uploadWebsiteAssets(shopId, files);
  } catch (error) {
    if (error instanceof WebsiteStorageError) {
      const retry = " Select the file again before retrying.";
      return errorState(
        values,
        error.field === undefined ? error.message : `Image upload failed.${retry}`,
        error.field === undefined ? {} : { [error.field]: [`${error.message}${retry}`] },
      );
    }

    throw error;
  }

  const draftContent = mergeWebsiteAssets(
    parsed.data,
    existingShop?.draftContent ?? {},
    uploaded,
    removals,
  );
  let saved;

  try {
    saved = await persistSellerWebsite(database, {
      sellerId: identity.userId,
      shopId,
      existingShop,
      subdomain,
      draftContent,
      intent,
      now: new Date(),
    });
  } catch (error) {
    await compensate(Object.values(uploaded).map((asset) => asset.key));
    const conflict = websiteConflictKind(error);

    if (conflict === "subdomain") {
      return errorState(values, "That subdomain is already in use.", {
        subdomain: ["Choose a different subdomain."],
      });
    }

    if (conflict === "website") {
      return errorState(values, "Your website changed while saving. Refresh and try again.");
    }

    throw error;
  }

  const replacedKeys = unreferencedWebsiteAssetKeys(
    existingShop?.draftContent ?? {},
    existingShop?.publishedContent ?? null,
    saved.draftContent,
    saved.publishedContent,
  );

  try {
    await deleteWebsiteAssets(replacedKeys);
  } catch {
    console.error("Failed to remove replaced website assets after a successful save");
  }

  revalidatePath("/setup/website");

  return {
    status: intent === "publish" ? "published" : "saved",
    values: websiteContentToValues(saved.subdomain, saved.draftContent),
    fieldErrors: {},
    message: intent === "publish" ? "Website published." : "Draft saved.",
    publishedAt: saved.publishedAt?.toISOString(),
  };
}
