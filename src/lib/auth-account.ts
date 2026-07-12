export type Provider = "google" | "discord";

type Account = { providerId: string };

const errors = {
  account_not_linked: {
    title: "This sign-in method is not connected.",
    description:
      "Sign in with the method you used before, then connect this provider from your account.",
  },
  account_already_linked_to_different_user: {
    title: "This sign-in method belongs to another account.",
    description: "Sign in with that account to continue.",
  },
} as const;

const fallback = {
  title: "We could not sign you in.",
  description: "Try again or use another sign-in method.",
};

export function authErrorDetails(error: string | null) {
  return error !== null && Object.hasOwn(errors, error)
    ? errors[error as keyof typeof errors]
    : fallback;
}

export function hasProvider(accounts: readonly Account[], provider: string): boolean {
  return accounts.some((account) => account.providerId === provider);
}

export function isSyntheticEmail(email: string): boolean {
  return email.endsWith(".oauth.invalid");
}
