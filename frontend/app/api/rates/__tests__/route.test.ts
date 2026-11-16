import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** 16 Nov 2026 00:00:00 UTC — the provider's "last update" in fixtures. */
const UNIX_NOV_16 = Date.UTC(2026, 10, 16) / 1000;

function providerPayload(inr = 94.4): Record<string, unknown> {
  return {
    result: "success",
    time_last_update_unix: UNIX_NOV_16,
    base_code: "USD",
    rates: {
      USD: 1,
      INR: inr,
      EUR: 0.92,
      GBP: 0.79,
      JPY: 152,
      KRW: 1336,
      AUD: 1.52,
      CAD: 1.37,
      CHF: 0.88,
      CNY: 7.15,
      AED: 3.67,
      SGD: 1.29,
    },
  };
}

function okJson(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("GET /api/rates", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-16T12:00:00Z"));
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    const route = await import("../route");
    route.__clearRatesCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  async function loadGet() {
    const route = await import("../route");
    return route.GET;
  }

  it("serves a normalized table from the provider with freshness headers", async () => {
    fetchMock.mockResolvedValue(okJson(providerPayload()));
    const GET = await loadGet();

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=300");
    expect(res.headers.get("X-Rates-Source")).toBe("live");

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.stale).toBe(false);
    expect(body.asOf).toBe("2026-11-16");
    expect(typeof body.fetchedAt).toBe("number");
    const rates = body.rates as Record<string, string>;
    expect(rates.USD).toBe("1");
    expect(rates.INR).toBe("94.4");
    expect(rates.AED).toBe("3.67");
    expect(Object.keys(rates)).toHaveLength(12);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("open.er-api.com"),
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("answers from the cache inside the TTL without a second upstream call", async () => {
    fetchMock.mockResolvedValue(okJson(providerPayload()));
    const GET = await loadGet();

    const first = await GET();
    const second = await GET();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const body = (await second.json()) as { stale: boolean };
    expect(body.stale).toBe(false);
  });

  it("re-fetches once the TTL has passed", async () => {
    fetchMock.mockResolvedValueOnce(okJson(providerPayload(94.4)));
    const GET = await loadGet();
    await GET();

    vi.setSystemTime(new Date("2026-11-16T12:16:00Z")); // +16 min > 15 min TTL
    fetchMock.mockResolvedValueOnce(okJson(providerPayload(95.5)));
    const res = await GET();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const body = (await res.json()) as { rates: Record<string, string> };
    expect(body.rates.INR).toBe("95.5");
  });

  it("keeps serving the last good table as stale when the upstream fails", async () => {
    fetchMock.mockResolvedValueOnce(okJson(providerPayload()));
    const GET = await loadGet();
    const first = await GET();
    const firstBody = (await first.json()) as { fetchedAt: number };

    vi.setSystemTime(new Date("2026-11-16T12:16:00Z")); // cache expired
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Rates-Source")).toBe("stale");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=60");
    const body = (await res.json()) as {
      stale: boolean;
      fetchedAt: number;
      rates: Record<string, string>;
    };
    expect(body.stale).toBe(true);
    expect(body.fetchedAt).toBe(firstBody.fetchedAt); // original fetch time kept
    expect(body.rates.INR).toBe("94.4");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns 503 when the provider is unreachable and nothing is cached", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const GET = await loadGet();

    const res = await GET();
    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Live rates are unavailable right now");
  });

  it("returns 503 for the provider's error envelope", async () => {
    fetchMock.mockResolvedValue(
      okJson({ result: "error", "error-type": "invalid-base-code" }),
    );
    const GET = await loadGet();

    const res = await GET();
    expect(res.status).toBe(503);
  });

  it("drops a cache older than the stale window instead of serving it", async () => {
    fetchMock.mockResolvedValueOnce(okJson(providerPayload()));
    const GET = await loadGet();
    await GET();

    vi.setSystemTime(new Date("2026-11-17T13:00:00Z")); // +25 h > 24 h stale window
    fetchMock.mockRejectedValue(new Error("network down"));
    const res = await GET();

    expect(res.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
