"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

import { selectRole } from "@/app/auth/actions";
import { authClient } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up" | "forgot" | "reset";
type Provider = "google" | "facebook" | "discord";

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
  const requestedMode = searchParams.get("mode");
  const intent = searchParams.get("intent") === "buyer" ? "buyer" : "seller";
  const next = internalPath(searchParams.get("next"));
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [mode, setMode] = useState<Mode>(
    token ? "reset" : requestedMode === "forgot" ? "forgot" : "sign-in",
  );
  const [role, setRole] = useState(intent);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function finishAuthentication() {
    const result = await selectRole(role);

    if (result.error) {
      setMessage(result.error);
      return;
    }

    router.replace(next);
    router.refresh();
  }

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const result =
        mode === "sign-up"
          ? await authClient.signUp.email({
              name: username,
              username,
              email,
              password,
              callbackURL: `${window.location.origin}/auth?mode=complete&intent=${role}&next=${encodeURIComponent(next)}`,
            })
          : await authClient.signIn.username({ username, password });

      if (result.error) {
        setMessage(result.error.message ?? "Something went wrong. Try again.");
        return;
      }

      await finishAuthentication();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function signInWith(provider: Provider) {
    setBusy(true);
    setMessage("");

    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: `${window.location.origin}/auth?mode=complete&intent=${role}&next=${encodeURIComponent(next)}`,
      });

      if (result.error) {
        setMessage(result.error.message ?? "Something went wrong. Try again.");
      }
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });

      setMessage(
        result.error
          ? "If that account can reset a password, we sent a link."
          : "If that account can reset a password, we sent a link.",
      );
    } catch {
      setMessage("If that account can reset a password, we sent a link.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (token === null) {
      setMessage("This reset link is missing its token.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const result = await authClient.resetPassword({ newPassword: password, token });

      if (result.error) {
        setMessage(result.error.message ?? "Something went wrong. Try again.");
        return;
      }

      setMessage("Your password has been reset. You can now sign in.");
      setMode("sign-in");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    await authClient.signOut();
    router.replace("/");
    router.refresh();
  }

  if (sessionPending) {
    return <main className="auth-page" aria-busy="true" />;
  }

  if (session) {
    return (
      <main className="auth-page">
        <section className="auth-card" aria-labelledby="auth-title">
          <p className="eyebrow">TSKC account</p>
          <h1 id="auth-title">You&apos;re signed in.</h1>
          <p className="auth-copy">{requestedMode === "complete" ? "Choose where to continue and we&apos;ll set up your account access." : "Your account is ready whenever you are."}</p>
          <div className="auth-actions">
            {requestedMode === "complete" ? <button className="button button-primary" type="button" disabled={busy} onClick={() => void finishAuthentication()}>Continue as {role}</button> : <Link className="button button-primary" href={next}>Continue</Link>}
            <button className="button button-secondary" type="button" disabled={busy} onClick={signOut}>
              Sign out
            </button>
          </div>
        </section>
      </main>
    );
  }

  const isCredentialsMode = mode === "sign-in" || mode === "sign-up";
  const title = mode === "sign-up" ? "Start your account." : mode === "sign-in" ? "Welcome back." : mode === "forgot" ? "Reset your password." : "Choose a new password.";

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">TSKC account</p>
        <h1 id="auth-title">{title}</h1>
        {isCredentialsMode && (
          <div className="auth-tabs" role="tablist" aria-label="Account mode">
            <button className={mode === "sign-in" ? "is-selected" : ""} type="button" role="tab" aria-selected={mode === "sign-in"} onClick={() => setMode("sign-in")}>Sign in</button>
            <button className={mode === "sign-up" ? "is-selected" : ""} type="button" role="tab" aria-selected={mode === "sign-up"} onClick={() => setMode("sign-up")}>Create account</button>
          </div>
        )}

        {mode === "forgot" && (
          <form className="auth-form" onSubmit={requestReset}>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
            <button className="button button-primary" disabled={busy}>Send reset link</button>
            <button className="auth-link" type="button" onClick={() => setMode("sign-in")}>Back to sign in</button>
          </form>
        )}

        {mode === "reset" && (
          <form className="auth-form" onSubmit={resetPassword}>
            <label htmlFor="password">New password</label>
            <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="new-password" />
            <button className="button button-primary" disabled={busy}>Reset password</button>
          </form>
        )}

        {isCredentialsMode && (
          <>
            <form className="auth-form" onSubmit={submitCredentials}>
              <fieldset className="auth-roles">
                <legend>I&apos;m here to</legend>
                <label><input type="radio" name="role" value="seller" checked={role === "seller"} onChange={() => setRole("seller")} /> Sell digital goods</label>
                <label><input type="radio" name="role" value="buyer" checked={role === "buyer"} onChange={() => setRole("buyer")} /> Buy from a store</label>
              </fieldset>
              <label htmlFor="username">Username</label>
              <input id="username" value={username} onChange={(event) => setUsername(event.target.value)} required autoComplete="username" />
              {mode === "sign-up" && <><label htmlFor="email">Email for password reset</label><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></>}
              <label htmlFor="password">Password</label>
              <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} />
              <button className="button button-primary" disabled={busy}>{mode === "sign-up" ? "Create account" : "Sign in"}</button>
              {mode === "sign-in" && <button className="auth-link" type="button" onClick={() => setMode("forgot")}>Forgot your password?</button>}
            </form>
            <div className="auth-divider">or continue with</div>
            <div className="auth-socials">
              {(["google", "facebook", "discord"] as const).map((provider) => <button className="button button-secondary" type="button" key={provider} disabled={busy} onClick={() => signInWith(provider)}>Continue with {provider[0].toUpperCase() + provider.slice(1)}</button>)}
            </div>
          </>
        )}

        {message && <p className="auth-message" role="status">{message}</p>}
      </section>
    </main>
  );
}
