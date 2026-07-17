import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  profilesSampleRate: 0,
  enableLogs: true,
  integrations: [Sentry.consoleLoggingIntegration()],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
