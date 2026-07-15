import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: (props: Record<string, unknown>) => createElement("a", props),
}));

import GlobalError from "@/app/global-error";
import NotFound from "@/app/not-found";
import RootError from "@/app/error";

const fakeError = Object.assign(new Error("test"), { digest: "test-digest" });
const fakeReset = () => {};

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
  });
});
