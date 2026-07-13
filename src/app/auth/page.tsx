import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthPanel, SessionLoading } from "@/components/auth-panel";
import { safeReturnTo } from "@/lib/auth-guards";
import { createAuthContext } from "@/server/auth-context";

type AuthPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const [params, authContext] = await Promise.all([
    searchParams,
    createAuthContext(await headers()),
  ]);
  const recovery =
    typeof params.token === "string" || params.mode === "forgot" || params.mode === "reset";

  if (authContext.identity !== null && !recovery) {
    const next = safeReturnTo(typeof params.next === "string" ? params.next : undefined);
    redirect(next === "/" ? "/account" : next);
  }

  return (
    <Suspense fallback={<SessionLoading />}>
      <AuthPanel />
    </Suspense>
  );
}
