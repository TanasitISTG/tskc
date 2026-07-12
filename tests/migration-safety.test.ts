import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationsPath = resolve(import.meta.dirname, "../drizzle");

describe("migration safety", () => {
  it("keeps legacy role removal in a new additive migration", () => {
    const sql = readFileSync(
      resolve(migrationsPath, "0002_remove_legacy_application_roles.sql"),
      "utf8",
    );

    expect(sql).toContain('DROP TABLE IF EXISTS "public"."user_role";');
    expect(sql).toContain('DROP TYPE IF EXISTS "public"."app_role";');
    expect(readFileSync(resolve(migrationsPath, "meta/_journal.json"), "utf8")).toContain(
      '"tag": "0002_remove_legacy_application_roles"',
    );
  });
});
