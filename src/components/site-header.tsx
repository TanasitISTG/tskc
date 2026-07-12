"use client";

import Link from "next/link";
import { MenuIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  ["Your website", "#website"],
  ["How it works", "#how-it-works"],
  ["Plan", "#pricing"],
] as const;

export function SiteHeader() {
  return (
    <header className="mx-auto grid min-h-21 w-[min(1200px,calc(100%-40px))] grid-cols-[1fr_auto] items-center gap-4 md:w-[min(1200px,calc(100%-clamp(40px,8vw,96px)))] md:grid-cols-[1fr_auto_1fr]">
      <Link className="w-max font-['Arial_Narrow','Helvetica_Neue',Arial,sans-serif] text-xl font-bold tracking-[-1px]" href="#top" aria-label="TSKC home">
        TSKC
      </Link>
      <nav className="hidden items-center justify-center gap-6 text-sm text-muted-foreground md:flex" aria-label="Main navigation">
        {navItems.map(([label, href]) => <a className="transition-colors hover:text-ring" href={href} key={href}>{label}</a>)}
      </nav>
      <div className="hidden justify-end gap-2 md:flex">
        <Link className={buttonVariants({ variant: "outline", size: "lg", className: "h-11 rounded-full px-4" })} href="/auth">Sign in</Link>
        <Link className={buttonVariants({ size: "lg", className: "h-11 rounded-full px-5" })} href="/auth">Get your website</Link>
      </div>
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" size="icon-lg" className="size-11 rounded-full" aria-label="Open navigation menu" />}>
            <MenuIcon />
          </SheetTrigger>
          <SheetContent className="w-[min(22rem,88vw)] border-border bg-popover p-0">
            <SheetHeader className="pt-8">
              <SheetTitle>TSKC</SheetTitle>
              <SheetDescription>Branded websites for independent businesses.</SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col px-4 pb-8" aria-label="Mobile navigation">
              {navItems.map(([label, href]) => <a className="min-h-11 border-b border-border py-3 text-base font-medium" href={href} key={href}>{label}</a>)}
              <Link className="mt-5 text-sm text-muted-foreground hover:text-ring" href="/auth">Sign in</Link>
              <Link className={buttonVariants({ size: "lg", className: "mt-4 h-11 rounded-full" })} href="/auth">Get your website</Link>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
