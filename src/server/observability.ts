import "server-only";

import * as Sentry from "@sentry/nextjs";

export type LogLevel = "error" | "warn" | "info";

export function logEvent(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> = {},
): void {
  const payload = { ts: new Date().toISOString(), level, event, ...fields };
  const consoleLevel = level === "info" ? "info" : level;
  console[consoleLevel](JSON.stringify(payload));

  if (level === "error") {
    Sentry.captureException(fields.error instanceof Error ? fields.error : new Error(event), {
      extra: fields,
    });
  } else if (level === "warn") {
    Sentry.captureMessage(event, { level: "warning", extra: fields });
  }
}
