import type { Metadata } from "next";

import "./globals.css";

const description =
  "TSKC gives independent businesses a direct, branded website through one simple plan.";

export const metadata: Metadata = {
  title: {
    default: "TSKC | Branded websites for independent businesses",
    template: "%s | TSKC",
  },
  description,
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "TSKC",
    title: "TSKC | Branded websites for independent businesses",
    description,
  },
  twitter: {
    card: "summary",
    title: "TSKC | Branded websites for independent businesses",
    description,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth">
      <body>
        <a
          className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-50 focus-visible:inline-flex focus-visible:min-h-11 focus-visible:items-center focus-visible:rounded-full focus-visible:bg-primary focus-visible:px-4 focus-visible:py-2 focus-visible:text-primary-foreground"
          href="#main-content"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
