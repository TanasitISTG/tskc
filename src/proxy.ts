import { NextResponse, type NextRequest } from "next/server";

function originFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function buildCsp(nonce: string): string {
  const r2Origin = originFromUrl(process.env.R2_PUBLIC_BASE_URL);
  const sentryOrigin = originFromUrl(process.env.SENTRY_DSN);

  const imgSources = ["'self'", r2Origin].filter(Boolean).join(" ");
  const connectSources = ["'self'", sentryOrigin].filter(Boolean).join(" ");

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSources}`,
    `connect-src ${connectSources}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID();
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("content-security-policy", csp);

  const responseHeaders = new Headers();
  responseHeaders.set("Content-Security-Policy", csp);
  responseHeaders.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  responseHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
  responseHeaders.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  responseHeaders.set("X-Frame-Options", "DENY");

  return NextResponse.next({
    request: { headers: requestHeaders },
    headers: responseHeaders,
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
