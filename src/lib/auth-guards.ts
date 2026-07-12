import "server-only";

export type AuthIdentity = {
  userId: string;
};

export class AuthError extends Error {
  constructor(public readonly code: "UNAUTHORIZED") {
    super(code);
  }
}

export function safeReturnTo(next: string | null | undefined): string {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function requireSession(identity: AuthIdentity | null): AuthIdentity {
  if (identity === null) {
    throw new AuthError("UNAUTHORIZED");
  }

  return identity;
}
