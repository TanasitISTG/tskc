"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";

import { authClient } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up" | "forgot" | "reset";
type Provider = "google" | "discord";
type PendingAction = Mode | Provider | "sign-out";
type Message = { text: string; tone: "error" | "success" };

function ProviderIcon({ provider }: { provider: Provider }) {
  if (provider === "google") {
    return (
      <svg className="social-provider-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path fill="#4285F4" d="M21.35 12.27c0-.75-.07-1.47-.2-2.16H12v4.09h5.22a4.46 4.46 0 0 1-1.93 2.93v2.65h3.41c2-1.84 3.16-4.56 3.16-7.51Z" />
        <path fill="#34A853" d="M12 21.72c2.7 0 4.97-.9 6.63-2.44l-3.41-2.65c-.94.63-2.15 1-3.22 1-2.48 0-4.58-1.68-5.33-3.93H3.15v2.73A10 10 0 0 0 12 21.72Z" />
        <path fill="#FBBC05" d="M6.67 13.7a6.02 6.02 0 0 1 0-3.4V7.57H3.15a10 10 0 0 0 0 8.86l3.52-2.73Z" />
        <path fill="#EA4335" d="M12 6.37c1.46 0 2.76.5 3.79 1.48l2.84-2.84C16.96 3.46 14.7 2.28 12 2.28a10 10 0 0 0-8.85 5.29l3.52 2.73C7.42 8.05 9.52 6.37 12 6.37Z" />
      </svg>
    );
  }

  return (
    <svg className="social-provider-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M20.3 4.37A19.8 19.8 0 0 0 15.4 3l-.6 1.22a18.2 18.2 0 0 0-5.6 0L8.6 3c-1.7.3-3.35.76-4.9 1.37C.6 9.04-.25 13.6.17 18.1a19.6 19.6 0 0 0 6 3.03l1.45-1.98a12.6 12.6 0 0 1-2.28-1.08l.55-.43c4.4 2.06 9.43 2.06 13.78 0l.55.43c-.73.43-1.49.79-2.28 1.08l1.45 1.98a19.6 19.6 0 0 0 6-3.03c.5-5.22-.85-9.74-4.99-13.73ZM8.03 15.37c-1.35 0-2.46-1.23-2.46-2.74s1.09-2.74 2.46-2.74 2.48 1.24 2.46 2.74c0 1.51-1.1 2.74-2.46 2.74Zm7.94 0c-1.35 0-2.46-1.23-2.46-2.74s1.09-2.74 2.46-2.74 2.48 1.24 2.46 2.74c0 1.51-1.1 2.74-2.46 2.74Z" />
    </svg>
  );
}

function internalPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}

export default function AuthPage() {
  return (
    <Suspense fallback={<main className="auth-page" aria-busy="true" />}>
      <AuthPanel />
    </Suspense>
  );
}

function AuthPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const next = internalPath(searchParams.get("next"));
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [mode, setMode] = useState<Mode>(
    token ? "reset" : searchParams.get("mode") === "forgot" ? "forgot" : "sign-in",
  );
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const busy = pendingAction !== null;

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction(mode);
    setMessage(null);

    try {
      const result =
        mode === "sign-up"
          ? await authClient.signUp.email({
              name: username,
              username,
              email,
              password,
              callbackURL: `${window.location.origin}/auth?next=${encodeURIComponent(next)}`,
            })
          : await authClient.signIn.username({ username, password });

      if (result.error) {
        setMessage({ text: result.error.message ?? "Something went wrong. Try again.", tone: "error" });
        return;
      }

      router.replace(next);
      router.refresh();
    } catch (error) {
      setMessage({ text: errorMessage(error), tone: "error" });
    } finally {
      setPendingAction(null);
    }
  }

  async function signInWith(provider: Provider) {
    setPendingAction(provider);
    setMessage(null);

    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: `${window.location.origin}/auth?next=${encodeURIComponent(next)}`,
      });

      if (result.error) {
        setMessage({ text: result.error.message ?? "Something went wrong. Try again.", tone: "error" });
      }
    } catch (error) {
      setMessage({ text: errorMessage(error), tone: "error" });
    } finally {
      setPendingAction(null);
    }
  }

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("forgot");
    setMessage(null);

    try {
      await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });
    } finally {
      setMessage({ text: "If that account can reset a password, we sent a link.", tone: "success" });
      setPendingAction(null);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (token === null) {
      setMessage({ text: "This reset link is missing its token.", tone: "error" });
      return;
    }

    setPendingAction("reset");
    setMessage(null);

    try {
      const result = await authClient.resetPassword({ newPassword: password, token });

      if (result.error) {
        setMessage({ text: result.error.message ?? "Something went wrong. Try again.", tone: "error" });
        return;
      }

      setMessage({ text: "Your password has been reset. You can now sign in.", tone: "success" });
      setMode("sign-in");
    } catch (error) {
      setMessage({ text: errorMessage(error), tone: "error" });
    } finally {
      setPendingAction(null);
    }
  }

  async function signOut() {
    setPendingAction("sign-out");

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setMessage({ text: result.error.message ?? "Something went wrong. Try again.", tone: "error" });
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      setMessage({ text: errorMessage(error), tone: "error" });
    } finally {
      setPendingAction(null);
    }
  }

  if (sessionPending) {
    return <main className="auth-page" aria-busy="true" />;
  }

  if (session) {
    return (
      <main className="auth-page">
        <section className="auth-card" aria-labelledby="auth-title">
          <Link className="auth-home-link" href="/">← Back to TSKC</Link>
          <p className="eyebrow">TSKC account</p>
          <h1 id="auth-title">Your account is ready.</h1>
          <p className="auth-copy">
            You&apos;re signed in. The next step is choosing your website plan and making the site yours.
          </p>
          <div className="auth-actions">
            <Link className="button button-primary" href={next}>
              Continue
            </Link>
            <button className="button button-secondary" type="button" disabled={busy} onClick={signOut}>
              {pendingAction === "sign-out" ? "Signing out…" : "Sign out"}
            </button>
          </div>
          {message && <p className={`auth-message auth-message-${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>{message.text}</p>}
        </section>
      </main>
    );
  }

  const isCredentialsMode = mode === "sign-in" || mode === "sign-up";
  const title =
    mode === "sign-up"
      ? "Start your website."
      : mode === "sign-in"
        ? "Welcome back."
        : mode === "forgot"
          ? "Reset your password."
          : "Choose a new password.";

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <Link className="auth-home-link" href="/">← Back to TSKC</Link>
        <p className="eyebrow">TSKC for independent businesses</p>
        <h1 id="auth-title">{title}</h1>
        {message && <p className={`auth-message auth-message-${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>{message.text}</p>}
        {isCredentialsMode && (
          <div className="auth-tabs" role="tablist" aria-label="Account mode">
            <button className={mode === "sign-in" ? "is-selected" : ""} type="button" role="tab" aria-selected={mode === "sign-in"} disabled={busy} onClick={() => setMode("sign-in")}>Sign in</button>
            <button className={mode === "sign-up" ? "is-selected" : ""} type="button" role="tab" aria-selected={mode === "sign-up"} disabled={busy} onClick={() => setMode("sign-up")}>Create account</button>
          </div>
        )}

        {mode === "forgot" && (
          <form className="auth-form" onSubmit={requestReset}>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
            <button className="button button-primary" disabled={busy}>{pendingAction === "forgot" ? "Sending reset link…" : "Send reset link"}</button>
            <button className="auth-link" type="button" disabled={busy} onClick={() => setMode("sign-in")}>Back to sign in</button>
          </form>
        )}

        {mode === "reset" && (
          <form className="auth-form" onSubmit={resetPassword}>
            <label htmlFor="password">New password</label>
            <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="new-password" />
            <button className="button button-primary" disabled={busy}>{pendingAction === "reset" ? "Resetting password…" : "Reset password"}</button>
          </form>
        )}

        {isCredentialsMode && (
          <>
            <form className="auth-form" onSubmit={submitCredentials}>
              <p className="auth-copy">One account is all you need to choose a plan and launch a branded website.</p>
              <label htmlFor="username">Username</label>
              <input id="username" value={username} onChange={(event) => setUsername(event.target.value)} required autoComplete="username" />
              {mode === "sign-up" && <><label htmlFor="email">Email for password reset</label><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></>}
              <label htmlFor="password">Password</label>
              <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} />
              <button className="button button-primary" disabled={busy}>{pendingAction === mode ? mode === "sign-up" ? "Creating account…" : "Signing in…" : mode === "sign-up" ? "Create account" : "Sign in"}</button>
              {mode === "sign-in" && <button className="auth-link" type="button" disabled={busy} onClick={() => setMode("forgot")}>Forgot your password?</button>}
            </form>
            <div className="auth-divider">or continue with</div>
            <div className="auth-socials">
              {(["google", "discord"] as const).map((provider) => <button className="button button-secondary social-provider-button" type="button" key={provider} disabled={busy} onClick={() => signInWith(provider)}>{pendingAction === provider ? `Connecting to ${provider[0].toUpperCase() + provider.slice(1)}…` : <><ProviderIcon provider={provider} />Continue with {provider[0].toUpperCase() + provider.slice(1)}</>}</button>)}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
