import type { Metadata } from "next";

import "./globals.css";

const description = "TSKC is a digital storefront platform for selling keys, text, and files with receipt-based payment checks.";

export const metadata: Metadata = {
  title: {
    default: "TSKC | Digital storefronts for independent sellers",
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
    title: "TSKC | Digital storefronts for independent sellers",
    description,
  },
  twitter: {
    card: "summary",
    title: "TSKC | Digital storefronts for independent sellers",
    description,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
