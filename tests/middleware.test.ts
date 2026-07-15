import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "@/proxy";

function createRequest(path = "/"): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`);
}

function getCsp(response: Response): string {
  const csp = response.headers.get("Content-Security-Policy");
  if (csp === null) throw new Error("Content-Security-Policy header missing");
  return csp;
}

describe("proxy security headers", () => {
  it("sets Content-Security-Policy with a per-request nonce", () => {
    const response = proxy(createRequest("/"));
    const csp = getCsp(response);
    expect(csp).toContain("nonce-");
    expect(csp).toContain("script-src 'self' 'nonce-");
  });

  it("sets style-src with unsafe-inline only", () => {
    const response = proxy(createRequest("/"));
    const csp = getCsp(response);
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    const scriptSrcDirective = csp.match(/script-src [^;]*/)?.[0];
    expect(scriptSrcDirective).toBeDefined();
    expect(scriptSrcDirective).not.toContain("unsafe-inline");
  });

  it("sets frame-ancestors to none", () => {
    const response = proxy(createRequest("/"));
    expect(getCsp(response)).toContain("frame-ancestors 'none'");
  });

  it("sets form-action to self", () => {
    const response = proxy(createRequest("/"));
    expect(getCsp(response)).toContain("form-action 'self'");
  });

  it("sets Strict-Transport-Security", () => {
    const response = proxy(createRequest("/"));
    expect(response.headers.get("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains; preload",
    );
  });

  it("sets X-Content-Type-Options", () => {
    const response = proxy(createRequest("/"));
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("sets Referrer-Policy", () => {
    const response = proxy(createRequest("/"));
    expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("sets X-Frame-Options", () => {
    const response = proxy(createRequest("/"));
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("sets Permissions-Policy", () => {
    const response = proxy(createRequest("/"));
    expect(response.headers.get("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=()",
    );
  });

  it("generates a unique nonce per request", () => {
    const csp1 = getCsp(proxy(createRequest("/")));
    const csp2 = getCsp(proxy(createRequest("/")));
    const nonce1 = csp1.match(/nonce-([A-Za-z0-9+/_-]+={0,2})/)?.[1];
    const nonce2 = csp2.match(/nonce-([A-Za-z0-9+/_-]+={0,2})/)?.[1];
    expect(nonce1).toBeDefined();
    expect(nonce2).toBeDefined();
    expect(nonce1).not.toBe(nonce2);
  });
});
