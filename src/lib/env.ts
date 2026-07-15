import "server-only";

import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);
const httpsUrl = nonEmptyString.url().refine((value) => new URL(value).protocol === "https:", {
  message: "URL must use HTTPS",
});

const rawEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).optional(),
    PLATFORM_DOMAIN: nonEmptyString.optional(),
    DATABASE_URL: nonEmptyString.optional(),
    BETTER_AUTH_SECRET: nonEmptyString.min(32).optional(),
    BETTER_AUTH_URL: nonEmptyString.url().optional(),
    GOOGLE_CLIENT_ID: nonEmptyString.optional(),
    GOOGLE_CLIENT_SECRET: nonEmptyString.optional(),
    DISCORD_CLIENT_ID: nonEmptyString.optional(),
    DISCORD_CLIENT_SECRET: nonEmptyString.optional(),
    R2_ENDPOINT: nonEmptyString.optional(),
    R2_BUCKET: nonEmptyString.optional(),
    R2_ACCESS_KEY_ID: nonEmptyString.optional(),
    R2_SECRET_ACCESS_KEY: nonEmptyString.optional(),
    R2_PUBLIC_BASE_URL: httpsUrl.optional(),
    RESEND_API_KEY: nonEmptyString.optional(),
    RESEND_FROM: nonEmptyString.optional(),
    STRIPE_SECRET_KEY: nonEmptyString.optional(),
    STRIPE_WEBHOOK_SECRET: nonEmptyString.optional(),
    STRIPE_PRICE_ID: nonEmptyString.optional(),
    KV_REST_API_URL: nonEmptyString.optional(),
    KV_REST_API_TOKEN: nonEmptyString.optional(),
  })
  .passthrough();

function allOrNone(
  name: string,
  values: Record<string, string | undefined>,
): Record<string, string> | undefined {
  const entries = Object.entries(values);
  const configured = entries.filter((entry): entry is [string, string] => entry[1] !== undefined);

  if (configured.length === 0) {
    return undefined;
  }

  if (configured.length !== entries.length) {
    throw new Error(`${name} configuration must set all or none of its variables`);
  }

  return Object.fromEntries(configured);
}

export function parseServerEnv(input: Record<string, string | undefined>) {
  const env = rawEnvSchema.parse(input);

  if (env.NODE_ENV === "production" && env.PLATFORM_DOMAIN === undefined) {
    throw new Error("PLATFORM_DOMAIN is required in production");
  }

  const r2 = allOrNone("R2", {
    R2_ENDPOINT: env.R2_ENDPOINT,
    R2_BUCKET: env.R2_BUCKET,
    R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY,
    R2_PUBLIC_BASE_URL: env.R2_PUBLIC_BASE_URL,
  });
  const betterAuth = allOrNone("Better Auth", {
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: env.BETTER_AUTH_URL,
  });
  const google = allOrNone("Google OAuth", {
    GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
  });
  const discord = allOrNone("Discord OAuth", {
    DISCORD_CLIENT_ID: env.DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET: env.DISCORD_CLIENT_SECRET,
  });
  const resend = allOrNone("Resend", {
    RESEND_API_KEY: env.RESEND_API_KEY,
    RESEND_FROM: env.RESEND_FROM,
  });
  const stripe = allOrNone("Stripe", {
    STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID: env.STRIPE_PRICE_ID,
  });
  const kv = allOrNone("KV", {
    KV_REST_API_URL: env.KV_REST_API_URL,
    KV_REST_API_TOKEN: env.KV_REST_API_TOKEN,
  });
  if (env.NODE_ENV === "production") {
    if (env.DATABASE_URL === undefined) {
      throw new Error("DATABASE_URL is required in production");
    }

    if (stripe === undefined) {
      throw new Error("Stripe configuration is required in production");
    }

    if (
      betterAuth === undefined ||
      resend === undefined ||
      google === undefined ||
      discord === undefined
    ) {
      throw new Error("Auth configuration is required in production");
    }

    if (r2 === undefined) {
      throw new Error("R2 configuration is required in production");
    }

    if (kv === undefined) {
      throw new Error("KV configuration is required in production");
    }

    const publicR2Hostname = new URL(r2.R2_PUBLIC_BASE_URL).hostname;
    if (publicR2Hostname === "r2.dev" || publicR2Hostname.endsWith(".r2.dev")) {
      throw new Error("R2_PUBLIC_BASE_URL must use a custom domain in production");
    }
  }

  return {
    platformDomain: env.PLATFORM_DOMAIN ?? "localhost:3000",
    databaseUrl: env.DATABASE_URL,
    betterAuth: betterAuth && {
      secret: betterAuth.BETTER_AUTH_SECRET,
      url: betterAuth.BETTER_AUTH_URL,
    },
    google: google && {
      clientId: google.GOOGLE_CLIENT_ID,
      clientSecret: google.GOOGLE_CLIENT_SECRET,
    },
    discord: discord && {
      clientId: discord.DISCORD_CLIENT_ID,
      clientSecret: discord.DISCORD_CLIENT_SECRET,
    },
    r2: r2 && {
      endpoint: r2.R2_ENDPOINT,
      bucket: r2.R2_BUCKET,
      accessKeyId: r2.R2_ACCESS_KEY_ID,
      secretAccessKey: r2.R2_SECRET_ACCESS_KEY,
      publicBaseUrl: r2.R2_PUBLIC_BASE_URL.replace(/\/+$/, ""),
    },
    resend: resend && {
      apiKey: resend.RESEND_API_KEY,
      from: resend.RESEND_FROM,
    },
    stripe: stripe && {
      secretKey: stripe.STRIPE_SECRET_KEY,
      webhookSecret: stripe.STRIPE_WEBHOOK_SECRET,
      priceId: stripe.STRIPE_PRICE_ID,
    },
    kv: kv && {
      restApiUrl: kv.KV_REST_API_URL,
      restApiToken: kv.KV_REST_API_TOKEN,
    },
  };
}

export type ServerEnv = ReturnType<typeof parseServerEnv>;
