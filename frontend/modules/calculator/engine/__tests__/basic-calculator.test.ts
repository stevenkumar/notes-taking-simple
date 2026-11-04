import { describe, expect, it } from "vitest";
import {
  createBasicState,
  pressKey,
  DIVIDE_BY_ZERO,
  KEYPAD_LAYOUT,
  KEYBOARD_MAP,
  MAX_DIGITS,
  type BasicKey,
  type BasicState,
} from "../basic-calculator";

/** Fold a sequence of keys from a fresh state. */
function run(...keys: BasicKey[]): BasicState {
  return keys.reduce(pressKey, createBasicState());
}

/** All digits 0-9, twelve times, for length-cap tests. */
const MAX_DIGITS_INPUT = Array.from({ length: MAX_DIGITS }, () => "9").join("");

// ════════════════════════════════════════════════════════════
// Initial state
// ════════════════════════════════════════════════════════════

describe("createBasicState", () => {
  it("starts at 0 with no pending operation or error", () => {
    const s = createBasicState();
    expect(s.display).toBe("0");
    expect(s.expression).toBeNull();
    expect(s.accumulator).toBeNull();
    expect(s.pendingOp).toBeNull();
    expect(s.lastOp).toBeNull();
    expect(s.error).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════
// Digits and decimal
// ════════════════════════════════════════════════════════════

describe("digit entry", () => {
  it("builds multi-digit numbers", () => {
    expect(run("1", "2", "3").display).toBe("123");
  });

  it("replaces a leading zero but keeps a lone zero", () => {
    expect(run("0", "5").display).toBe("5");
    expect(run("0", "0", "0").display).toBe("0");
  });

  it(`caps input at ${MAX_DIGITS} digits and ignores the next press`, () => {
    const full = run(...MAX_DIGITS_INPUT.split("") as BasicKey[]);
    expect(full.display).toBe(MAX_DIGITS_INPUT);
    // The thirteenth digit is ignored — and the SAME state object comes back.
    expect(pressKey(full, "7")).toBe(full);
    expect(full.display).toBe(MAX_DIGITS_INPUT);
  });

  it("types decimals and ignores a second dot", () => {
    expect(run("5", ".", "2", "5").display).toBe("5.25");
    expect(run(".").display).toBe("0.");
    expect(run("1", ".", "2", ".").display).toBe("1.2");
  });

  it("starts a fresh number after '=' and drops the equation line", () => {
    const s = run("2", "2", "add", "4", "equals");
    expect(s.display).toBe("26");
    const next = pressKey(s, "9");
    expect(next.display).toBe("9");
    expect(next.expression).toBeNull();
    expect(next.lastOp).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════
// Arithmetic
// ════════════════════════════════════════════════════════════

describe("arithmetic", () => {
  it("adds and shows the full equation", () => {
    const s = run("2", "0", "0", "add", "1", "0", "0", "equals");
    expect(s.display).toBe("300");
    expect(s.expression).toBe("200 + 100 =");
    expect(s.pendingOp).toBeNull();
    expect(s.accumulator).toBeNull();
  });

  it("subtracts", () => {
    expect(run("5", "0", "subtract", "5", "equals").display).toBe("45");
  });

  it("multiplies", () => {
    expect(run("1", "2", "multiply", "1", "2", "equals").display).toBe("144");
  });

  it("divides", () => {
    expect(run("1", "0", "0", "divide", "4", "equals").display).toBe("25");
  });

  it("evaluates left-to-right with no precedence: 2 + 3 × 4 = 20", () => {
    expect(run("2", "add", "3", "multiply", "4", "equals").display).toBe("20");
  });

  it("chains through an operator press: 10 + 5 − 3 = 12", () => {
    const mid = run("1", "0", "add", "5", "subtract");
    // Pressing the second operator evaluates 10 + 5 first.
    expect(mid.display).toBe("15");
    expect(mid.expression).toBe("15 −");
    expect(run("1", "0", "add", "5", "subtract", "3", "equals").display).toBe("12");
  });

  it("swaps the operator instead of computing when none is typed yet", () => {
    const s = run("2", "add", "multiply", "3", "equals");
    expect(s.display).toBe("6");
    expect(s.expression).toBe("2 × 3 =");
  });

  it("shows the equation line as soon as an operator is pressed", () => {
    expect(run("1", "2", "add").expression).toBe("12 +");
    expect(run("1", "2", "add").awaitingOperand).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════
// Equals
// ════════════════════════════════════════════════════════════

describe("equals", () => {
  it("repeats the last operation: 5 + 3 = → 8, 11, 14", () => {
    const s = run("5", "add", "3", "equals");
    expect(s.display).toBe("8");
    expect(pressKey(s, "equals").display).toBe("11");
    expect(run("5", "add", "3", "equals", "equals", "equals").display).toBe("14");
  });

  it("squares through the visible operand when pressed right after an operator", () => {
    expect(run("2", "add", "equals").display).toBe("4");
    // …and the repeat chain continues from there.
    expect(run("2", "add", "equals", "equals").display).toBe("6");
  });

  it("is a no-op on a plain typed number (returns the same state)", () => {
    const s = run("4", "2");
    expect(pressKey(s, "equals")).toBe(s);
    expect(s.display).toBe("42");
  });
});

// ════════════════════════════════════════════════════════════
// Percent
// ════════════════════════════════════════════════════════════

describe("percent", () => {
  it("standalone percent divides by 100: 50% → 0.5", () => {
    expect(run("5", "0", "percent").display).toBe("0.5");
  });

  it("with + it is percent of the accumulator: 200 + 10% = 220", () => {
    const typed = run("2", "0", "0", "add", "1", "0", "percent");
    expect(typed.display).toBe("20");
    expect(run("2", "0", "0", "add", "1", "0", "percent", "equals").display).toBe("220");
  });

  it("with − it is percent of the accumulator: 5000 − 20% = 4000", () => {
    expect(
      run("5", "0", "0", "0", "subtract", "2", "0", "percent", "equals").display,
    ).toBe("4000");
  });

  it("with × it divides by 100: 200 × 10% = 20", () => {
    expect(
      run("2", "0", "0", "multiply", "1", "0", "percent", "equals").display,
    ).toBe("20");
  });
});

// ════════════════════════════════════════════════════════════
// Sign and backspace
// ════════════════════════════════════════════════════════════

describe("sign toggle", () => {
  it("toggles the sign twice back to the original", () => {
    expect(run("5", "sign").display).toBe("-5");
    expect(run("5", "sign", "sign").display).toBe("5");
  });

  it("leaves plain 0 unchanged (same state object)", () => {
    const s = run("0");
    expect(pressKey(s, "sign")).toBe(s);
  });

  it("feeds a negative operand into the pending operation: 5 − (−5) = 10", () => {
    expect(run("5", "subtract", "5", "sign", "equals").display).toBe("10");
  });
});

describe("backspace", () => {
  it("removes one character at a time and floors at 0", () => {
    expect(run("1", "2", "3", "backspace").display).toBe("12");
    expect(run("1", "2", "3", "backspace", "backspace", "backspace").display).toBe("0");
    expect(run("backspace", "backspace").display).toBe("0");
  });

  it("edits a computed result", () => {
    const s = run("1", "0", "0", "divide", "4", "equals"); // 25
    expect(pressKey(s, "backspace").display).toBe("2");
  });

  it("does nothing while waiting for an operand (same state object)", () => {
    const s = run("5", "add");
    expect(pressKey(s, "backspace")).toBe(s);
  });
});

// ════════════════════════════════════════════════════════════
// Clear
// ════════════════════════════════════════════════════════════

describe("clear", () => {
  it("resets everything mid-calculation", () => {
    const s = run("2", "0", "0", "add", "clear");
    expect(s.display).toBe("0");
    expect(s.expression).toBeNull();
    expect(s.accumulator).toBeNull();
    expect(s.pendingOp).toBeNull();
    expect(s.error).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════
// Division by zero
// ════════════════════════════════════════════════════════════

describe("division by zero", () => {
  const broken = run("5", "divide", "0", "equals");

  it("sets an error and unwinds the pending operation", () => {
    expect(broken.error).toBe(DIVIDE_BY_ZERO);
    expect(broken.pendingOp).toBeNull();
    expect(broken.accumulator).toBeNull();
    expect(broken.lastOp).toBeNull();
  });

  it("ignores operators and percent while in error (same object)", () => {
    expect(pressKey(broken, "add")).toBe(broken);
    expect(pressKey(broken, "percent")).toBe(broken);
    expect(pressKey(broken, "equals")).toBe(broken);
  });

  it("a digit starts a fresh calculation", () => {
    const s = pressKey(broken, "7");
    expect(s.error).toBeNull();
    expect(s.display).toBe("7");
    expect(s.expression).toBeNull();
  });

  it("AC and backspace both recover to the initial state", () => {
    expect(pressKey(broken, "clear")).toEqual(createBasicState());
    expect(pressKey(broken, "backspace")).toEqual(createBasicState());
  });
});

// ════════════════════════════════════════════════════════════
// Precision (decimal arithmetic)
// ════════════════════════════════════════════════════════════

describe("precision", () => {
  it("0.1 + 0.2 = 0.3 exactly (no float noise)", () => {
    expect(run("0", ".", "1", "add", "0", ".", "2", "equals").display).toBe("0.3");
  });

  it("keeps 10 decimal places on division: 2 ÷ 3", () => {
    expect(run("2", "divide", "3", "equals").display).toBe("0.6666666667");
  });

  it("stays exact for large integers: 999999999999²", () => {
    const nineTwelve = MAX_DIGITS_INPUT.split("") as BasicKey[];
    expect(run(...nineTwelve, "multiply", ...nineTwelve, "equals").display).toBe(
      "999999999998000000000001",
    );
  });

  it("never returns -0", () => {
    expect(run("0", "subtract", "0", "equals").display).toBe("0");
  });
});

// ════════════════════════════════════════════════════════════
// Purity and key maps
// ════════════════════════════════════════════════════════════

describe("purity", () => {
  it("never mutates the input state", () => {
    const s = run("1", "2", "3");
    const before = JSON.stringify(s);
    pressKey(s, "add");
    pressKey(s, ".");
    pressKey(s, "backspace");
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe("key maps", () => {
  it("KEYBOARD_MAP covers the keyboard essentials", () => {
    expect(KEYBOARD_MAP["Enter"]).toBe("equals");
    expect(KEYBOARD_MAP["="]).toBe("equals");
    expect(KEYBOARD_MAP["-"]).toBe("subtract");
    expect(KEYBOARD_MAP["*"]).toBe("multiply");
    expect(KEYBOARD_MAP["/"]).toBe("divide");
    expect(KEYBOARD_MAP["%"]).toBe("percent");
    expect(KEYBOARD_MAP["Backspace"]).toBe("backspace");
    expect(KEYBOARD_MAP["Escape"]).toBe("clear");
    expect(KEYBOARD_MAP[","]).toBe(".");
  });

  it("KEYPAD_LAYOUT is a 4×5 grid with 20 unique keys", () => {
    expect(KEYPAD_LAYOUT).toHaveLength(5);
    const flat = KEYPAD_LAYOUT.flat();
    expect(flat).toHaveLength(20);
    expect(new Set(flat).size).toBe(20);
    expect(flat).toContain("clear");
    expect(flat).toContain("equals");
    expect(flat.filter((k) => k >= "0" && k <= "9")).toHaveLength(10);
  });
});
