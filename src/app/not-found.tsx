import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main-content" className="grid min-h-screen place-items-center px-5 py-12">
      <div className="w-full max-w-lg text-center">
        <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          404
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.065em] sm:text-5xl">
          This page could not be found.
        </h1>
        <p className="mt-5 leading-relaxed text-muted-foreground">
          The page you were looking for doesn&apos;t exist or may have moved.
        </p>
        <Link
          className={`${buttonVariants({ size: "lg" })} mt-8 inline-flex h-11 rounded-full px-6`}
          href="/"
        >
          Back to TSKC
        </Link>
      </div>
    </main>
  );
}
