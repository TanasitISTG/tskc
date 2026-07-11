import "server-only";

export const appRoles = ["buyer", "seller"] as const;
export type AppRole = (typeof appRoles)[number];

export type AuthIdentity = {
  userId: string;
  roles: readonly AppRole[];
};

export class AuthError extends Error {
  constructor(
    public readonly code: "UNAUTHORIZED" | "FORBIDDEN",
  ) {
    super(code);
  }
}

export function safeReturnTo(next: string | null | undefined): string {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function requireSession(
  identity: AuthIdentity | null,
): AuthIdentity {
  if (identity === null) {
    throw new AuthError("UNAUTHORIZED");
  }

  return identity;
}

export function requireRole(
  identity: AuthIdentity | null,
  role: AppRole,
): AuthIdentity {
  const session = requireSession(identity);

  if (!session.roles.includes(role)) {
    throw new AuthError("FORBIDDEN");
  }

  return session;
}
