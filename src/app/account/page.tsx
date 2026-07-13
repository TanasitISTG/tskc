import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AccountPanel } from "@/components/auth-panel";
import { SiteHeader } from "@/components/site-header";
import { createAuthContext } from "@/server/auth-context";

export default async function AccountPage() {
  const authContext = await createAuthContext(await headers());

  if (authContext.identity === null) redirect("/auth?next=/account");

  return (
    <>
      <SiteHeader variant="app" user={authContext.user} />
      <AccountPanel userEmail={authContext.accountEmail} />
    </>
  );
}
