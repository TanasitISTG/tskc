"use server";

import { headers } from "next/headers";

import { getAuth } from "@/lib/auth";
import { isAppRole } from "@/lib/auth-guards";
import { grantRole } from "@/server/roles";

export async function selectRole(value: string) {
  if (!isAppRole(value)) {
    return { error: "Choose buyer or seller access." };
  }

  const session = await getAuth().api.getSession({ headers: await headers() });

  if (session === null) {
    return { error: "Sign in before choosing account access." };
  }

  await grantRole(session.user.id, value);
  return { error: null };
}
