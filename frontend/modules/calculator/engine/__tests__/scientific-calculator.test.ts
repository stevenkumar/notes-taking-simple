import { describe, expect, it } from "vitest";
import {
  createScientificState,
  DIVIDE_BY_ZERO,
  evaluateExpression,
  KEY_LABELS,
  KEYBOARD_MAP,
  MAX_EXPRESSION_LENGTH,
  prettyExpression,
  pressScientificKey,
  SCIENTIFIC_KEYPAD,
  type ScientificKey,
  type ScientificState,
} from "../scientific-calculator";

// ── Helpers ─────────────────────────────────────────────────

interface EvalOpts {
  angleMode?: "deg" | "rad";
  ans?: string;
}

/** Evaluate and assert success, returning the result string. */
function value(src: string, opts: EvalOpts = {}): string {
  const r = evaluateExpression(src, {
    angleMode: opts.angleMode ?? "deg",
    ans: opts.ans ?? "0",
  });
  expect(r.ok, `${src} should evaluate but failed: ${r.ok ? "" : r.error}`).toBe(true);
  if (!r.ok) throw new Error(r.error);
  return r.data;
}

/** Evaluate and assert failure, returning the error message. */
function errorOf(src: string, opts: EvalOpts = {}): string {
  const r = evaluateExpression(src, {
    angleMode: opts.angleMode ?? "deg",
    ans: opts.ans ?? "0",
  });
  expect(r.ok, `${src} should fail but returned ${r.ok ? r.data : ""}`).toBe(false);
  if (r.ok) throw new Error("expected a failure");
  return r.error;
}

/** Press a chain of keys starting from a fresh state. */
function press(...keys: ScientificKey[]): ScientificState {
  return keys.reduce(pressScientificKey, createScientificState());
}

// ════════════════════════════════════════════════════════════
// Grammar: precedence, associativity, grouping
// ════════════════════════════════════════════════════════════

describe("evaluateExpression — precedence and associativity", () => {
  it("multiplication binds tighter than addition: 2+3×4 = 14", () => {
    expect(value("2+3×4")).toBe("14");
  });

  it("parentheses override precedence: (2+3)×4 = 20", () => {
    expect(value("(2+3)×4")).toBe("20");
  });

  it("power binds tighter than multiplication: 2+3×4^2 = 50", () => {
    expect(value("2+3×4^2")).toBe("50");
  });

  it("^ is right-associative: 2^3^2 = 512, not 64", () => {
    expect(value("2^3^2")).toBe("512");
  });

  it("postfix ! binds tighter than ^: 3!^2 = 36", () => {
    expect(value("3!^2")).toBe("36");
  });

  it("the ^ exponent may itself be a factorial: 2^3! = 64", () => {
    expect(value("2^3!")).toBe("64");
  });

  it("subtraction and division are left-associative", () => {
    expect(value("10−2−3")).toBe("5");
    expect(value("100÷5÷2")).toBe("10");
  });

  it("unary minus sits below ^: −2^2 = −4", () => {
    expect(value("−2^2")).toBe("-4");
  });

  it("implicit multiplication after division: 6÷2(1+2) = 9", () => {
    expect(value("6÷2(1+2)")).toBe("9");
  });

  it("accepts ascii operators too (1/3, 2*3)", () => {
    expect(value("2*3")).toBe("6");
    expect(value("1/4")).toBe("0.25");
  });
});

// ════════════════════════════════════════════════════════════
// Decimal arithmetic (PRD §14)
// ════════════════════════════════════════════════════════════

describe("evaluateExpression — decimal arithmetic", () => {
  it("0.1 + 0.2 = 0.3 exactly (no float drift)", () => {
    expect(value("0.1+0.2")).toBe("0.3");
  });

  it("1.1 + 2.2 = 3.3 exactly", () => {
    expect(value("1.1+2.2")).toBe("3.3");
  });

  it("repeating division rounds to 10dp half-up: 1÷3", () => {
    expect(value("1÷3")).toBe("0.3333333333");
  });

  it("2×0.1 + 0.1 = 0.3", () => {
    expect(value("2×0.1+0.1")).toBe("0.3");
  });
});

// ════════════════════════════════════════════════════════════
// Postfix operators: ! % ² ⁻¹
// ════════════════════════════════════════════════════════════

describe("evaluateExpression — postfix operators", () => {
  it("factorial: 5! = 120 and 0! = 1", () => {
    expect(value("5!")).toBe("120");
    expect(value("0!")).toBe("1");
  });

  it("percent is divide-by-100: 50% = 0.5, 200×50% = 100", () => {
    expect(value("50%")).toBe("0.5");
    expect(value("200×50%")).toBe("100");
  });

  it("square: 4² = 16", () => {
    expect(value("4²")).toBe("16");
  });

  it("reciprocal: 5⁻¹ = 0.2", () => {
    expect(value("5⁻¹")).toBe("0.2");
  });

  it("reciprocal of zero is a division-by-zero error", () => {
    expect(errorOf("0⁻¹")).toBe(DIVIDE_BY_ZERO);
  });
});

// ════════════════════════════════════════════════════════════
// Constants and implicit multiplication
// ════════════════════════════════════════════════════════════

describe("evaluateExpression — constants and implicit multiplication", () => {
  it("π rounds to 10dp: 3.1415926536", () => {
    expect(value("π")).toBe("3.1415926536");
  });

  it("e rounds to 10dp: 2.7182818285", () => {
    expect(value("e")).toBe("2.7182818285");
  });

  it("2π multiplies implicitly: 6.2831853072", () => {
    expect(value("2π")).toBe("6.2831853072");
  });

  it("2(3+4) multiplies implicitly: 14", () => {
    expect(value("2(3+4)")).toBe("14");
  });

  it("Ans pulls in the previous result", () => {
    expect(value("Ans+1", { ans: "41" })).toBe("42");
  });
});

// ════════════════════════════════════════════════════════════
// Trigonometry — degrees vs radians
// ════════════════════════════════════════════════════════════

describe("evaluateExpression — trigonometry", () => {
  it("degrees: sin(30) = 0.5 (float noise cleaned)", () => {
    expect(value("sin(30)")).toBe("0.5");
  });

  it("degrees: cos(60) = 0.5", () => {
    expect(value("cos(60)")).toBe("0.5");
  });

  it("degrees: tan(45) = 1", () => {
    expect(value("tan(45)")).toBe("1");
  });

  it("degrees: sin(90) = 1 and sin(180) = 0", () => {
    expect(value("sin(90)")).toBe("1");
    expect(value("sin(180)")).toBe("0");
  });

  it("radians: sin(π) = 0 and tan(π÷4) = 1", () => {
    expect(value("sin(π)", { angleMode: "rad" })).toBe("0");
    expect(value("tan(π÷4)", { angleMode: "rad" })).toBe("1");
  });

  it("the angle mode actually changes the answer: sin(180)", () => {
    expect(value("sin(180)")).toBe("0");
    expect(value("sin(180)", { angleMode: "rad" })).toBe("-0.8011526357");
  });
});

// ════════════════════════════════════════════════════════════
// Logarithms and roots
// ════════════════════════════════════════════════════════════

describe("evaluateExpression — logarithms and roots", () => {
  it("log10: log(1000) = 3 and log(1) = 0", () => {
    expect(value("log(1000)")).toBe("3");
    expect(value("log(1)")).toBe("0");
  });

  it("natural log: ln(e) = 1 and ln(1) = 0", () => {
    expect(value("ln(e)")).toBe("1");
    expect(value("ln(1)")).toBe("0");
  });

  it("square root: √(16) = 4", () => {
    expect(value("√(16)")).toBe("4");
  });

  it("√(2) rounds to 10dp: 1.4142135624", () => {
    expect(value("√(2)")).toBe("1.4142135624");
  });
});

// ════════════════════════════════════════════════════════════
// Auto-closing parentheses
// ════════════════════════════════════════════════════════════

describe("evaluateExpression — auto-closed parentheses", () => {
  it("closes a trailing function paren: sin(45 → sin(45)", () => {
    expect(value("sin(45")).toBe("0.7071067812");
  });

  it("closes a trailing root paren: √(9 → 3", () => {
    expect(value("√(9")).toBe("3");
  });

  it("closes a trailing grouping paren: (2+3 → 5", () => {
    expect(value("(2+3")).toBe("5");
  });
});

// ════════════════════════════════════════════════════════════
// Huge results stay displayable
// ════════════════════════════════════════════════════════════

describe("evaluateExpression — large magnitudes", () => {
  it("20! switches to scientific notation (19 digits)", () => {
    expect(value("20!")).toMatch(/^2\.432902008e\+18$/);
  });

  it("100! never renders 158 digits", () => {
    expect(value("100!")).toMatch(/e\+157$/);
  });
});

// ════════════════════════════════════════════════════════════
// Errors — CalculationResult, never a throw
// ════════════════════════════════════════════════════════════

describe("evaluateExpression — errors", () => {
  it("empty expression is an error", () => {
    expect(errorOf("")).toContain("Enter an expression");
  });

  it("dangling operator: 2+ reports the end of the expression", () => {
    expect(errorOf("2+")).toContain("Unexpected end");
  });

  it("double dots: 2..3 is an invalid number", () => {
    expect(errorOf("2..3")).toContain("Invalid number");
  });

  it("division by zero returns the shared message", () => {
    expect(errorOf("5÷0")).toBe(DIVIDE_BY_ZERO);
    expect(errorOf("10÷(2−2)")).toBe(DIVIDE_BY_ZERO);
  });

  it("log of a non-positive is rejected", () => {
    expect(errorOf("log(−1)")).toContain("positive");
    expect(errorOf("log(0)")).toContain("positive");
  });

  it("ln of a non-positive is rejected", () => {
    expect(errorOf("ln(0)")).toContain("positive");
  });

  it("√ of a negative is rejected", () => {
    expect(errorOf("√(−1)")).toContain("square root");
  });

  it("factorial of a negative is rejected", () => {
    expect(errorOf("(−1)!")).toContain("negative");
  });

  it("factorial of a fraction is rejected", () => {
    expect(errorOf("5.5!")).toContain("whole number");
  });

  it("factorial beyond 500 is rejected", () => {
    expect(errorOf("1000!")).toContain("500");
  });

  it("tan at the vertical asymptote is undefined", () => {
    expect(errorOf("tan(90)")).toContain("Tan is undefined");
    expect(errorOf("tan(270)")).toContain("Tan is undefined");
  });

  it("an absurd exponent is rejected before any work happens", () => {
    expect(errorOf("2^99999")).toContain("Exponent");
  });

  it("a negative base with a fractional exponent is rejected", () => {
    expect(errorOf("(−8)^0.5")).toContain("whole-number exponent");
  });

  it("a stray closing paren is rejected: 2)", () => {
    expect(errorOf("2)")).toContain("Unexpected token");
  });

  it("never throws — every failure is a CalculationResult", () => {
    for (const src of ["", "2+", "2..3", "5÷0", "(−1)!", "2)", "sin("]) {
      expect(() => evaluateExpression(src, { angleMode: "deg", ans: "0" })).not.toThrow();
    }
  });
});

// ════════════════════════════════════════════════════════════
// prettyExpression
// ════════════════════════════════════════════════════════════

describe("prettyExpression", () => {
  it("spaces binary operators only", () => {
    expect(prettyExpression("2+3×sin(45)")).toBe("2 + 3 × sin(45)");
    expect(prettyExpression("100÷5−2^3")).toBe("100 ÷ 5 − 2 ^ 3");
  });

  it("keeps a unary minus glued to its operand", () => {
    expect(prettyExpression("−5÷2")).toBe("−5 ÷ 2");
    expect(prettyExpression("2×−3")).toBe("2 × −3");
    expect(prettyExpression("(−1)!")).toBe("(−1)!");
  });
});

// ════════════════════════════════════════════════════════════
// State machine
// ════════════════════════════════════════════════════════════

describe("createScientificState", () => {
  it("starts empty in degrees with Ans = 0", () => {
    expect(createScientificState()).toEqual({
      expression: "",
      justCommitted: false,
      lastEquation: null,
      ans: "0",
      angleMode: "deg",
      error: null,
    });
  });
});

describe("pressScientificKey — evaluation flow", () => {
  it("folds a key chain into an expression and commits on equals", () => {
    const s = press("2", "add", "3", "equals");
    expect(s.expression).toBe("5");
    expect(s.justCommitted).toBe(true);
    expect(s.ans).toBe("5");
    expect(s.lastEquation).toBe("2 + 3 = 5");
    expect(s.error).toBeNull();
  });

  it("equals immediately after a result is a no-op (same reference)", () => {
    const s = press("2", "add", "3", "equals");
    expect(pressScientificKey(s, "equals")).toBe(s);
  });

  it("equals on an empty expression is a no-op (same reference)", () => {
    const s = createScientificState();
    expect(pressScientificKey(s, "equals")).toBe(s);
  });

  it("a digit after a result starts a fresh calculation", () => {
    const s = press("2", "add", "3", "equals", "4");
    expect(s.expression).toBe("4");
    expect(s.justCommitted).toBe(false);
  });

  it("an operator after a result continues from it", () => {
    const s = press("2", "add", "3", "equals", "add", "4", "equals");
    expect(s.expression).toBe("9");
    expect(s.lastEquation).toBe("5 + 4 = 9");
  });

  it("clear resets the expression but keeps ans and angle mode", () => {
    let s = press("2", "add", "3", "equals");
    s = pressScientificKey(s, "toggleAngle");
    s = pressScientificKey(s, "clear");
    expect(s.expression).toBe("");
    expect(s.ans).toBe("5");
    expect(s.angleMode).toBe("rad");
    expect(s.lastEquation).toBeNull();
    expect(s.error).toBeNull();
  });

  it("Ans chains the previous result: 2+3=, Ans×4= → 20", () => {
    const s = press("2", "add", "3", "equals", "ans", "multiply", "4", "equals");
    expect(s.expression).toBe("20");
    expect(s.ans).toBe("20");
    expect(s.lastEquation).toBe("Ans × 4 = 20");
  });
});

describe("pressScientificKey — errors and recovery", () => {
  it("a failed equals keeps the expression and sets the error", () => {
    const s = press("5", "divide", "0", "equals");
    expect(s.error).toBe(DIVIDE_BY_ZERO);
    expect(s.expression).toBe("5÷0");
    expect(s.justCommitted).toBe(false);
    expect(s.ans).toBe("0");
  });

  it("backspace after a failed equals clears the error and edits the token", () => {
    let s = press("5", "divide", "0", "equals");
    s = pressScientificKey(s, "backspace");
    expect(s.error).toBeNull();
    expect(s.expression).toBe("5÷");
  });

  it("the next primary key after a failed equals starts fresh", () => {
    let s = press("5", "divide", "0", "equals");
    s = pressScientificKey(s, "7");
    expect(s.expression).toBe("7");
    expect(s.error).toBeNull();
  });
});

describe("pressScientificKey — backspace removes whole tokens", () => {
  it("removes a function token in one press", () => {
    expect(press("sin").expression).toBe("sin(");
    expect(press("sin", "backspace").expression).toBe("");
  });

  it("removes Ans as one token", () => {
    expect(press("ans", "backspace").expression).toBe("");
    expect(press("1", "add", "ans", "backspace").expression).toBe("1+");
  });

  it("removes digits one at a time", () => {
    expect(press("1", "2", "backspace").expression).toBe("1");
  });

  it("removes superscript operators whole", () => {
    expect(press("5", "reciprocal", "backspace").expression).toBe("5");
    expect(press("5", "square", "backspace").expression).toBe("5");
  });

  it("backspace on an empty expression returns the same reference", () => {
    const s = createScientificState();
    expect(pressScientificKey(s, "backspace")).toBe(s);
  });
});

describe("pressScientificKey — angle mode, caps and purity", () => {
  it("toggleAngle flips deg → rad → deg", () => {
    let s = createScientificState();
    s = pressScientificKey(s, "toggleAngle");
    expect(s.angleMode).toBe("rad");
    s = pressScientificKey(s, "toggleAngle");
    expect(s.angleMode).toBe("deg");
  });

  it("the angle mode reaches the evaluator", () => {
    const inDeg = press("sin", "1", "8", "0", "rparen", "equals");
    expect(inDeg.expression).toBe("0");
    const inRad = press("sin", "1", "8", "0", "rparen", "toggleAngle", "equals");
    expect(inRad.expression).toBe("-0.8011526357");
  });

  it("ignores keys past MAX_EXPRESSION_LENGTH (same reference)", () => {
    const s: ScientificState = {
      ...createScientificState(),
      expression: "9".repeat(MAX_EXPRESSION_LENGTH),
    };
    expect(pressScientificKey(s, "1")).toBe(s);
  });

  it("never mutates the incoming state", () => {
    const s = press("2", "add", "3");
    const snapshot = JSON.stringify(s);
    pressScientificKey(s, "equals");
    pressScientificKey(s, "clear");
    pressScientificKey(s, "backspace");
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});

// ════════════════════════════════════════════════════════════
// Keypad and keyboard maps
// ════════════════════════════════════════════════════════════

describe("keypad and keyboard maps", () => {
  const allKeys = SCIENTIFIC_KEYPAD.flat();

  it("SCIENTIFIC_KEYPAD is a 7×5 grid of 35 unique keys", () => {
    expect(SCIENTIFIC_KEYPAD).toHaveLength(7);
    for (const row of SCIENTIFIC_KEYPAD) expect(row).toHaveLength(5);
    expect(new Set(allKeys).size).toBe(35);
  });

  it("every keypad key has an accessible label, and vice versa", () => {
    expect(Object.keys(KEY_LABELS).sort()).toEqual([...allKeys].sort());
    for (const key of allKeys) expect(KEY_LABELS[key]).toBeTruthy();
  });

  it("every KEYBOARD_MAP target is a real key", () => {
    const valid = new Set<ScientificKey>(allKeys);
    for (const key of Object.values(KEYBOARD_MAP)) expect(valid.has(key)).toBe(true);
  });

  it("maps the obvious keyboard shortcuts", () => {
    expect(KEYBOARD_MAP.Enter).toBe("equals");
    expect(KEYBOARD_MAP["="]).toBe("equals");
    expect(KEYBOARD_MAP.Backspace).toBe("backspace");
    expect(KEYBOARD_MAP.Escape).toBe("clear");
    expect(KEYBOARD_MAP["^"]).toBe("power");
    expect(KEYBOARD_MAP["*"]).toBe("multiply");
    expect(KEYBOARD_MAP.s).toBe("sin");
    expect(KEYBOARD_MAP.n).toBe("ln");
    expect(KEYBOARD_MAP.p).toBe("pi");
  });
});
