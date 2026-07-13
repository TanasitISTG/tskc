"use client";

import Link from "next/link";
import {
  CreditCardIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  UserRoundIcon,
} from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import { LANDING_AUTH_HREF } from "@/lib/landing";

const navItems = [
  ["Your website", "#website"],
  ["How it works", "#how-it-works"],
  ["Plan", "#pricing"],
] as const;

type HeaderUser = {
  image?: string | null;
  name: string;
};

function AccountMenu({ user }: { user: HeaderUser }) {
  const [signOutState, setSignOutState] = useState<"idle" | "pending" | "error">("idle");
  const initial = user.name.trim().charAt(0).toUpperCase() || "U";

  async function signOut() {
    setSignOutState("pending");
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setSignOutState("error");
        return;
      }
      window.location.assign("/");
    } catch {
      setSignOutState("error");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={`Open account menu for ${user.name}`}
      >
        <Avatar size="lg">
          {user.image && <AvatarImage src={user.image} alt="" />}
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-2 text-sm text-foreground">
            {user.name}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="min-h-10 px-2" render={<Link href="/account" />}>
          <UserRoundIcon />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-10 px-2" render={<Link href="/setup/website" />}>
          <LayoutDashboardIcon />
          Website setup
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-10 px-2" render={<Link href="/billing" />}>
          <CreditCardIcon />
          Billing
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="min-h-10 px-2"
          variant="destructive"
          disabled={signOutState === "pending"}
          onClick={() => void signOut()}
        >
          <LogOutIcon />
          {signOutState === "pending"
            ? "Signing out..."
            : signOutState === "error"
              ? "Try signing out again"
              : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SiteHeader({
  user,
  variant = "marketing",
}: {
  user: HeaderUser | null;
  variant?: "app" | "marketing";
}) {
  const isApp = variant === "app";

  return (
    <header
      className={`mx-auto grid min-h-21 w-[min(1200px,calc(100%-40px))] grid-cols-[1fr_auto] items-center gap-4 md:w-[min(1200px,calc(100%-clamp(40px,8vw,96px)))] ${
        isApp ? "" : "md:grid-cols-[1fr_auto_1fr]"
      }`}
    >
      <Link
        className="w-max font-['Arial_Narrow','Helvetica_Neue',Arial,sans-serif] text-xl font-bold tracking-[-1px]"
        href={isApp ? "/" : "#top"}
        aria-label="TSKC home"
      >
        TSKC
      </Link>
      {!isApp && (
        <nav
          className="hidden items-center justify-center gap-6 text-sm text-muted-foreground md:flex"
          aria-label="Main navigation"
        >
          {navItems.map(([label, href]) => (
            <a className="transition-colors hover:text-ring" href={href} key={href}>
              {label}
            </a>
          ))}
        </nav>
      )}
      <div className={isApp ? "flex justify-end" : "hidden justify-end gap-2 md:flex"}>
        {user === null ? (
          <Link
            className={buttonVariants({ size: "lg", className: "h-11 rounded-full px-5" })}
            href={LANDING_AUTH_HREF}
          >
            Get your website
          </Link>
        ) : (
          <AccountMenu user={user} />
        )}
      </div>
      {!isApp && (
        <div className="flex items-center justify-end gap-2 md:hidden">
          {user !== null && <AccountMenu user={user} />}
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-lg"
                  className="size-11 rounded-full"
                  aria-label="Open navigation menu"
                />
              }
            >
              <MenuIcon />
            </SheetTrigger>
            <SheetContent className="w-[min(22rem,88vw)] border-border bg-popover p-0">
              <SheetHeader className="pt-8">
                <SheetTitle>TSKC</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col px-4 pb-8" aria-label="Mobile navigation">
                {navItems.map(([label, href]) => (
                  <a
                    className="min-h-11 border-b border-border py-3 text-base font-medium"
                    href={href}
                    key={href}
                  >
                    {label}
                  </a>
                ))}
                {user === null && (
                  <Link
                    className={buttonVariants({
                      size: "lg",
                      className: "mt-5 h-11 rounded-full",
                    })}
                    href={LANDING_AUTH_HREF}
                  >
                    Get your website
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </header>
  );
}
