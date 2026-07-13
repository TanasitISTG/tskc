import "server-only";

import { getAuth } from "@/lib/auth";
import type { AuthIdentity } from "@/lib/auth-guards";

type AuthUser = {
  image?: string | null;
  name: string;
};

export type AuthContext =
  | { accountEmail: null; identity: null; user: null }
  | { accountEmail: string; identity: AuthIdentity; user: AuthUser };

export async function createAuthContext(headers: Headers): Promise<AuthContext> {
  const session = await getAuth().api.getSession({ headers });

  if (session === null) {
    return { accountEmail: null, identity: null, user: null };
  }

  return {
    accountEmail: session.user.email,
    identity: {
      userId: session.user.id,
    },
    user: {
      image: session.user.image,
      name: session.user.name,
    },
  };
}
