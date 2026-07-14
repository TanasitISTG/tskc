import { z } from "zod";

export const WEBSITE_TEXT_FIELDS = [
  "subdomain",
  "businessName",
  "description",
  "tagline",
  "email",
  "phone",
  "address",
  "accentColor",
  "primaryLink",
] as const;

export type WebsiteTextField = (typeof WEBSITE_TEXT_FIELDS)[number];
export type WebsiteField = WebsiteTextField | "logo" | "hero";
export type WebsiteFormValues = Record<WebsiteTextField, string>;

export const emptyWebsiteFormValues: WebsiteFormValues = {
  subdomain: "",
  businessName: "",
  description: "",
  tagline: "",
  email: "",
  phone: "",
  address: "",
  accentColor: "",
  primaryLink: "",
};

export interface WebsiteAssetRef {
  key: string;
  contentType: "image/png" | "image/jpeg" | "image/webp";
  size: number;
}

const optionalText = (max: number) => z.string().trim().min(1).max(max).optional();
const requiredText = (label: string, max: number) =>
  z.preprocess((value) => value ?? "", z.string().trim().min(1, `${label} is required`).max(max));
const credentialFreeHttpsUrl = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && url.username === "" && url.password === "";
  }, "Use a credential-free HTTPS URL");

const websiteAssetRefSchema = z
  .object({
    key: z.string().min(1),
    contentType: z.enum(["image/png", "image/jpeg", "image/webp"]),
    size: z.number().int().positive(),
  })
  .strict();

export const websiteDraftContentSchema = z
  .object({
    businessName: optionalText(80),
    description: optionalText(1000),
    tagline: optionalText(120),
    email: z.string().trim().max(254).email().optional(),
    phone: z
      .string()
      .trim()
      .max(30)
      .regex(/^\+?[0-9](?:[0-9 .()/-]*[0-9])?$/, "Enter a valid phone number")
      .optional(),
    address: optionalText(300),
    accentColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Use a six-digit hex color")
      .optional(),
    primaryLink: credentialFreeHttpsUrl.optional(),
    logo: websiteAssetRefSchema.optional(),
    hero: websiteAssetRefSchema.optional(),
  })
  .strict();

export const websitePublishedContentSchema = websiteDraftContentSchema.extend({
  businessName: requiredText("Business name", 80),
  description: requiredText("Description", 1000),
});

export type WebsiteDraftContent = z.infer<typeof websiteDraftContentSchema>;
export type WebsitePublishedContent = z.infer<typeof websitePublishedContentSchema>;

export function websiteValuesToContent(values: WebsiteFormValues): WebsiteDraftContent {
  return Object.fromEntries(
    Object.entries(values)
      .filter(([field, value]) => field !== "subdomain" && value.trim() !== "")
      .map(([field, value]) => [field, value.trim()]),
  ) as WebsiteDraftContent;
}

export function websiteContentToValues(
  subdomain: string,
  content: WebsiteDraftContent,
): WebsiteFormValues {
  return {
    ...emptyWebsiteFormValues,
    subdomain,
    businessName: content.businessName ?? "",
    description: content.description ?? "",
    tagline: content.tagline ?? "",
    email: content.email ?? "",
    phone: content.phone ?? "",
    address: content.address ?? "",
    accentColor: content.accentColor ?? "",
    primaryLink: content.primaryLink ?? "",
  };
}

type WebsiteFormStateBase = {
  values: WebsiteFormValues;
  fieldErrors: Partial<Record<WebsiteField, string[]>>;
  message: string;
  publishedAt?: string;
  updatedAt?: string;
};

export type WebsiteFormState =
  | (WebsiteFormStateBase & { status: "idle" })
  | (WebsiteFormStateBase & { status: "error" })
  | (WebsiteFormStateBase & { status: "saved" })
  | (WebsiteFormStateBase & { status: "published" })
  | (WebsiteFormStateBase & { status: "unpublished" });

export type WebsiteNextAction = "choose-plan" | "finish-setup" | "publish" | "manage";

export function getWebsiteNextAction(input: {
  hasSubscription: boolean;
  accessAllowed: boolean;
  hasShop: boolean;
  isPublishable: boolean;
  isPublished: boolean;
}): WebsiteNextAction {
  if (!input.hasSubscription || !input.accessAllowed) {
    return "choose-plan";
  }

  if (!input.hasShop || !input.isPublishable) {
    return "finish-setup";
  }

  return input.isPublished ? "manage" : "publish";
}
