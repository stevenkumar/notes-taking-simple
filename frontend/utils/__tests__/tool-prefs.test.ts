import { beforeEach, describe, expect, it } from "vitest";
import {
  MAX_RECENT_TOOLS,
  loadFavourites,
  loadRecentTools,
  pushRecentIn,
  recordRecentTool,
  toggleFavourite,
  toggleFavouriteIn,
} from "../tool-prefs";
import { STORAGE_KEYS } from "../storage";
import type { CalculatorId } from "@/modules/calculator/types";

// ── Browser shims (vitest runs in node; storage.ts guards on window) ──

let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  const mock = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };
  (globalThis as Record<string, unknown>).window = globalThis;
  (globalThis as Record<string, unknown>).localStorage = mock;
});

const id = (s: string) => s as CalculatorId;

// ── Pure list logic ──────────────────────────────────────────

describe("toggleFavouriteIn", () => {
  it("adds an absent id at the end", () => {
    expect(toggleFavouriteIn(["basic"], id("gst"))).toEqual(["basic", "gst"]);
  });

  it("removes a present id without touching the rest", () => {
    expect(toggleFavouriteIn(["basic", "gst", "emi"], id("gst"))).toEqual([
      "basic",
      "emi",
    ]);
  });

  it("round-trips: add then remove returns the original list", () => {
    const original: CalculatorId[] = ["basic", "emi"];
    const added = toggleFavouriteIn(original, id("gst"));
    expect(added).toEqual(["basic", "emi", "gst"]);
    expect(toggleFavouriteIn(added, id("gst"))).toEqual(original);
  });
});

describe("pushRecentIn", () => {
  it("prepends a new id", () => {
    expect(pushRecentIn(["basic"], id("gst"), 8)).toEqual(["gst", "basic"]);
  });

  it("dedupes an existing id by moving it to the front", () => {
    expect(pushRecentIn(["emi", "gst", "basic"], id("gst"), 8)).toEqual([
      "gst",
      "emi",
      "basic",
    ]);
  });

  it("caps the list, dropping the oldest entry", () => {
    let list: CalculatorId[] = [];
    for (const tool of ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"] as const) {
      list = pushRecentIn(list, id(tool), 8);
    }
    expect(list).toHaveLength(8);
    expect(list[0]).toBe("j"); // newest first
    expect(list).not.toContain(id("a")); // oldest dropped
    expect(list).not.toContain(id("b"));
  });

  it("keeps the default cap in sync with MAX_RECENT_TOOLS", () => {
    let list: CalculatorId[] = [];
    for (let i = 0; i < MAX_RECENT_TOOLS + 3; i++) {
      list = pushRecentIn(list, id(`tool${i}`));
    }
    expect(list).toHaveLength(MAX_RECENT_TOOLS);
    expect(list[0]).toBe(`tool${MAX_RECENT_TOOLS + 2}`);
  });
});

// ── Storage-backed favourites ────────────────────────────────

describe("favourites persistence", () => {
  it("returns [] when nothing is stored", () => {
    expect(loadFavourites()).toEqual([]);
  });

  it("survives corrupt or wrongly-shaped storage", () => {
    store.set(STORAGE_KEYS.favourites, "{not json");
    expect(loadFavourites()).toEqual([]);
    store.set(STORAGE_KEYS.favourites, '"basic"');
    expect(loadFavourites()).toEqual([]);
    store.set(STORAGE_KEYS.favourites, '{"a":1}');
    expect(loadFavourites()).toEqual([]);
    store.set(STORAGE_KEYS.favourites, '["basic", 7, null, "emi"]');
    expect(loadFavourites()).toEqual(["basic", "emi"]);
  });

  it("drops ids that no longer exist in the registry", () => {
    store.set(STORAGE_KEYS.favourites, '["gst", "ghost-tool", "emi"]');
    expect(loadFavourites()).toEqual(["gst", "emi"]);
  });

  it("toggleFavourite persists add and remove", () => {
    expect(toggleFavourite(id("gst"))).toEqual(["gst"]);
    expect(loadFavourites()).toEqual(["gst"]);
    expect(toggleFavourite(id("gst"))).toEqual([]);
    expect(loadFavourites()).toEqual([]);
  });

  it("toggleFavourite ignores unknown ids", () => {
    store.set(STORAGE_KEYS.favourites, '["basic"]');
    expect(toggleFavourite(id("ghost-tool"))).toEqual(["basic"]);
    expect(loadFavourites()).toEqual(["basic"]);
  });
});

// ── Storage-backed recents ───────────────────────────────────

describe("recent tools persistence", () => {
  it("returns [] when nothing is stored", () => {
    expect(loadRecentTools()).toEqual([]);
  });

  it("records visits newest-first without duplicates", () => {
    recordRecentTool(id("basic"));
    recordRecentTool(id("gst"));
    recordRecentTool(id("basic"));
    expect(loadRecentTools()).toEqual(["basic", "gst"]);
  });

  it("caps persisted recents at MAX_RECENT_TOOLS", () => {
    for (let i = 0; i < MAX_RECENT_TOOLS + 2; i++) {
      recordRecentTool(id("basic"));
      recordRecentTool(id("gst"));
      recordRecentTool(id("emi"));
      recordRecentTool(id("percentage"));
      recordRecentTool(id("discount"));
      recordRecentTool(id("unit"));
      recordRecentTool(id("currency"));
      recordRecentTool(id("age"));
      recordRecentTool(id("date-time"));
      recordRecentTool(id("scientific"));
    }
    const recents = loadRecentTools();
    expect(recents).toHaveLength(MAX_RECENT_TOOLS);
    expect(recents[0]).toBe("scientific");
  });

  it("survives corrupt storage and filters stale ids", () => {
    store.set(STORAGE_KEYS.recentTools, "oops");
    expect(loadRecentTools()).toEqual([]);
    store.set(STORAGE_KEYS.recentTools, '["ghost", "emi", 42]');
    expect(loadRecentTools()).toEqual(["emi"]);
  });

  it("recordRecentTool ignores unknown ids", () => {
    recordRecentTool(id("basic"));
    expect(recordRecentTool(id("ghost-tool"))).toEqual(["basic"]);
    expect(loadRecentTools()).toEqual(["basic"]);
  });
});
