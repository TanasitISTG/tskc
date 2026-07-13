import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function BillingLoading() {
  return (
    <>
      <header
        className="mx-auto grid min-h-21 w-[min(1200px,calc(100%-40px))] grid-cols-[1fr_auto] items-center gap-4 md:w-[min(1200px,calc(100%-clamp(40px,8vw,96px)))]"
        aria-hidden="true"
      >
        <Skeleton className="h-6 w-12" />
        <Skeleton className="size-11 rounded-full" />
      </header>
      <main
        id="main-content"
        className="min-h-[calc(100vh-5.25rem)] bg-background px-5 py-12 sm:py-20"
        aria-busy="true"
        aria-label="Loading billing status"
      >
        <div className="mx-auto w-full max-w-4xl">
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="mt-5 h-12 w-72 max-w-full animate-pulse rounded bg-muted" />
          <Card className="mt-10">
            <CardContent className="space-y-4">
              <div className="h-5 w-36 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
