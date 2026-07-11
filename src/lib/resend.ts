import "server-only";

type ResendConfig = {
  apiKey: string;
  from: string;
};

type ResetEmail = {
  to: string;
  url: string;
};

export async function sendPasswordResetEmail(
  email: ResetEmail,
  config: ResendConfig,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  if (email.to.endsWith(".oauth.invalid")) {
    return;
  }

  const response = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: [email.to],
      subject: "Reset your TSKC password",
      text: `Reset your password: ${email.url}`,
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to send password reset email");
  }
}
