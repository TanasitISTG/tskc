import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { session } from "@/db/schema";

describe("auth schema", () => {
  it("allows a user to have multiple sessions", () => {
    const userIndex = getTableConfig(session).indexes.find(
      (index) => index.config.name === "session_user_id_idx",
    );

    expect(userIndex?.config.unique).toBe(false);
  });
});
