"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hasProvider, isSyntheticEmail, type Provider } from "@/lib/auth-account";
import { authClient } from "@/lib/auth-client";
import { FIRST_INCOMPLETE_STEP } from "@/lib/landing";

type Mode = "sign-in" | "sign-up" | "forgot" | "reset";
type PendingAction = Mode | Provider | "sign-out";
type Message = { text: string; tone: "error" | "success" };

function ProviderIcon({ provider }: { provider: Provider }) {
  if (provider === "google") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M21.35 12.27c0-.75-.07-1.47-.2-2.16H12v4.09h5.22a4.46 4.46 0 0 1-1.93 2.93v2.65h3.41c2-1.84 3.16-4.56 3.16-7.51Z"
        />
        <path
          fill="#34A853"
          d="M12 21.72c2.7 0 4.97-.9 6.63-2.44l-3.41-2.65c-.94.63-2.15 1-3.22 1-2.48 0-4.58-1.68-5.33-3.93H3.15v2.73A10 10 0 0 0 12 21.72Z"
        />
        <path
          fill="#FBBC05"
          d="M6.67 13.7a6.02 6.02 0 0 1 0-3.4V7.57H3.15a10 10 0 0 0 0 8.86l3.52-2.73Z"
        />
        <path
          fill="#EA4335"
          d="M12 6.37c1.46 0 2.76.5 3.79 1.48l2.84-2.84C16.96 3.46 14.7 2.28 12 2.28a10 10 0 0 0-8.85 5.29l3.52 2.73C7.42 8.05 9.52 6.37 12 6.37Z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.3 4.37A19.8 19.8 0 0 0 15.4 3l-.6 1.22a18.2 18.2 0 0 0-5.6 0L8.6 3c-1.7.3-3.35.76-4.9 1.37C.6 9.04-.25 13.6.17 18.1a19.6 19.6 0 0 0 6 3.03l1.45-1.98a12.6 12.6 0 0 1-2.28-1.08l.55-.43c4.4 2.06 9.43 2.06 13.78 0l.55.43c-.73.43-1.49.79-2.28 1.08l1.45 1.98a19.6 19.6 0 0 0 6-3.03c.5-5.22-.85-9.74-4.99-13.73ZM8.03 15.37c-1.35 0-2.46-1.23-2.46-2.74s1.09-2.74 2.46-2.74 2.48 1.24 2.46 2.74c0 1.51-1.1 2.74-2.46 2.74Zm7.94 0c-1.35 0-2.46-1.23-2.46-2.74s1.09-2.74 2.46-2.74 2.48 1.24 2.46 2.74c0 1.51-1.1 2.74-2.46 2.74Z"
      />
    </svg>
  );
}

function internalPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : FIRST_INCOMPLETE_STEP;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}

function LoadingLabel({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Spinner className="size-4" />
      {children}
    </>
  );
}

function AuthMessage({ message }: { message: Message | null }) {
  if (!message) return null;
  return (
    <Alert
      variant={message.tone === "error" ? "destructive" : "default"}
      role={message.tone === "error" ? "alert" : "status"}
      className={message.tone === "success" ? "border-ring/40 bg-ring/10 text-foreground" : ""}
    >
      <AlertDescription className={message.tone === "success" ? "text-foreground" : ""}>
        {message.text}
      </AlertDescription>
    </Alert>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={<main id="main-content" className="min-h-screen bg-background" aria-busy="true" />}
    >
      <AuthPanel />
    </Suspense>
  );
}

function AuthPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const next = internalPath(searchParams.get("next"));
  const { data: session, isPending: sessionPending, refetch } = authClient.useSession();
  const [mode, setMode] = useState<Mode>(
    token ? "reset" : searchParams.get("mode") === "forgot" ? "forgot" : "sign-in",
  );
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [accounts, setAccounts] = useState<Array<{ providerId: string }>>([]);
  const [accountsStatus, setAccountsStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const busy = pendingAction !== null;
  const linked = searchParams.get("linked");
  const linkedProvider: Provider | null =
    linked === "google" || linked === "discord" ? linked : null;

  useEffect(() => {
    if (!session) {
      setAccountsStatus("idle");
      return;
    }

    let cancelled = false;
    setAccountsStatus("loading");
    void authClient
      .listAccounts()
      .then((result) => {
        if (cancelled) return;
        if (result.error || result.data === null) {
          setAccountsStatus("error");
          return;
        }
        setAccounts(result.data);
        setAccountsStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setAccountsStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

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
        setMessage({
          text: result.error.message ?? "Something went wrong. Try again.",
          tone: "error",
        });
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
        callbackURL: `${window.location.origin}${next}`,
      });
      if (result.error)
        setMessage({
          text: result.error.message ?? "Something went wrong. Try again.",
          tone: "error",
        });
    } catch (error) {
      setMessage({ text: errorMessage(error), tone: "error" });
    } finally {
      setPendingAction(null);
    }
  }

  async function linkProvider(provider: Provider) {
    setPendingAction(provider);
    setMessage(null);
    try {
      const result = await authClient.linkSocial({
        provider,
        callbackURL: `${window.location.origin}/auth?linked=${provider}`,
      });
      if (result.error)
        setMessage({
          text: "We could not connect this sign-in method. Try again.",
          tone: "error",
        });
    } catch {
      setMessage({ text: "We could not connect this sign-in method. Try again.", tone: "error" });
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
      setMessage({
        text: "If that account can reset a password, we sent a link.",
        tone: "success",
      });
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
        setMessage({
          text: result.error.message ?? "Something went wrong. Try again.",
          tone: "error",
        });
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
        setMessage({
          text: result.error.message ?? "Something went wrong. Try again.",
          tone: "error",
        });
        return;
      }
      await refetch();
      router.replace("/");
      router.refresh();
    } catch (error) {
      setMessage({ text: errorMessage(error), tone: "error" });
    } finally {
      setPendingAction(null);
    }
  }

  if (sessionPending)
    return <main id="main-content" className="min-h-screen bg-background" aria-busy="true" />;

  if (session && mode !== "forgot" && mode !== "reset") {
    return (
      <AuthFrame title="Your account is ready.">
        <p className="text-base leading-relaxed text-muted-foreground">
          You&apos;re signed in. The next step is choosing your website plan and making the site
          yours.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link
            className={buttonVariants({ size: "lg", className: "h-11 flex-1 rounded-full" })}
            href={next}
          >
            Continue
          </Link>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 flex-1 rounded-full"
            disabled={busy}
            onClick={signOut}
          >
            {pendingAction === "sign-out" ? (
              <LoadingLabel>Signing out...</LoadingLabel>
            ) : (
              "Sign out"
            )}
          </Button>
        </div>
        <Separator className="my-7" />
        <section aria-labelledby="sign-in-methods-title">
          <h2 id="sign-in-methods-title" className="text-xl font-semibold tracking-[-0.03em]">
            Sign-in methods
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Connect another method to sign in to this account.
          </p>
          {accountsStatus === "loading" && (
            <div
              className="mt-5 grid gap-3"
              role="status"
              aria-label="Loading sign-in methods"
              aria-busy="true"
            >
              <div className="flex min-h-11 items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
                <Skeleton className="h-4 w-24" aria-hidden="true" />
                <Skeleton className="h-9 w-20" aria-hidden="true" />
              </div>
              <div className="flex min-h-11 items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
                <Skeleton className="h-4 w-28" aria-hidden="true" />
                <Skeleton className="h-9 w-20" aria-hidden="true" />
              </div>
              <div className="flex min-h-11 items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
                <Skeleton className="h-4 w-20" aria-hidden="true" />
                <Skeleton className="h-9 w-24" aria-hidden="true" />
              </div>
            </div>
          )}
          {accountsStatus === "error" && (
            <Alert variant="destructive" className="mt-5" role="alert">
              <AlertDescription>
                We could not load your sign-in methods. Refresh and try again.
              </AlertDescription>
            </Alert>
          )}
          {accountsStatus === "ready" && (
            <div className="mt-5 grid gap-3">
              {(["google", "discord"] as const).map((provider) => {
                const connected = hasProvider(accounts, provider);
                const providerName = provider[0].toUpperCase() + provider.slice(1);
                return (
                  <div
                    className="flex min-h-11 items-center justify-between gap-4 rounded-lg border border-border px-4 py-3"
                    key={provider}
                  >
                    <span className="font-medium">{providerName}</span>
                    {connected ? (
                      <span className="text-sm text-muted-foreground">Connected</span>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => linkProvider(provider)}
                      >
                        {pendingAction === provider ? (
                          <LoadingLabel>Connecting...</LoadingLabel>
                        ) : (
                          "Connect"
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
              <div className="flex min-h-11 items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
                <span className="font-medium">Password</span>
                {hasProvider(accounts, "credential") ? (
                  <span className="text-sm text-muted-foreground">Configured</span>
                ) : isSyntheticEmail(session.user.email) ? (
                  <span className="text-right text-sm text-muted-foreground">
                    Email not available
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      setEmail(session.user.email);
                      setMode("forgot");
                    }}
                  >
                    Add password
                  </Button>
                )}
              </div>
            </div>
          )}
        </section>
        <div className="mt-5">
          {linkedProvider && (
            <AuthMessage
              message={{
                text: `${linkedProvider[0].toUpperCase() + linkedProvider.slice(1)} is connected.`,
                tone: "success",
              }}
            />
          )}
          <AuthMessage message={message} />
        </div>
      </AuthFrame>
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
    <AuthFrame title={title}>
      <AuthMessage message={message} />
      {mode === "forgot" && (
        <form className="mt-7" onSubmit={requestReset}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                className="h-11"
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </Field>
            <Button type="submit" size="lg" className="h-11 w-full rounded-full" disabled={busy}>
              {pendingAction === "forgot" ? (
                <LoadingLabel>Sending reset link...</LoadingLabel>
              ) : (
                "Send reset link"
              )}
            </Button>
            <Button
              type="button"
              variant="link"
              className="mx-auto min-h-11 text-muted-foreground"
              disabled={busy}
              onClick={() => setMode("sign-in")}
            >
              Back to sign in
            </Button>
          </FieldGroup>
        </form>
      )}
      {mode === "reset" && (
        <form className="mt-7" onSubmit={resetPassword}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="password">New password</FieldLabel>
              <Input
                className="h-11"
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </Field>
            <Button type="submit" size="lg" className="h-11 w-full rounded-full" disabled={busy}>
              {pendingAction === "reset" ? (
                <LoadingLabel>Resetting password...</LoadingLabel>
              ) : (
                "Reset password"
              )}
            </Button>
          </FieldGroup>
        </form>
      )}
      {isCredentialsMode && (
        <Tabs
          value={mode}
          onValueChange={(value: string) => setMode(value as "sign-in" | "sign-up")}
          className="mt-7"
        >
          <TabsList className="w-full">
            <TabsTrigger value="sign-in" disabled={busy}>
              Sign in
            </TabsTrigger>
            <TabsTrigger value="sign-up" disabled={busy}>
              Create account
            </TabsTrigger>
          </TabsList>
          <TabsContent value={mode} className="mt-7">
            <form onSubmit={submitCredentials}>
              <FieldGroup>
                <p className="text-base leading-relaxed text-muted-foreground">
                  One account is all you need to choose a plan and launch a branded website.
                </p>
                <Field>
                  <FieldLabel htmlFor="username">Username</FieldLabel>
                  <Input
                    className="h-11"
                    id="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                    autoComplete="username"
                  />
                </Field>
                {mode === "sign-up" && (
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      className="h-11"
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      autoComplete="email"
                    />
                  </Field>
                )}
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    className="h-11"
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={8}
                    autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                  />
                </Field>
                <Button
                  type="submit"
                  size="lg"
                  className="h-11 w-full rounded-full"
                  disabled={busy}
                >
                  {pendingAction === mode ? (
                    <LoadingLabel>
                      {mode === "sign-up" ? "Creating account..." : "Signing in..."}
                    </LoadingLabel>
                  ) : mode === "sign-up" ? (
                    "Create account"
                  ) : (
                    "Sign in"
                  )}
                </Button>
                {mode === "sign-in" && (
                  <Button
                    type="button"
                    variant="link"
                    className="mx-auto min-h-11 text-muted-foreground"
                    disabled={busy}
                    onClick={() => setMode("forgot")}
                  >
                    Forgot your password?
                  </Button>
                )}
              </FieldGroup>
            </form>
            <FieldSeparator className="my-7">or continue with</FieldSeparator>
            <div className="grid gap-3">
              {(["google", "discord"] as const).map((provider) => (
                <Button
                  variant="outline"
                  type="button"
                  size="lg"
                  className="h-11 w-full rounded-full"
                  key={provider}
                  disabled={busy}
                  onClick={() => signInWith(provider)}
                >
                  {pendingAction === provider ? (
                    <LoadingLabel>
                      Connecting to {provider[0].toUpperCase() + provider.slice(1)}...
                    </LoadingLabel>
                  ) : (
                    <>
                      <ProviderIcon provider={provider} />
                      Continue with {provider[0].toUpperCase() + provider.slice(1)}
                    </>
                  )}
                </Button>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </AuthFrame>
  );
}

function AuthFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-background px-5 py-10 sm:px-8"
    >
      <Card className="w-full max-w-xl gap-0 border-0 bg-card py-0 shadow-2xl ring-1 ring-foreground/10">
        <CardContent className="p-7 sm:p-10">
          <Link
            className="inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-ring"
            href="/"
          >
            ← Back
          </Link>
          <h1
            id="auth-title"
            className="mt-4 text-4xl font-semibold leading-[0.94] tracking-[-0.065em] sm:text-5xl"
          >
            {title}
          </h1>
          <Separator className="my-7" />
          {children}
        </CardContent>
      </Card>
    </main>
  );
}
