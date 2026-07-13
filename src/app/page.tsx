import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { parseServerEnv } from "@/lib/env";
import { LANDING_AUTH_HREF } from "@/lib/landing";
import { createAuthContext } from "@/server/auth-context";
import { resolveRequestTenant } from "@/server/request-context";

const faqs = [
  {
    question: "What do I get?",
    answer:
      "A single subscription plan for your own branded website: a focused home for your business online.",
  },
  {
    question: "Do my visitors need TSKC accounts?",
    answer:
      "No. TSKC is built around your business having a direct web presence. Visitor account features are not part of this product model.",
  },
  {
    question: "Can I start with one plan?",
    answer:
      "Yes. The first release has one straightforward monthly plan, so every seller gets the same clear starting point.",
  },
];

const sectionClass =
  "mx-auto w-[min(1200px,calc(100%-40px))] md:w-[min(1200px,calc(100%-clamp(40px,8vw,96px)))]";
const eyebrowClass = "text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase";

function StorefrontPlaceholder() {
  return (
    <main id="main-content" className="grid min-h-screen place-items-center px-6 py-24">
      <div className="w-full max-w-xl text-center">
        <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          TSKC branded website
        </p>
        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.06em]">
          Branded website coming soon.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          This seller&apos;s website is being prepared.
        </p>
      </div>
    </main>
  );
}

function SuspendedStorefront() {
  return (
    <main id="main-content" className="grid min-h-screen place-items-center px-6 py-24">
      <div className="w-full max-w-lg text-center">
        <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Website unavailable
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em]">
          This website is temporarily offline.
        </h1>
        <p className="mt-5 leading-relaxed text-muted-foreground">Please check back later.</p>
      </div>
    </main>
  );
}

export default async function Home() {
  const requestHeaders = await headers();
  const tenant = await resolveRequestTenant(
    requestHeaders,
    parseServerEnv(process.env).platformDomain,
  );

  if (tenant.kind === "unknown") {
    notFound();
  }

  if (tenant.kind === "storefront") {
    return <StorefrontPlaceholder />;
  }

  if (tenant.kind === "suspended") {
    return <SuspendedStorefront />;
  }

  const authContext = await createAuthContext(requestHeaders);

  return (
    <main id="main-content" className="overflow-clip">
      <SiteHeader user={authContext.user} />

      <section
        className={`${sectionClass} pb-24 pt-20 sm:pb-36 sm:pt-32`}
        id="top"
        aria-labelledby="hero-title"
      >
        <h1
          id="hero-title"
          className="max-w-4xl text-[clamp(3.25rem,9vw,7.5rem)] font-semibold leading-[0.88] tracking-[-0.085em]"
        >
          Your brand
          <br />
          deserves its own site.
        </h1>
        <div className="mt-12 grid gap-8 border-t border-border pt-7 md:mt-20 md:grid-cols-[minmax(0,1fr)_auto] md:gap-16">
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            One simple plan: a branded website that gives your business a clear, professional place
            to live online.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link
              className={buttonVariants({ size: "lg", className: "h-11 rounded-full px-5" })}
              href={LANDING_AUTH_HREF}
            >
              Choose your plan
            </Link>
            <a
              className="min-h-11 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-ring"
              href="#website"
            >
              See what&apos;s included <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>

      <section
        className={`${sectionClass} border-t border-border py-24 sm:py-36`}
        id="website"
        aria-labelledby="website-title"
      >
        <div className="mb-12 grid gap-5 md:mb-16 md:grid-cols-2">
          <p className={eyebrowClass}>One account. One branded website.</p>
          <h2
            id="website-title"
            className="text-4xl font-semibold leading-[0.94] tracking-[-0.065em] sm:text-6xl"
          >
            A direct home for
            <br />
            your business.
          </h2>
        </div>
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-2">
          <article className="min-h-64 bg-background p-7 sm:p-9">
            <p className="text-sm text-muted-foreground">01</p>
            <h3 className="mt-12 text-2xl font-semibold tracking-[-0.045em]">
              Make it recognisably yours
            </h3>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Bring together your business name, visual identity, and essential information in one
              calm, professional destination.
            </p>
          </article>
          <article className="min-h-64 bg-background p-7 sm:p-9">
            <p className="text-sm text-muted-foreground">02</p>
            <h3 className="mt-12 text-2xl font-semibold tracking-[-0.045em]">
              Keep the message clear
            </h3>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Give visitors a focused place to understand who you are, what you offer, and how to
              reach you.
            </p>
          </article>
          <div
            className="min-h-80 bg-[#d9d4cc] p-4 text-[#151515] lg:col-span-2"
            aria-label="Example branded business website"
          >
            <div className="flex h-full min-h-72 flex-col border border-black/20 bg-[#f4f1eb] p-5 sm:p-8">
              <div className="flex gap-1.5">
                <span className="size-2 rounded-full bg-black/25" />
                <span className="size-2 rounded-full bg-black/25" />
                <span className="size-2 rounded-full bg-black/25" />
              </div>
              <p className="mt-8 text-xs font-bold tracking-[0.13em]">SORA STUDIO</p>
              <p className="mt-auto text-[clamp(2rem,6vw,4.5rem)] leading-[0.92] tracking-[-0.075em]">
                A considered
                <br />
                home for work
                <br />
                with character.
              </p>
              <div className="mt-8 flex gap-5 text-xs">
                <span>About</span>
                <span>Work</span>
                <span>Contact</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className={`${sectionClass} border-t border-border py-24 sm:py-36`}
        id="how-it-works"
        aria-labelledby="steps-title"
      >
        <div className="mb-12 grid gap-5 md:mb-16 md:grid-cols-2">
          <p className={eyebrowClass}>From plan to presence</p>
          <h2
            id="steps-title"
            className="text-4xl font-semibold leading-[0.94] tracking-[-0.065em] sm:text-6xl"
          >
            A short path to
            <br />
            your own corner
            <br />
            of the web.
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            [
              "Choose the plan",
              "One clear\nstarting point",
              "Create an account and subscribe to the single website plan.",
              "bg-[image:var(--gradient-violet)] text-[#1d1028]",
            ],
            [
              "Shape the site",
              "Put your brand\nat the centre",
              "Set up the essentials that make the website unmistakably yours.",
              "bg-card",
            ],
            [
              "Publish",
              "Give people\na way in",
              "Share a focused website that represents your business directly.",
              "bg-card",
            ],
            [
              "Manage",
              "Keep your home\nup to date",
              "Use one seller account to manage the subscription and your website.",
              "bg-[image:var(--gradient-orange)] text-[#32130e]",
            ],
          ].map(([kicker, title, description, theme]) => (
            <Card
              className={`min-h-72 gap-0 border-0 py-0 ring-1 ring-foreground/10 ${theme}`}
              key={kicker}
            >
              <CardContent className="flex h-full min-h-72 flex-col p-7 sm:p-9">
                <p className="text-xs font-semibold tracking-[0.08em] uppercase opacity-70">
                  {kicker}
                </p>
                <h3 className="mt-auto whitespace-pre-line text-3xl font-semibold leading-[0.95] tracking-[-0.06em]">
                  {title}
                </h3>
                <p className="mt-4 max-w-sm text-sm leading-relaxed opacity-75">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section
        className={`${sectionClass} grid gap-10 border-t border-border py-24 sm:py-36 lg:grid-cols-[1fr_minmax(20rem,0.8fr)] lg:gap-20`}
        id="pricing"
        aria-labelledby="pricing-title"
      >
        <div>
          <p className={eyebrowClass}>One plan. A clear starting point.</p>
          <h2
            id="pricing-title"
            className="mt-5 text-4xl font-semibold leading-[0.94] tracking-[-0.065em] sm:text-6xl"
          >
            Everything starts
            <br />
            with your website.
          </h2>
          <p className="mt-7 max-w-lg text-base leading-relaxed text-muted-foreground">
            One straightforward plan gives business owners a clear starting point for a direct web
            presence.
          </p>
        </div>
        <Card className="gap-0 border-0 bg-card py-0 ring-1 ring-foreground/10">
          <CardContent className="p-7 sm:p-9">
            <p className={eyebrowClass}>Branded website plan</p>
            <p className="mt-10 text-sm text-muted-foreground">
              <span className="text-4xl font-semibold tracking-[-0.06em] text-foreground">
                THB 149
              </span>{" "}
              / month
            </p>
            <ul className="mt-10 space-y-3 border-y border-border py-6 text-sm text-muted-foreground">
              <li>One branded business website</li>
              <li>One seller account to manage it</li>
              <li>Plan and website setup flow</li>
              <li>Direct, focused public presence</li>
            </ul>
            <Link
              className={buttonVariants({ size: "lg", className: "mt-8 h-11 w-full rounded-full" })}
              href={LANDING_AUTH_HREF}
            >
              Get your website
            </Link>
          </CardContent>
        </Card>
      </section>

      <section
        className={`${sectionClass} border-t border-border py-24 sm:py-36`}
        id="faq"
        aria-labelledby="faq-title"
      >
        <div className="mb-12 grid gap-5 md:mb-16 md:grid-cols-2">
          <p className={eyebrowClass}>Frequently asked questions</p>
          <h2
            id="faq-title"
            className="text-4xl font-semibold leading-[0.94] tracking-[-0.065em] sm:text-6xl"
          >
            A simple product
            <br />
            should have
            <br />
            straight answers.
          </h2>
        </div>
        <Accordion className="border-t border-border" multiple>
          {faqs.map((faq) => (
            <AccordionItem value={faq.question} key={faq.question} className="border-border">
              <AccordionTrigger className="min-h-16 py-5 text-base hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="max-w-2xl pb-6 leading-relaxed text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section
        className="border-y border-border bg-card px-5 py-24 text-center sm:px-10 sm:py-36"
        aria-labelledby="closing-title"
      >
        <p className={eyebrowClass}>Your next address online</p>
        <h2
          id="closing-title"
          className="mx-auto mt-5 max-w-3xl text-4xl font-semibold leading-[0.94] tracking-[-0.065em] sm:text-6xl"
        >
          Build the website
          <br />
          your brand needs.
        </h2>
        <Link
          className={buttonVariants({ size: "lg", className: "mt-8 h-11 rounded-full px-6" })}
          href={LANDING_AUTH_HREF}
        >
          Choose your plan
        </Link>
      </section>

      <footer
        className={`${sectionClass} flex flex-col gap-5 py-10 sm:flex-row sm:items-center sm:justify-between`}
      >
        <Link
          className="w-max font-['Arial_Narrow','Helvetica_Neue',Arial,sans-serif] text-xl font-bold tracking-[-1px]"
          href="#top"
        >
          TSKC
        </Link>
        <nav
          className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground"
          aria-label="Footer navigation"
        >
          <a className="hover:text-ring" href="#website">
            Website
          </a>
          <a className="hover:text-ring" href="#pricing">
            Plan
          </a>
        </nav>
      </footer>
    </main>
  );
}
