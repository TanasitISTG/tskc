"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Colorful from "@uiw/react-color-colorful";
import Image, { type ImageLoader } from "next/image";
import Link from "next/link";

import { saveWebsiteAction } from "@/app/setup/website/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { websitePublishedContentSchema, websiteValuesToContent } from "@/lib/websites";
import type {
  WebsiteAssetRef,
  WebsiteField,
  WebsiteFormState,
  WebsiteTextField,
} from "@/lib/websites";

type StoredAsset = WebsiteAssetRef & { url: string };

const inputClass = "h-11 rounded-lg px-3";
const labelClass = "text-sm font-medium text-foreground";
const helpClass = "text-sm leading-relaxed text-muted-foreground";
const errorClass = "text-sm leading-relaxed text-destructive";
const publicAssetLoader: ImageLoader = ({ src }) => src;
const defaultAccentColor = "#72ADFF";
const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;

function describedBy(field: WebsiteField, hasHelp: boolean, hasError: boolean) {
  return (
    [hasHelp && `${field}-help`, hasError && `${field}-error`].filter(Boolean).join(" ") ||
    undefined
  );
}

function FieldError({ field, errors }: { field: WebsiteField; errors?: string[] }) {
  return errors?.length ? (
    <div id={`${field}-error`} className={errorClass} role="alert">
      {errors.map((error) => (
        <p key={error}>{error}</p>
      ))}
    </div>
  ) : null;
}

function AssetField({
  kind,
  label,
  help,
  stored,
  errors,
}: {
  kind: "logo" | "hero";
  label: string;
  help: string;
  stored?: StoredAsset;
  errors?: string[];
}) {
  const removeName = kind === "logo" ? "removeLogo" : "removeHero";
  const hasError = !!errors?.length;

  return (
    <div className="grid gap-3" data-invalid={hasError || undefined}>
      <label className={labelClass} htmlFor={kind}>
        {label}
      </label>
      {stored && (
        <div className="grid gap-3 rounded-lg border border-border bg-background p-3 sm:grid-cols-[8rem_1fr] sm:items-center">
          <Image
            loader={publicAssetLoader}
            unoptimized
            width={kind === "logo" ? 96 : 128}
            height={kind === "logo" ? 96 : 112}
            className={
              kind === "logo"
                ? "h-24 w-24 rounded-lg bg-white object-contain p-2"
                : "h-28 w-full rounded-lg object-cover sm:w-32"
            }
            src={stored.url}
            alt={`Current ${label.toLowerCase()}`}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium">Current {label.toLowerCase()}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {stored.contentType.replace("image/", "").toUpperCase()} ·{" "}
              {(stored.size / 1024).toFixed(0)} KiB
            </p>
            <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input className="size-5 accent-white" type="checkbox" name={removeName} />
              Remove on next save or publish
            </label>
          </div>
        </div>
      )}
      <Input
        id={kind}
        name={kind}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="h-11 cursor-pointer py-2"
        aria-invalid={hasError}
        aria-describedby={describedBy(kind, true, hasError)}
      />
      <p id={`${kind}-help`} className={helpClass}>
        {help} PNG, JPEG, or WebP only. If a new file is rejected, select it again before retrying.
      </p>
      <FieldError field={kind} errors={errors} />
    </div>
  );
}

function AccentColorField({ value, errors }: { value: string; errors?: string[] }) {
  const [color, setColor] = useState(value || defaultAccentColor);
  const hasError = !!errors?.length;
  const pickerColor = hexColorPattern.test(color) ? color : defaultAccentColor;

  return (
    <div className="grid gap-2">
      <label className={labelClass} htmlFor="accentColor">
        Accent color <span className="font-normal text-muted-foreground">(optional)</span>
      </label>
      <div className="grid gap-3 rounded-lg border border-input bg-background p-3">
        <Colorful
          className="w-full"
          style={{ width: "100%" }}
          color={pickerColor}
          disableAlpha
          aria-hidden="true"
          onChange={(nextColor) => setColor(nextColor.hex.toUpperCase())}
        />
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="size-11 shrink-0 rounded-lg border border-input"
            style={{ backgroundColor: pickerColor }}
            aria-hidden="true"
          />
          <Input
            id="accentColor"
            name="accentColor"
            className={`${inputClass} min-w-0 flex-1 font-mono uppercase`}
            value={color}
            maxLength={7}
            pattern="#[0-9A-Fa-f]{6}"
            placeholder={defaultAccentColor}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={hasError}
            aria-describedby={describedBy("accentColor", true, hasError)}
            onChange={(event) => setColor(event.target.value)}
          />
        </div>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          className="size-5 accent-white"
          type="checkbox"
          name="includeAccentColor"
          defaultChecked={value !== ""}
        />
        Use this accent color
      </label>
      <p id="accentColor-help" className={helpClass}>
        Pick a color or enter a six-digit hex value. Uncheck to leave it unset.
      </p>
      <FieldError field="accentColor" errors={errors} />
    </div>
  );
}

export function WebsiteForm({
  initialState,
  storedAssets,
  publicUrl,
  platformDomain,
}: {
  initialState: WebsiteFormState;
  storedAssets: { logo?: StoredAsset; hero?: StoredAsset };
  publicUrl?: string;
  platformDomain: string;
}) {
  const [state, formAction, pending] = useActionState(saveWebsiteAction, initialState);
  const errorSummary = useRef<HTMLDivElement>(null);
  const errorEntries = Object.entries(state.fieldErrors) as [WebsiteField, string[]][];
  const canPreview =
    state.updatedAt !== undefined &&
    websitePublishedContentSchema.safeParse(websiteValuesToContent(state.values)).success;
  const resolvedPublicUrl =
    publicUrl ??
    (state.publishedAt && state.values.subdomain
      ? `${platformDomain.startsWith("localhost") ? "http" : "https"}://${state.values.subdomain}.${platformDomain}`
      : undefined);

  useEffect(() => {
    if (state.status === "error") {
      errorSummary.current?.focus();
    }
  }, [state]);

  const fieldProps = (field: WebsiteTextField, help = false) => {
    const hasError = !!state.fieldErrors[field]?.length;
    return {
      id: field,
      name: field,
      defaultValue: state.values[field],
      "aria-invalid": hasError,
      "aria-describedby": describedBy(field, help, hasError),
    };
  };

  return (
    <form action={formAction} className="mt-8 grid gap-6">
      {state.updatedAt && <input type="hidden" name="expectedUpdatedAt" value={state.updatedAt} />}
      {state.status === "error" && (
        <div
          ref={errorSummary}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-destructive/60 bg-destructive/10 p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <h2 className="font-semibold">Your website was not saved</h2>
          <p className="mt-1 text-sm leading-relaxed">{state.message}</p>
          {errorEntries.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {errorEntries.map(([field, errors]) => (
                <li key={field}>
                  <a className="underline underline-offset-4" href={`#${field}`}>
                    {errors[0]}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="sr-only" aria-live="polite" role="status">
        {pending ? "Saving website" : state.status === "error" ? "" : state.message}
      </p>

      <Card className="gap-0 py-0">
        <CardContent className="grid gap-6 p-5 sm:p-7">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Identity</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Business name, description, and subdomain are required to publish.
            </p>
          </div>

          <div className="grid items-start gap-5 sm:grid-cols-2">
            <div className="grid min-w-0 gap-2">
              <label className={labelClass} htmlFor="subdomain">
                Subdomain
              </label>
              <div className="flex min-w-0 items-center rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                <Input
                  {...fieldProps("subdomain", true)}
                  className="h-11 min-w-0 flex-1 border-0 px-3 focus-visible:ring-0"
                  maxLength={63}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <span className="shrink-0 pr-3 text-sm text-muted-foreground" aria-hidden="true">
                  .4747808.xyz
                </span>
              </div>
              <p id="subdomain-help" className={helpClass}>
                Letters, numbers, and internal hyphens. Saved in lowercase.
              </p>
              <FieldError field="subdomain" errors={state.fieldErrors.subdomain} />
            </div>

            <div className="grid min-w-0 gap-2">
              <label className={labelClass} htmlFor="businessName">
                Business name
              </label>
              <Input {...fieldProps("businessName")} className={inputClass} maxLength={80} />
              <FieldError field="businessName" errors={state.fieldErrors.businessName} />
            </div>
          </div>

          <div className="grid gap-2">
            <label className={labelClass} htmlFor="description">
              Description
            </label>
            <textarea
              {...fieldProps("description", true)}
              className="min-h-32 w-full resize-y rounded-lg border border-input bg-transparent px-3 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm"
              maxLength={1000}
            />
            <p id="description-help" className={helpClass}>
              Tell visitors what you make, sell, or do. Up to 1,000 characters.
            </p>
            <FieldError field="description" errors={state.fieldErrors.description} />
          </div>

          <div className="grid gap-2">
            <label className={labelClass} htmlFor="tagline">
              Tagline <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input {...fieldProps("tagline")} className={inputClass} maxLength={120} />
            <FieldError field="tagline" errors={state.fieldErrors.tagline} />
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardContent className="grid gap-6 p-5 sm:p-7">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Contact and brand</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Optional details help customers recognize and reach you.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid min-w-0 gap-2">
              <label className={labelClass} htmlFor="email">
                Email <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                {...fieldProps("email")}
                className={inputClass}
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={254}
              />
              <FieldError field="email" errors={state.fieldErrors.email} />
            </div>
            <div className="grid min-w-0 gap-2">
              <label className={labelClass} htmlFor="phone">
                Telephone <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                {...fieldProps("phone")}
                className={inputClass}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={30}
              />
              <FieldError field="phone" errors={state.fieldErrors.phone} />
            </div>
          </div>

          <div className="grid gap-2">
            <label className={labelClass} htmlFor="address">
              Address <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              {...fieldProps("address")}
              className="min-h-24 w-full resize-y rounded-lg border border-input bg-transparent px-3 py-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm"
              autoComplete="street-address"
              maxLength={300}
            />
            <FieldError field="address" errors={state.fieldErrors.address} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <AccentColorField
              key={state.values.accentColor}
              value={state.values.accentColor}
              errors={state.fieldErrors.accentColor}
            />
            <div className="grid min-w-0 content-start gap-2">
              <label className={labelClass} htmlFor="primaryLink">
                Primary link
              </label>
              <Input
                {...fieldProps("primaryLink", true)}
                className={inputClass}
                type="url"
                inputMode="url"
                placeholder="https://example.com"
                maxLength={2048}
              />
              <p id="primaryLink-help" className={helpClass}>
                One public HTTPS link without embedded credentials.
              </p>
              <FieldError field="primaryLink" errors={state.fieldErrors.primaryLink} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardContent className="grid gap-7 p-5 sm:p-7">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Images</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Stored images remain in place until a save or publish succeeds.
            </p>
          </div>
          <AssetField
            kind="logo"
            label="Logo"
            help="Maximum 2 MiB."
            stored={storedAssets.logo}
            errors={state.fieldErrors.logo}
          />
          <AssetField
            kind="hero"
            label="Hero image"
            help="Maximum 5 MiB."
            stored={storedAssets.hero}
            errors={state.fieldErrors.hero}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div aria-live="polite" role="status" className="min-h-5 text-sm text-muted-foreground">
          {pending
            ? "Saving…"
            : state.status === "saved" ||
                state.status === "published" ||
                state.status === "unpublished"
              ? state.message
              : state.publishedAt
                ? `Last published ${new Date(state.publishedAt).toLocaleString()}`
                : "Not published yet"}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
          {canPreview ? (
            <Link
              className={buttonVariants({ variant: "outline", className: "h-11 min-w-32" })}
              href="/setup/website/preview"
            >
              Preview draft
            </Link>
          ) : (
            <span className="flex min-h-11 items-center justify-center px-2 text-sm text-muted-foreground">
              Add required fields to preview
            </span>
          )}
          <Button
            className="h-11 min-w-32"
            type="submit"
            name="intent"
            value="save"
            variant="outline"
            disabled={pending}
          >
            {pending ? "Saving…" : "Save draft"}
          </Button>
          <Button
            className="h-11 min-w-40"
            type="submit"
            name="intent"
            value="publish"
            disabled={pending}
          >
            {pending ? "Publishing…" : "Publish website"}
          </Button>
          {state.publishedAt && (
            <>
              {resolvedPublicUrl && (
                <a
                  className={buttonVariants({ className: "h-11 min-w-40" })}
                  href={resolvedPublicUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open public website
                </a>
              )}
              <Button
                className="h-11 min-w-32"
                type="submit"
                name="intent"
                value="unpublish"
                variant="outline"
                disabled={pending}
              >
                Unpublish
              </Button>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
