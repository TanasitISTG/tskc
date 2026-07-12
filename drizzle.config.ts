import { defineConfig } from "drizzle-kit";
import { readFileSync } from "node:fs";

function localDatabaseUrl() {
  try {
    const values = readFileSync(".env.local", "utf8").match(
      /^DATABASE_URL=(?:"([^"]*)"|'([^']*)'|([^\r\n]*))$/m,
    );

    return values
      ?.slice(1)
      .find((value) => value !== undefined)
      ?.trim();
  } catch {
    return undefined;
  }
}

const databaseUrl = process.env.DATABASE_URL ?? localDatabaseUrl();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  ...(databaseUrl === undefined ? {} : { dbCredentials: { url: databaseUrl } }),
});
