import { z } from "zod";

export const RESERVED_SUBDOMAINS = ["www", "api", "admin"] as const;

const subdomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/)
  .refine((value) => !RESERVED_SUBDOMAINS.includes(value as never), {
    message: "Subdomain is reserved",
  });

export type HostContext =
  | { kind: "platform" }
  | { kind: "storefront"; subdomain: string }
  | { kind: "unknown" };

export function normalizeSubdomain(value: string) {
  return subdomainSchema.parse(value);
}

export function resolveHost(
  host: string | null,
  platformDomain: string,
): HostContext {
  const normalizedPlatformDomain = platformDomain.trim().toLowerCase();
  const normalizedHost = host?.trim().toLowerCase();

  if (
    normalizedHost === undefined ||
    normalizedHost === "" ||
    normalizedHost.includes(",") ||
    normalizedHost.includes("/") ||
    normalizedHost.includes("@")
  ) {
    return { kind: "unknown" };
  }

  if (normalizedHost === normalizedPlatformDomain) {
    return { kind: "platform" };
  }

  if (normalizedPlatformDomain.startsWith("localhost")) {
    return { kind: "unknown" };
  }

  const suffix = `.${normalizedPlatformDomain}`;
  if (!normalizedHost.endsWith(suffix)) {
    return { kind: "unknown" };
  }

  const subdomain = normalizedHost.slice(0, -suffix.length);
  try {
    return { kind: "storefront", subdomain: normalizeSubdomain(subdomain) };
  } catch {
    return { kind: "unknown" };
  }
}
