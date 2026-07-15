import { parseServerEnv } from "@/lib/env";
import { runHealthChecks } from "@/server/health";

export const runtime = "nodejs";

export async function GET() {
  const result = await runHealthChecks(parseServerEnv(process.env));
  return Response.json(result, { status: result.status === "ok" ? 200 : 503 });
}
