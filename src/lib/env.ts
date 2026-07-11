import "server-only";

import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

const rawEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).optional(),
    PLATFORM_DOMAIN: nonEmptyString.optional(),
    DATABASE_URL: nonEmptyString.optional(),
    BETTER_AUTH_SECRET: nonEmptyString.min(32).optional(),
    BETTER_AUTH_URL: nonEmptyString.url().optional(),
    GOOGLE_CLIENT_ID: nonEmptyString.optional(),
    GOOGLE_CLIENT_SECRET: nonEmptyString.optional(),
    FACEBOOK_CLIENT_ID: nonEmptyString.optional(),
    FACEBOOK_CLIENT_SECRET: nonEmptyString.optional(),
    DISCORD_CLIENT_ID: nonEmptyString.optional(),
    DISCORD_CLIENT_SECRET: nonEmptyString.optional(),
    R2_ENDPOINT: nonEmptyString.optional(),
    R2_BUCKET: nonEmptyString.optional(),
    R2_ACCESS_KEY_ID: nonEmptyString.optional(),
    R2_SECRET_ACCESS_KEY: nonEmptyString.optional(),
    RESEND_API_KEY: nonEmptyString.optional(),
    RESEND_FROM: nonEmptyString.optional(),
    SLIP2GO_BASE_URL: nonEmptyString.url().optional(),
    SLIP2GO_API_KEY: nonEmptyString.optional(),
  })
  .passthrough();

function allOrNone(
  name: string,
  values: Record<string, string | undefined>,
): Record<string, string> | undefined {
  const entries = Object.entries(values);
  const configured = entries.filter(
    (entry): entry is [string, string] => entry[1] !== undefined,
  );

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
  });
  const betterAuth = allOrNone("Better Auth", {
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: env.BETTER_AUTH_URL,
  });
  const google = allOrNone("Google OAuth", {
    GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
  });
  const facebook = allOrNone("Facebook OAuth", {
    FACEBOOK_CLIENT_ID: env.FACEBOOK_CLIENT_ID,
    FACEBOOK_CLIENT_SECRET: env.FACEBOOK_CLIENT_SECRET,
  });
  const discord = allOrNone("Discord OAuth", {
    DISCORD_CLIENT_ID: env.DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET: env.DISCORD_CLIENT_SECRET,
  });
  const resend = allOrNone("Resend", {
    RESEND_API_KEY: env.RESEND_API_KEY,
    RESEND_FROM: env.RESEND_FROM,
  });
  const slip2Go = allOrNone("Slip2Go", {
    SLIP2GO_BASE_URL: env.SLIP2GO_BASE_URL,
    SLIP2GO_API_KEY: env.SLIP2GO_API_KEY,
  });

  if (env.NODE_ENV === "production") {
    if (env.DATABASE_URL === undefined) {
      throw new Error("DATABASE_URL is required in production");
    }

    if (betterAuth === undefined || resend === undefined || google === undefined || facebook === undefined || discord === undefined) {
      throw new Error("Auth configuration is required in production");
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
    facebook: facebook && {
      clientId: facebook.FACEBOOK_CLIENT_ID,
      clientSecret: facebook.FACEBOOK_CLIENT_SECRET,
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
    },
    resend: resend && {
      apiKey: resend.RESEND_API_KEY,
      from: resend.RESEND_FROM,
    },
    slip2Go: slip2Go && {
      baseUrl: slip2Go.SLIP2GO_BASE_URL,
      apiKey: slip2Go.SLIP2GO_API_KEY,
    },
  };
}

export type ServerEnv = ReturnType<typeof parseServerEnv>;
