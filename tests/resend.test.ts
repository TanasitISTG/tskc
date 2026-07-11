import { describe, expect, it, vi } from "vitest";

import { sendPasswordResetEmail } from "@/lib/resend";

describe("sendPasswordResetEmail", () => {
  const config = {
    apiKey: "re_test",
    from: "TSKC <noreply@tskc.example>",
  };

  it("does not send reset links to synthetic OAuth emails", async () => {
    const fetcher = vi.fn();

    await sendPasswordResetEmail(
      { to: "123@discord.oauth.invalid", url: "https://tskc.example/reset" },
      config,
      fetcher,
    );

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("sends a reset link through Resend", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));

    await sendPasswordResetEmail(
      { to: "seller@example.com", url: "https://tskc.example/reset" },
      config,
      fetcher,
    );

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer re_test" }),
      }),
    );
  });
});
