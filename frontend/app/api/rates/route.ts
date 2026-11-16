/**
 * GET /api/rates — server-side proxy for the live exchange-rate feed.
 *
 * Keeps the keyless provider (open.er-api.com, base USD) off the client:
 * the browser only ever talks to this route, so there are no CORS
 * concerns and the upstream URL stays in one place.
 *
 * Caching (module-level, per server process):
 *   - fresh window (TTL_MS): the cached table is served without a
 *     network call;
 *   - beyond TTL: one upstream attempt with a hard timeout;
 *   - upstream failed: the last good table keeps being served, marked
 *     `stale: true`, for up to STALE_MS;
 *   - older than STALE_MS (or never fetched): 503 and the client keeps
 *     its built-in/custom rates — conversions never break offline.
 *
 * The response body is the engine's normalized shape (`rates` per
 * 1 USD for the known currencies + `asOf`), so the client can run it
 * through the same normalize/apply helpers as any other payload.
 */

import { normalizeLiveRates } from "@/modules/calculator/engine/live-rates";
import type { RateTable } from "@/modules/calculator/engine/currency-calculator";

const PROVIDER_URL = "https://open.er-api.com/v6/latest/USD";
/** Serve the cached table this long before re-hitting the provider. */
const TTL_MS = 15 * 60 * 1000;
/** Keep serving the last good table (marked stale) for up to a day. */
const STALE_MS = 24 * 60 * 60 * 1000;
/** Hard cap on one upstream attempt. */
const FETCH_TIMEOUT_MS = 8000;

export interface RatesResponseBody {
  rates: RateTable;
  /** Provider snapshot date, ISO "YYYY-MM-DD". */
  asOf: string;
  /** Epoch ms this table was fetched from the provider. */
  fetchedAt: number;
  /** True when serving an expired cache because the upstream failed. */
  stale: boolean;
}

interface CachedRates {
  body: RatesResponseBody;
  fetchedAt: number;
}

let cache: CachedRates | null = null;

function jsonResponse(body: RatesResponseBody, cacheControl: string): Response {
  return Response.json(body, {
    headers: {
      "Cache-Control": cacheControl,
      "X-Rates-Source": body.stale ? "stale" : "live",
    },
  });
}

export async function GET(): Promise<Response> {
  const now = Date.now();

  // Fresh cache — no network call.
  if (cache && now - cache.fetchedAt < TTL_MS) {
    return jsonResponse({ ...cache.body, stale: false }, "public, max-age=300");
  }

  try {
    const res = await fetch(PROVIDER_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Provider responded ${res.status}`);

    const payload: unknown = await res.json();
    const today = new Date(now).toISOString().slice(0, 10);
    const normalized = normalizeLiveRates(payload, today);
    if (!normalized.ok) throw new Error(normalized.error);

    const body: RatesResponseBody = {
      rates: normalized.data.rates,
      asOf: normalized.data.asOf,
      fetchedAt: now,
      stale: false,
    };
    cache = { body, fetchedAt: now };
    return jsonResponse(body, "public, max-age=300");
  } catch {
    // Upstream failed — fall back to the last good table while it is young enough.
    if (cache && now - cache.fetchedAt < STALE_MS) {
      return jsonResponse({ ...cache.body, stale: true }, "public, max-age=60");
    }
    cache = null;
    return Response.json(
      { error: "Live rates are unavailable right now" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

/** Test-only escape hatch: the module cache would leak across cases. */
export function __clearRatesCache(): void {
  cache = null;
}
