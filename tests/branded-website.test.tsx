import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BrandedWebsite } from "@/components/branded-website";

describe("BrandedWebsite", () => {
  it("renders the complete published profile without leaking storage keys or unsafe markup", () => {
    const markup = renderToStaticMarkup(
      <BrandedWebsite
        content={{
          businessName: 'Sora & Sons <script>alert("x")</script>',
          description: "Independent design work for thoughtful businesses.",
          tagline: "Quiet ideas, clearly made.",
          email: "hello@sora.example",
          phone: "+66 (0) 81-234-5678",
          address: "Bangkok, Thailand",
          accentColor: "#E06B3C",
          primaryLink: "https://sora.example/about",
          logo: { key: "private/logo-key.png", contentType: "image/png", size: 128 },
          hero: { key: "private/hero-key.webp", contentType: "image/webp", size: 256 },
        }}
        logoUrl="https://cdn.example/public/logo.png"
        heroUrl="https://cdn.example/public/hero.webp"
      />,
    );

    expect(markup).toContain("Sora &amp; Sons &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(markup).not.toContain("<script>");
    expect(markup).toContain("Quiet ideas, clearly made.");
    expect(markup).toContain("Independent design work for thoughtful businesses.");
    expect(markup).toContain('href="mailto:hello@sora.example"');
    expect(markup).toContain('href="tel:+660812345678"');
    expect(markup).toContain('href="https://sora.example/about"');
    expect(markup).toContain("https://cdn.example/public/logo.png");
    expect(markup).toContain("https://cdn.example/public/hero.webp");
    expect(markup).toContain("background-color:#E06B3C");
    expect(markup).not.toContain("private/logo-key.png");
    expect(markup).not.toContain("private/hero-key.webp");
    expect(markup.toLowerCase()).not.toContain("marketplace");
    expect(markup.toLowerCase()).not.toContain("storefront");
  });

  it("omits every optional section when only required published content exists", () => {
    const markup = renderToStaticMarkup(
      <BrandedWebsite
        content={{
          businessName: "Sora Studio",
          description: "A focused home for independent work.",
        }}
      />,
    );

    expect(markup).toContain("Sora Studio");
    expect(markup).toContain("A focused home for independent work.");
    expect(markup).toContain("About");
    expect(markup).not.toContain("Contact");
    expect(markup).not.toContain("Learn more");
    expect(markup).not.toContain("<img");
    expect(markup).not.toContain("mailto:");
    expect(markup).not.toContain("tel:");
  });
});
