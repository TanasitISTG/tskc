import type { Metadata } from "next";

import "./globals.css";

const description = "TSKC gives independent businesses a direct, branded website through one simple plan.";

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
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
