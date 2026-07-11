import "server-only";

import { getAuth } from "@/lib/auth";
import type { AuthIdentity } from "@/lib/auth-guards";
import { getRoles } from "@/server/roles";

export type AuthContext = {
  identity: AuthIdentity | null;
};

export async function createAuthContext(headers: Headers): Promise<AuthContext> {
  const session = await getAuth().api.getSession({ headers });

  if (session === null) {
    return { identity: null };
  }

  return {
    identity: {
      userId: session.user.id,
      roles: await getRoles(session.user.id),
    },
  };
}
