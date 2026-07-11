import "server-only";

import { eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { userRole } from "@/db/schema";
import type { AppRole } from "@/lib/auth-guards";

export async function getRoles(userId: string): Promise<AppRole[]> {
  const rows = await getDatabase()
    .select({ role: userRole.role })
    .from(userRole)
    .where(eq(userRole.userId, userId));

  return rows.map((row) => row.role);
}

export async function grantRole(userId: string, role: AppRole): Promise<void> {
  await getDatabase()
    .insert(userRole)
    .values({ userId, role })
    .onConflictDoNothing();
}
