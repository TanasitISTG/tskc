import "server-only";

import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";

import { createDatabase } from "@/db/client";
import * as schema from "@/db/schema";
import { parseServerEnv } from "@/lib/env";
import { sendPasswordResetEmail } from "@/lib/resend";

function syntheticEmail(provider: string, id: string): string {
  return `${id}@${provider}.oauth.invalid`;
}

function createAuth() {
  const env = parseServerEnv(process.env);

  if (env.databaseUrl === undefined) {
    throw new Error("DATABASE_URL is required to initialize authentication");
  }

  return betterAuth({
    appName: "TSKC",
    baseURL: env.betterAuth?.url ?? `http://${env.platformDomain}`,
    secret: env.betterAuth?.secret,
    database: drizzleAdapter(createDatabase(env.databaseUrl), {
      provider: "pg",
      schema,
      camelCase: true,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        if (env.resend === undefined) {
          throw new Error("Resend is not configured");
        }

        await sendPasswordResetEmail({ to: user.email, url }, env.resend);
      },
    },
    socialProviders: {
      ...(env.google && {
        google: {
          clientId: env.google.clientId,
          clientSecret: env.google.clientSecret,
          scope: ["email", "profile"],
          mapProfileToUser: (profile) => ({
            email: profile.email ?? syntheticEmail("google", profile.sub),
          }),
        },
      }),
      ...(env.facebook && {
        facebook: {
          clientId: env.facebook.clientId,
          clientSecret: env.facebook.clientSecret,
          scope: ["email", "public_profile"],
          mapProfileToUser: (profile) => ({
            email: profile.email ?? syntheticEmail("facebook", profile.id),
          }),
        },
      }),
      ...(env.discord && {
        discord: {
          clientId: env.discord.clientId,
          clientSecret: env.discord.clientSecret,
          scope: ["email", "identify"],
          mapProfileToUser: (profile) => ({
            email: profile.email ?? syntheticEmail("discord", profile.id),
          }),
        },
      }),
    },
    account: {
      accountLinking: {
        disableImplicitLinking: true,
      },
    },
    rateLimit: {
      storage: "database",
      customRules: {
        "/sign-in/username": { window: 900, max: 5 },
        "/sign-up/email": { window: 900, max: 5 },
        "/request-password-reset": { window: 3600, max: 3 },
        "/reset-password": { window: 900, max: 5 },
      },
    },
    plugins: [username(), nextCookies()],
  });
}

let authInstance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  authInstance ??= createAuth();
  return authInstance;
}
