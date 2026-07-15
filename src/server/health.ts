import "server-only";

import { sql } from "drizzle-orm";

import { createDatabase } from "@/db/client";
import type { ServerEnv } from "@/lib/env";

export type HealthCheck = "ok" | "fail";
export type HealthResult = {
  status: "ok" | "degraded";
  checks: Record<string, HealthCheck>;
};

const HEALTH_CHECK_TIMEOUT_MS = 2500;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("health check timeout")), ms)),
  ]);
}

function checkAuthConfig(env: ServerEnv): HealthCheck {
  return env.betterAuth !== undefined &&
    env.resend !== undefined &&
    env.google !== undefined &&
    env.discord !== undefined
    ? "ok"
    : "fail";
}

function checkStripeConfig(env: ServerEnv): HealthCheck {
  return env.stripe !== undefined ? "ok" : "fail";
}

async function checkDatabase(databaseUrl: string): Promise<HealthCheck> {
  try {
    const db = createDatabase(databaseUrl);
    await withTimeout(db.execute(sql`select 1`), HEALTH_CHECK_TIMEOUT_MS);
    return "ok";
  } catch {
    return "fail";
  }
}

export async function runHealthChecks(env: ServerEnv): Promise<HealthResult> {
  const checks: Record<string, HealthCheck> = {
    auth: checkAuthConfig(env),
    stripe: checkStripeConfig(env),
  };

  checks.db = env.databaseUrl === undefined ? "fail" : await checkDatabase(env.databaseUrl);

  const allOk = Object.values(checks).every((value) => value === "ok");
  return { status: allOk ? "ok" : "degraded", checks };
}
