import "server-only";

import { kv } from "@vercel/kv";

const WINDOW_SECONDS = 900;
const MAX_REQUESTS = 5;

export async function checkCheckoutRateLimit(sellerId: string): Promise<boolean> {
  if (!process.env.KV_REST_API_URL) {
    return true;
  }

  try {
    const key = `checkout:${sellerId}`;
    const count = await kv.incr(key);

    if (count === 1) {
      await kv.expire(key, WINDOW_SECONDS);
    }

    return count <= MAX_REQUESTS;
  } catch {
    return true;
  }
}
