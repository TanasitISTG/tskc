import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "@/db/schema";
import { parseServerEnv } from "@/lib/env";

export function createDatabase(databaseUrl: string) {
  return drizzle(neon(databaseUrl), { schema });
}

export function getDatabase() {
  const databaseUrl = parseServerEnv(process.env).databaseUrl;

  if (databaseUrl === undefined) {
    throw new Error("DATABASE_URL is required to access the database");
  }

  return createDatabase(databaseUrl);
}
