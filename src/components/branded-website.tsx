import Image from "next/image";

import { buttonVariants } from "@/components/ui/button";
import type { WebsitePublishedContent } from "@/lib/websites";

export function BrandedWebsite({
  content,
  logoUrl,
  heroUrl,
}: {
  content: WebsitePublishedContent;
  logoUrl?: string;
  heroUrl?: string;
}) {
  const hasContact = content.email || content.phone || content.address;

  return (
    <main id="main-content" className="min-h-screen px-5 py-8 sm:px-10 sm:py-12">
      <article className="mx-auto w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-card">
        {heroUrl && (
          <div className="relative aspect-[16/7] min-h-48 border-b border-border">
            <Image
              unoptimized
              fill
              priority
              sizes="(max-width: 896px) 100vw, 896px"
              className="object-cover"
              src={heroUrl}
              alt=""
            />
          </div>
        )}

        <div className="p-6 sm:p-10 lg:p-14">
          <div
            className="h-1 w-16"
            style={{ backgroundColor: content.accentColor ?? "var(--ring)" }}
            aria-hidden="true"
          />

          <header className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center">
            {logoUrl && (
              <Image
                unoptimized
                width={88}
                height={88}
                className="size-22 shrink-0 rounded-lg border border-border object-cover"
                src={logoUrl}
                alt={`${content.businessName} logo`}
              />
            )}
            <div>
              {content.tagline && (
                <p className="mb-3 text-sm font-medium leading-relaxed text-muted-foreground">
                  {content.tagline}
                </p>
              )}
              <h1 className="text-[clamp(2.75rem,9vw,5.5rem)] font-semibold leading-[0.9] tracking-[-0.07em]">
                {content.businessName}
              </h1>
            </div>
          </header>

          <section className="mt-12 border-t border-border pt-8" aria-labelledby="about-title">
            <h2 id="about-title" className="text-xs font-semibold tracking-[0.08em] uppercase">
              About
            </h2>
            <p className="mt-5 max-w-2xl whitespace-pre-line text-base leading-relaxed text-muted-foreground sm:text-lg">
              {content.description}
            </p>
          </section>

          {hasContact && (
            <section className="mt-10 border-t border-border pt-8" aria-labelledby="contact-title">
              <h2 id="contact-title" className="text-xs font-semibold tracking-[0.08em] uppercase">
                Contact
              </h2>
              <address className="mt-5 flex flex-col items-start gap-3 text-sm leading-relaxed not-italic text-muted-foreground sm:text-base">
                {content.email && (
                  <a
                    className="rounded-sm underline decoration-border underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                    href={`mailto:${content.email}`}
                  >
                    {content.email}
                  </a>
                )}
                {content.phone && (
                  <a
                    className="rounded-sm underline decoration-border underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                    href={`tel:${content.phone.replace(/[^\d+]/g, "")}`}
                  >
                    {content.phone}
                  </a>
                )}
                {content.address && <p className="whitespace-pre-line">{content.address}</p>}
              </address>
            </section>
          )}

          {content.primaryLink && (
            <a
              className={buttonVariants({ className: "mt-10 rounded-full" })}
              href={content.primaryLink}
            >
              Learn more <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      </article>
    </main>
  );
}
