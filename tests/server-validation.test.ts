import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const trpcSource = readFileSync(resolve(import.meta.dirname, "../src/server/trpc.ts"), "utf8");

describe("server input validation", () => {
  it("uses strict zod schemas for all protected mutation inputs", () => {
    const inputMatches = [...trpcSource.matchAll(/\.input\((\w+)\)/g)];
    expect(inputMatches.length).toBeGreaterThanOrEqual(2);

    for (const match of inputMatches) {
      const schemaName = match[1];
      const definitionStart = trpcSource.indexOf(`const ${schemaName}`);
      expect(definitionStart).toBeGreaterThan(-1);

      const schemaBlock = trpcSource.slice(definitionStart, definitionStart + 500);
      expect(schemaBlock).toContain(".strict()");
    }
  });

  it("does not accept client-supplied ownership fields in website mutations", () => {
    expect(trpcSource).not.toMatch(/\.input\([^)]*sellerId/);
    expect(trpcSource).not.toMatch(/\.input\([^)]*shopId/);
    expect(trpcSource).not.toMatch(/\.input\([^)]*owner/);
  });
});
