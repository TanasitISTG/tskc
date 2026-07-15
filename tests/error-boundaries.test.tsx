import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useEffect: (effect: () => void) => effect(),
  };
});

vi.mock("next/link", () => ({
  default: (props: Record<string, unknown>) => createElement("a", props),
}));

import GlobalError from "@/app/global-error";
import NotFound from "@/app/not-found";
import RootError from "@/app/error";
import BillingError from "@/app/billing/error";
import * as Sentry from "@sentry/nextjs";

const fakeError = Object.assign(new Error("test"), { digest: "test-digest" });
const fakeReset = () => {};

afterEach(() => {
  vi.clearAllMocks();
});

describe("NotFound", () => {
  it("renders an accessible 404 with a return link", () => {
    const markup = renderToStaticMarkup(createElement(NotFound));
    expect(markup).toContain('id="main-content"');
    expect(markup).toContain("<h1");
    expect(markup).toContain("404");
    expect(markup).toContain('href="/"');
    expect(markup).toContain("h-11");
  });
});

describe("RootError", () => {
  it("renders an accessible recovery surface with try-again and back actions", () => {
    const markup = renderToStaticMarkup(
      createElement(RootError, { error: fakeError, reset: fakeReset }),
    );
    expect(markup).toContain('id="main-content"');
    expect(markup).toContain("<h1");
    expect(markup).toContain("Try again");
    expect(markup).toContain("Back to TSKC");
    expect(markup).toContain("h-11");
    expect(vi.mocked(Sentry.captureException)).toHaveBeenCalledWith(fakeError);
  });
});

describe("BillingError", () => {
  it("reports the billing error before rendering recovery actions", () => {
    const markup = renderToStaticMarkup(
      createElement(BillingError, { error: fakeError, reset: fakeReset }),
    );
    expect(markup).toContain("Billing status could not be loaded");
    expect(vi.mocked(Sentry.captureException)).toHaveBeenCalledWith(fakeError);
  });
});

describe("GlobalError", () => {
  it("renders a complete html document with recovery actions", () => {
    const markup = renderToStaticMarkup(
      createElement(GlobalError, { error: fakeError, reset: fakeReset }),
    );
    expect(markup).toContain("<html");
    expect(markup).toContain("<body");
    expect(markup).toContain('id="main-content"');
    expect(markup).toContain("<h1");
    expect(markup).toContain("Try again");
    expect(markup).toContain("Back to TSKC");
    expect(markup).toContain("h-11");
    expect(vi.mocked(Sentry.captureException)).toHaveBeenCalledWith(fakeError);
  });
});
