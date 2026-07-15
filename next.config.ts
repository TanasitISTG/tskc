import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

const nextConfig: NextConfig = {
  env: sentryDsn === undefined ? undefined : { NEXT_PUBLIC_SENTRY_DSN: sentryDsn },
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
});
