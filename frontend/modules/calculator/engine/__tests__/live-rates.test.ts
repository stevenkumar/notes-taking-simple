import { describe, expect, it } from "vitest";
import {
  applyLiveRates,
  DEFAULT_RATES_STATE,
  mergeRateTables,
  normalizeLiveRates,
  type RatesState,
} from "../live-rates";
import { CURRENCIES, DEFAULT_RATES } from "../currency-calculator";

/** 16 Nov 2026 00:00:00 UTC as a provider-style unix timestamp. */
const UNIX_NOV_16 = Date.UTC(2026, 10, 16) / 1000;

/** A healthy open.er-api style payload covering every known currency. */
function providerPayload(): Record<string, unknown> {
  return {
    result: "success",
    provider: "https://www.exchangerate-api.com",
    time_last_update_unix: UNIX_NOV_16,
    time_next_update_unix: Date.UTC(2026, 10, 17) / 1000,
    base_code: "USD",
    rates: {
      USD: 1,
      INR: 94.399626,
      EUR: 0.92,
      GBP: 0.79,
      JPY: 152,
      KRW: 1335.9,
      AUD: 1.52,
      CAD: 1.37,
      CHF: 0.88,
      CNY: 7.15,
      AED: 3.6725,
      SGD: 1.287631,
      // Currencies the app does not know — must be ignored:
      BTC: 0.00001,
      TRY: 41.3,
    },
  };
}

describe("normalizeLiveRates", () => {
  it("maps a full provider payload onto the known currencies, USD fixed at 1", () => {
    const r = normalizeLiveRates(providerPayload(), "2026-01-01");
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    // Exactly the app's 12 currencies — provider extras like BTC are dropped.
    expect(Object.keys(r.data.rates).sort()).toEqual(
      CURRENCIES.map((c) => c.id).sort(),
    );
    expect(r.data.rates.USD).toBe("1");
    expect(r.data.rates.INR).toBe("94.399626");
    expect(r.data.rates.AED).toBe("3.6725");
    expect(r.data.rates.SGD).toBe("1.287631");
    expect(r.data.rates).not.toHaveProperty("BTC");
    expect(r.data.asOf).toBe("2026-11-16");
  });

  it("accepts numeric strings and drops non-positive or junk entries", () => {
    const r = normalizeLiveRates(
      {
        result: "success",
        rates: {
          USD: 1,
          INR: "94.5 ", // string with padding
          EUR: 0, // zero → built-in
          JPY: -5, // negative → built-in
          GBP: "abc", // junk → built-in
          CNY: "7.2", // clean string
          KRW: 1336,
          AUD: 1.52,
          CAD: 1.37,
          CHF: 0.88,
          AED: 3.67,
          SGD: 1.29,
        },
      },
      "2026-01-01",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.rates.INR).toBe("94.5");
    expect(r.data.rates.CNY).toBe("7.2");
    expect(r.data.rates.EUR).toBe(DEFAULT_RATES.EUR);
    expect(r.data.rates.JPY).toBe(DEFAULT_RATES.JPY);
    expect(r.data.rates.GBP).toBe(DEFAULT_RATES.GBP);
  });

  it("fills currencies the feed omits from the built-in table", () => {
    const r = normalizeLiveRates(
      { result: "success", rates: { USD: 1, INR: 95 } },
      "2026-01-01",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.rates.INR).toBe("95");
    expect(r.data.rates.EUR).toBe(DEFAULT_RATES.EUR);
    expect(r.data.rates.SGD).toBe(DEFAULT_RATES.SGD);
    expect(Object.keys(r.data.rates)).toHaveLength(CURRENCIES.length);
  });

  it("rejects a payload with no usable known-currency rate", () => {
    const r = normalizeLiveRates(
      { result: "success", rates: { BTC: 1, XYZ: 2 } },
      "2026-01-01",
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("Rate feed returned no usable rates");
  });

  it("rejects the provider's error envelope before touching rates", () => {
    const r = normalizeLiveRates(
      { result: "error", "error-type": "invalid-base-code" },
      "2026-01-01",
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("Rate feed returned an error");
  });

  it("rejects non-object payloads and payloads without a rates object", () => {
    for (const bad of [null, "oops", 42, {}, { result: "success" }]) {
      const r = normalizeLiveRates(bad, "2026-01-01");
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error).toBe("Rate feed returned no rates");
    }
  });

  it("prefers an explicit asOf (our own proxy response)", () => {
    const r = normalizeLiveRates(
      { rates: { USD: 1, INR: 94 }, asOf: "2026-11-16", fetchedAt: 5, stale: false },
      "2026-01-01",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.asOf).toBe("2026-11-16");
    expect(r.data.rates.INR).toBe("94");
  });

  it("reads the provider's unix timestamp when no explicit asOf exists", () => {
    const r = normalizeLiveRates(providerPayload(), "2026-01-01");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.asOf).toBe("2026-11-16");
  });

  it("parses the RFC-style UTC string when the unix field is absent", () => {
    const r = normalizeLiveRates(
      {
        result: "success",
        time_last_update_utc: "Sat, 14 Nov 2026 00:02:31 +0000",
        rates: { USD: 1, INR: 94 },
      },
      "2026-01-01",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.asOf).toBe("2026-11-14");
  });

  it("falls back to the caller's date when the payload has no timestamp", () => {
    const r = normalizeLiveRates(
      { result: "success", rates: { USD: 1, INR: 94 } },
      "2026-01-02",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.asOf).toBe("2026-01-02");
  });

  it("never mutates the payload", () => {
    const payload = providerPayload();
    const before = JSON.stringify(payload);
    normalizeLiveRates(payload, "2026-01-01");
    expect(JSON.stringify(payload)).toBe(before);
  });

  it("is idempotent on its own output (the client re-normalizes)", () => {
    const first = normalizeLiveRates(providerPayload(), "2026-01-01");
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const proxyBody = { ...first.data, fetchedAt: 123, stale: false };
    const second = normalizeLiveRates(proxyBody, "2026-01-01");
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.data.rates).toEqual(first.data.rates);
    expect(second.data.asOf).toBe(first.data.asOf);
  });
});

describe("mergeRateTables", () => {
  it("lets the overlay win and keeps base entries it lacks", () => {
    const merged = mergeRateTables(
      { USD: "1", INR: "88.5", EUR: "0.92" },
      { INR: "94.4" },
    );
    expect(merged.INR).toBe("94.4");
    expect(merged.EUR).toBe("0.92");
    expect(merged.USD).toBe("1");
  });

  it("skips empty or whitespace overlay values", () => {
    const merged = mergeRateTables({ INR: "88.5" }, { INR: " ", EUR: "" });
    expect(merged.INR).toBe("88.5");
    expect(merged.EUR).toBeUndefined();
  });

  it("returns a new table without mutating the inputs", () => {
    const base = { USD: "1", INR: "88.5" };
    const overlay = { INR: "94.4" };
    const merged = mergeRateTables(base, overlay);
    expect(merged).not.toBe(base);
    expect(base.INR).toBe("88.5");
    expect(overlay.INR).toBe("94.4");
  });
});

describe("applyLiveRates", () => {
  const live = normalizeLiveRates(providerPayload(), "2026-01-01");
  if (!live.ok) throw new Error("fixture payload must normalize");

  it("flips the default table to a live snapshot", () => {
    const next = applyLiveRates(DEFAULT_RATES_STATE, live.data, 1795000000000);
    expect(next.source).toBe("live");
    expect(next.rates.INR).toBe("94.399626");
    expect(next.liveAsOf).toBe("2026-11-16");
    expect(next.fetchedAt).toBe(1795000000000);
    expect(next.editedAt).toBeNull();
  });

  it("refreshes an existing live snapshot with the newer one", () => {
    const first = applyLiveRates(DEFAULT_RATES_STATE, live.data, 1000);
    const newer = normalizeLiveRates(
      { result: "success", time_last_update_unix: UNIX_NOV_16, rates: { USD: 1, INR: 95.5 } },
      "2026-01-01",
    );
    expect(newer.ok).toBe(true);
    if (!newer.ok) return;

    const next = applyLiveRates(first, newer.data, 2000);
    expect(next.source).toBe("live");
    expect(next.rates.INR).toBe("95.5");
    expect(next.fetchedAt).toBe(2000);
    expect(next.liveAsOf).toBe("2026-11-16");
  });

  it("lets custom edits win — the state comes back untouched", () => {
    const custom: RatesState = {
      rates: { ...DEFAULT_RATES, INR: "90" },
      source: "custom",
      editedAt: 1794999999999,
      liveAsOf: null,
      fetchedAt: null,
    };
    const next = applyLiveRates(custom, live.data, 3000);
    expect(next).toBe(custom); // same reference — no live data leaks in
    expect(next.rates.INR).toBe("90");
    expect(next.source).toBe("custom");
    expect(next.editedAt).toBe(1794999999999);
  });
});

describe("DEFAULT_RATES_STATE", () => {
  it("is the untouched built-in snapshot", () => {
    expect(DEFAULT_RATES_STATE.source).toBe("default");
    expect(DEFAULT_RATES_STATE.rates).toBe(DEFAULT_RATES);
    expect(DEFAULT_RATES_STATE.editedAt).toBeNull();
    expect(DEFAULT_RATES_STATE.liveAsOf).toBeNull();
    expect(DEFAULT_RATES_STATE.fetchedAt).toBeNull();
  });
});
