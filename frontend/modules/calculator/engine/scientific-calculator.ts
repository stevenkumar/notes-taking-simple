/**
 * Scientific Calculator – calculation engine.
 *
 * Two layers, both pure:
 *
 *   1. evaluateExpression(src, opts) — a hand-written tokenizer +
 *      recursive-descent parser (NO eval, per PRD). Grammar supports
 *      precedence, parentheses, right-associative ^, postfix ! % ² ⁻¹,
 *      functions sin cos tan log ln √, constants π e Ans, implicit
 *      multiplication (2π, 2(3+4)) and unbalanced trailing parens
 *      ("sin(45" auto-closes at evaluation time).
 *
 *   2. pressScientificKey(state, key) — a state-machine reducer that
 *      folds keypad/keyboard presses into the expression string, like
 *      the basic calculator's reducer.
 *
 * Arithmetic (+ − × ÷ ^ √ n!) runs on decimal.js (PRD §14): 0.1 + 0.2
 * = 0.3, 2^10 exact. Transcendentals (sin/cos/tan/log/ln) have no
 * decimal.js implementation, so they run through Math and are rounded
 * back to 10 decimal places half-up — which cleans the float noise
 * (sin 30° = 0.49999999999999994 → 0.5, log 1000 → 3).
 *
 * Angle mode (degrees / radians) applies to sin/cos/tan inputs.
 * Division by zero, log of non-positives, √ of negatives, factorial of
 * non-integers and wildly large exponents all return a CalculationError
 * — never throw, never eval.
 */

import Decimal from "decimal.js";
import type { CalculationError, CalculationResult } from "../types";

// Shared config — idempotent with the other engines' call.
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

// ── Types ────────────────────────────────────────────────────

export type AngleMode = "deg" | "rad";

export interface ScientificState {
  /** The expression being typed (after "=" it holds the result string). */
  expression: string;
  /** True right after a successful "=" — next primary key starts fresh. */
  justCommitted: boolean;
  /** Pretty equation for the display line, e.g. "2 + 3 = 5". */
  lastEquation: string | null;
  /** Last committed result; what the Ans key inserts. */
  ans: string;
  angleMode: AngleMode;
  /** Error from the last "=" press; null while healthy. */
  error: string | null;
}

// ── Constants ────────────────────────────────────────────────

/** Decimal places kept on evaluated results (half-up). */
const RESULT_FRACTION_DIGITS = 10;

/** Typing cap so a runaway expression cannot hang the parser. */
export const MAX_EXPRESSION_LENGTH = 200;

/** Largest |exponent| accepted for ^ (avoids pathological pow work). */
const MAX_EXPONENT = 10000;

/** Largest argument accepted for n!. */
const MAX_FACTORIAL = 500;

/** tan ≥ this magnitude is treated as the vertical asymptote (undefined). */
const TAN_UNCERTAIN = new Decimal("1e12");

export const DIVIDE_BY_ZERO = "Cannot divide by zero";

/** π and e to well beyond the shared 40-digit precision. */
const PI = new Decimal("3.14159265358979323846264338327950288419716939937510");
const EULER = new Decimal("2.71828182845904523536028747135266249775724709369995");

/** Every keypad/keyboard key the reducer understands. */
export type ScientificKey =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "."
  | "add" | "subtract" | "multiply" | "divide" | "power"
  | "equals" | "clear" | "backspace"
  | "lparen" | "rparen" | "percent" | "factorial" | "square" | "reciprocal"
  | "sin" | "cos" | "tan" | "log" | "ln" | "sqrt"
  | "pi" | "e" | "ans"
  | "toggleAngle";

/** Text each data key inserts (action keys are handled separately). */
const INSERT: Partial<Record<ScientificKey, string>> = {
  "0": "0", "1": "1", "2": "2", "3": "3", "4": "4",
  "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
  ".": ".",
  add: "+", subtract: "−", multiply: "×", divide: "÷", power: "^",
  lparen: "(", rparen: ")", percent: "%", factorial: "!",
  square: "²", reciprocal: "⁻¹",
  sin: "sin(", cos: "cos(", tan: "tan(", log: "log(", ln: "ln(",
  sqrt: "√(",
  pi: "π", e: "e", ans: "Ans",
};

/** Keys whose text starts a fresh primary (replace after "="). */
const STARTS_PRIMARY = /^(?:\d|\.|sin\(|cos\(|tan\(|log\(|ln\(|√\(|π|e|Ans|\()/;

/** Longest-suffix first so backspace removes whole tokens. */
const TOKEN_SUFFIXES = [
  "sin(", "cos(", "tan(", "log(", "ln(", "√(",
  "Ans", "⁻¹", "²", "!", "%", "×", "÷", "−", "+", "^", "(", ")",
];

/** Human labels for accessible key names. */
export const KEY_LABELS: Record<ScientificKey, string> = {
  "0": "0", "1": "1", "2": "2", "3": "3", "4": "4",
  "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
  ".": "Decimal point",
  add: "Plus", subtract: "Minus", multiply: "Multiply", divide: "Divide",
  power: "Power of",
  equals: "Equals", clear: "All clear", backspace: "Backspace",
  lparen: "Open parenthesis", rparen: "Close parenthesis",
  percent: "Percent", factorial: "Factorial", square: "Square",
  reciprocal: "Reciprocal",
  sin: "Sine", cos: "Cosine", tan: "Tangent",
  log: "Log base 10", ln: "Natural log", sqrt: "Square root",
  pi: "Pi", e: "Euler's number", ans: "Answer",
  toggleAngle: "Switch angle mode",
};

/** 5 × 7 keypad, row by row. */
export const SCIENTIFIC_KEYPAD: ScientificKey[][] = [
  ["clear", "backspace", "lparen", "rparen", "equals"],
  ["sin", "cos", "tan", "log", "ln"],
  ["7", "8", "9", "divide", "power"],
  ["4", "5", "6", "multiply", "sqrt"],
  ["1", "2", "3", "subtract", "square"],
  ["0", ".", "pi", "add", "e"],
  ["factorial", "percent", "reciprocal", "ans", "toggleAngle"],
];

/** Keyboard event.key → key. */
export const KEYBOARD_MAP: Record<string, ScientificKey> = {
  "0": "0", "1": "1", "2": "2", "3": "3", "4": "4",
  "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
  ".": ".", ",": ".",
  "+": "add", "-": "subtract", "*": "multiply", "/": "divide",
  "^": "power", "(": "lparen", ")": "rparen", "%": "percent", "!": "factorial",
  Enter: "equals", "=": "equals",
  Backspace: "backspace", Escape: "clear", Delete: "clear",
  s: "sin", c: "cos", t: "tan", l: "log", n: "ln",
  r: "sqrt", p: "pi", e: "e", a: "ans",
};

// ── Value helpers ────────────────────────────────────────────

function dec(value: number | string | Decimal): Decimal {
  if (value instanceof Decimal) return value;
  return new Decimal(typeof value === "number" ? String(value) : value);
}

/** Round to 10dp half-up and strip trailing zeros; normal notation. */
function normalizeResult(value: Decimal): string {
  if (!value.isFinite()) throw new ExprError("Result is undefined");
  const rounded = value.toDecimalPlaces(RESULT_FRACTION_DIGITS, Decimal.ROUND_HALF_UP);
  // ≥ 1e15 switches to scientific notation so 500! doesn't render a
  // thousand-digit string into the display (e = exponent of leading digit).
  if (!rounded.isZero() && rounded.e >= 15) return rounded.toExponential(9);
  let s = rounded.toFixed(); // normal notation, never exponent
  if (s.includes(".")) {
    s = s.replace(/0+$/, "").replace(/\.$/, "");
  }
  return s === "-0" ? "0" : s;
}

/** Round a transcendental (float) result back onto the decimal grid. */
function fromFloat(value: number): Decimal {
  if (!Number.isFinite(value)) throw new ExprError("Result is undefined");
  return new Decimal(String(value)).toDecimalPlaces(
    RESULT_FRACTION_DIGITS,
    Decimal.ROUND_HALF_UP,
  );
}

/**
 * Insert spaces around binary operators for display: "2+3×sin(45)" →
 * "2 + 3 × sin(45)". A unary minus stays glued to its operand
 * ("−5÷2" → "−5 ÷ 2", "2×−3" → "2 × −3").
 */
export function prettyExpression(src: string): string {
  let out = "";
  let prev = ""; // last non-space character emitted
  for (const ch of src) {
    if (ch === " ") continue;
    if ("+−×÷^".includes(ch)) {
      const unary = ch === "−" && (prev === "" || "+−×÷^(".includes(prev));
      if (!unary) out += " ";
      out += ch;
      if (!unary) out += " ";
    } else {
      out += ch;
    }
    prev = ch;
  }
  return out;
}

function fail(message: string, field?: string): CalculationError {
  return field
    ? { ok: false, error: message, fieldErrors: { [field]: message } }
    : { ok: false, error: message };
}

/** Internal parse failure — caught by evaluateExpression, never escapes. */
class ExprError extends Error {}

// ── Tokenizer ────────────────────────────────────────────────

type Token =
  | { t: "num"; v: string }
  | { t: "op"; v: "+" | "−" | "×" | "÷" | "^" | "(" | ")" | "!" | "%" | "²" | "⁻¹" }
  | { t: "fn"; v: "sin" | "cos" | "tan" | "log" | "ln" | "√" }
  | { t: "const"; v: "π" | "e" | "Ans" };

/** Word-like tokens, longest first so "log" wins before any prefix. */
const WORDS = ["sin", "cos", "tan", "log", "Ans", "ln", "√", "π", "e"] as const;

const NUMBER_RE = /^(?:\d+(?:\.\d*)?|\.\d+)/;

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < src.length) {
    const c = src[i];

    // Numbers (accepts ascii operators, canonicalises to glyphs)
    if ((c >= "0" && c <= "9") || c === ".") {
      const m = src.slice(i).match(NUMBER_RE);
      if (!m || m[0] === ".") throw new ExprError("Invalid number");
      const after = src[i + m[0].length];
      // "2.3.4" / "2..3" — a digit or dot may not directly follow a number.
      if (after !== undefined && (after === "." || (after >= "0" && after <= "9"))) {
        throw new ExprError("Invalid number");
      }
      tokens.push({ t: "num", v: m[0] });
      i += m[0].length;
      continue;
    }

    // Words: functions and constants
    const word = WORDS.find((w) => src.startsWith(w, i));
    if (word) {
      if (word === "sin" || word === "cos" || word === "tan" || word === "log" || word === "ln" || word === "√") {
        tokens.push({ t: "fn", v: word });
      } else {
        tokens.push({ t: "const", v: word });
      }
      i += word.length;
      continue;
    }

    // Reciprocal superscript (two chars, before any single-char check)
    if (src.startsWith("⁻¹", i)) {
      tokens.push({ t: "op", v: "⁻¹" });
      i += 2;
      continue;
    }

    // Operators (ascii aliases canonicalised)
    const opMap: Record<string, Token & { t: "op" }> = {
      "+": { t: "op", v: "+" },
      "-": { t: "op", v: "−" },
      "−": { t: "op", v: "−" },
      "*": { t: "op", v: "×" },
      "×": { t: "op", v: "×" },
      "/": { t: "op", v: "÷" },
      "÷": { t: "op", v: "÷" },
      "^": { t: "op", v: "^" },
      "(": { t: "op", v: "(" },
      ")": { t: "op", v: ")" },
      "!": { t: "op", v: "!" },
      "%": { t: "op", v: "%" },
      "²": { t: "op", v: "²" },
    };
    const op = opMap[c];
    if (op) {
      tokens.push(op);
      i += 1;
      continue;
    }

    throw new ExprError(`Unexpected character "${c}"`);
  }

  return tokens;
}
// ── Factorial ───────────────────────────────────────────────

/** n! for whole numbers 0…MAX_FACTORIAL; anything else is an error. */
function factorial(value: Decimal): Decimal {
  if (!value.isInteger()) throw new ExprError("Factorial needs a whole number");
  if (value.isNegative()) throw new ExprError("Factorial is not defined for negative numbers");
  if (value.gt(MAX_FACTORIAL)) throw new ExprError(`Factorial is limited to ${MAX_FACTORIAL}`);
  let acc = new Decimal(1);
  for (let i = 2; i <= value.toNumber(); i++) acc = acc.times(i);
  return acc;
}

// ── Parser (recursive descent — NO eval) ────────────────────
//
//   expr    := term (('+' | '−') term)*
//   term    := unary (('×' | '÷') unary | implicit)*
//   unary   := ('−' | '+') unary | power
//   power   := postfix ('^' unary)?            // right-associative
//   postfix := primary ('!' | '%' | '²' | '⁻¹')*
//   primary := number | 'π' | 'e' | 'Ans' | '(' expr ')'
//            | func ('(' expr ')' | postfix)
//
// term also multiplies implicitly when the next token starts a primary,
// so 2π and 2(3+4) parse as products. Percent is postfix divide-by-100
// (200 × 50% = 100), matching the basic calculator's plain reading.

class Parser {
  private i = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly ctx: { angleMode: AngleMode; ans: Decimal },
  ) {}

  /** Parse the whole stream; leftover tokens ("2)") are an error. */
  parse(): Decimal {
    const value = this.parseExpr();
    if (this.i < this.tokens.length) throw new ExprError("Unexpected token");
    return value;
  }

  private peek(): Token | undefined {
    return this.tokens[this.i];
  }

  private take(): Token | undefined {
    return this.tokens[this.i++];
  }

  private isOp(token: Token | undefined, value: string): boolean {
    return token !== undefined && token.t === "op" && token.v === value;
  }

  /** Can this token begin a primary value? (drives implicit multiplication) */
  private startsPrimary(token: Token | undefined): boolean {
    if (!token) return false;
    return token.t === "num" || token.t === "fn" || token.t === "const" || this.isOp(token, "(");
  }

  private parseExpr(): Decimal {
    let left = this.parseTerm();
    for (;;) {
      if (this.isOp(this.peek(), "+")) {
        this.i++;
        left = left.plus(this.parseTerm());
      } else if (this.isOp(this.peek(), "−")) {
        this.i++;
        left = left.minus(this.parseTerm());
      } else {
        return left;
      }
    }
  }

  private parseTerm(): Decimal {
    let left = this.parseUnary();
    for (;;) {
      const next = this.peek();
      if (this.isOp(next, "×")) {
        this.i++;
        left = left.times(this.parseUnary());
      } else if (this.isOp(next, "÷")) {
        this.i++;
        const right = this.parseUnary();
        if (right.isZero()) throw new ExprError(DIVIDE_BY_ZERO);
        left = left.div(right);
      } else if (this.startsPrimary(next)) {
        // Implicit multiplication: 2π, 2(3+4), 3 sin(45)
        left = left.times(this.parseUnary());
      } else {
        return left;
      }
    }
  }

  private parseUnary(): Decimal {
    if (this.isOp(this.peek(), "−")) {
      this.i++;
      return this.parseUnary().negated();
    }
    if (this.isOp(this.peek(), "+")) {
      this.i++;
      return this.parseUnary();
    }
    return this.parsePower();
  }

  private parsePower(): Decimal {
    const base = this.parsePostfix();
    if (!this.isOp(this.peek(), "^")) return base;
    this.i++;
    const exponent = this.parseUnary();
    if (exponent.abs().gt(MAX_EXPONENT)) throw new ExprError("Exponent is too large");
    if (base.isNegative() && !exponent.isInteger()) {
      throw new ExprError("A negative base needs a whole-number exponent");
    }
    const result = base.pow(exponent);
    if (!result.isFinite()) {
      if (base.isZero()) throw new ExprError(DIVIDE_BY_ZERO);
      throw new ExprError("Result is undefined");
    }
    return result;
  }

  private parsePostfix(): Decimal {
    let value = this.parsePrimary();
    for (;;) {
      const next = this.peek();
      if (this.isOp(next, "!")) {
        this.i++;
        value = factorial(value);
      } else if (this.isOp(next, "%")) {
        this.i++;
        value = value.div(100);
      } else if (this.isOp(next, "²")) {
        this.i++;
        value = value.times(value);
      } else if (this.isOp(next, "⁻¹")) {
        this.i++;
        if (value.isZero()) throw new ExprError(DIVIDE_BY_ZERO);
        value = new Decimal(1).div(value);
      } else {
        return value;
      }
    }
  }

  private parsePrimary(): Decimal {
    const token = this.take();
    if (!token) throw new ExprError("Unexpected end of expression");
    if (token.t === "num") return dec(token.v);
    if (token.t === "const") {
      if (token.v === "π") return PI;
      if (token.v === "e") return EULER;
      return this.ctx.ans;
    }
    if (this.isOp(token, "(")) {
      const value = this.parseExpr();
      if (!this.isOp(this.take(), ")")) throw new ExprError("Missing closing parenthesis");
      return value;
    }
    if (token.t === "fn") return this.parseFunction(token.v);
    throw new ExprError("Unexpected token");
  }

  private parseFunction(name: "sin" | "cos" | "tan" | "log" | "ln" | "√"): Decimal {
    if (this.isOp(this.peek(), "(")) {
      this.i++;
      const value = this.parseExpr();
      if (!this.isOp(this.take(), ")")) throw new ExprError("Missing closing parenthesis");
      return this.applyFunction(name, value);
    }
    // Bare operand: "sin 45" → sin(45)
    return this.applyFunction(name, this.parsePostfix());
  }

  /** Degrees → radians on the Decimal grid before handing to Math. */
  private radians(value: Decimal): number {
    const radians = this.ctx.angleMode === "deg" ? value.times(PI).div(180) : value;
    return radians.toNumber();
  }

  private applyFunction(name: "sin" | "cos" | "tan" | "log" | "ln" | "√", value: Decimal): Decimal {
    switch (name) {
      case "√":
        if (value.isNegative()) {
          throw new ExprError("Cannot take the square root of a negative number");
        }
        return value.sqrt();
      case "log":
        if (value.lte(0)) throw new ExprError("Logarithm needs a positive number");
        return fromFloat(Math.log10(value.toNumber()));
      case "ln":
        if (value.lte(0)) throw new ExprError("Natural logarithm needs a positive number");
        return fromFloat(Math.log(value.toNumber()));
      case "sin":
        return fromFloat(Math.sin(this.radians(value)));
      case "cos":
        return fromFloat(Math.cos(this.radians(value)));
      case "tan": {
        const tan = Math.tan(this.radians(value));
        if (Math.abs(tan) >= TAN_UNCERTAIN.toNumber()) {
          throw new ExprError("Tan is undefined at this angle");
        }
        return fromFloat(tan);
      }
    }
  }
}

// ── Public evaluation entry point ───────────────────────────

export interface EvaluateOptions {
  angleMode: AngleMode;
  /** Previous result the Ans key refers to ("0" before any "="). */
  ans: string;
}

/**
 * Tokenize, parse and evaluate `src`. Unclosed trailing parentheses are
 * auto-closed first ("sin(45" → "sin(45)") so the display can show what
 * the user typed; every other imbalance is an error.
 */
export function evaluateExpression(
  src: string,
  options: EvaluateOptions,
): CalculationResult<string> {
  const trimmed = src.trim();
  if (!trimmed) return fail("Enter an expression to evaluate");

  let open = 0;
  let close = 0;
  for (const ch of trimmed) {
    if (ch === "(") open++;
    else if (ch === ")") close++;
  }
  const source = open > close ? trimmed + ")".repeat(open - close) : trimmed;

  try {
    const tokens = tokenize(source);
    const parser = new Parser(tokens, {
      angleMode: options.angleMode,
      ans: dec(options.ans || "0"),
    });
    return { ok: true, data: normalizeResult(parser.parse()) };
  } catch (err) {
    if (err instanceof ExprError) return fail(err.message);
    return fail("Invalid expression");
  }
}
// ── State machine ───────────────────────────────────────────

/** Fresh calculator state: empty expression, degrees, Ans = 0. */
export function createScientificState(): ScientificState {
  return {
    expression: "",
    justCommitted: false,
    lastEquation: null,
    ans: "0",
    angleMode: "deg",
    error: null,
  };
}

/** Remove the last whole token — "sin(" is one press, not four characters. */
function removeLastToken(expression: string): string {
  for (const suffix of TOKEN_SUFFIXES) {
    if (expression.endsWith(suffix)) return expression.slice(0, -suffix.length);
  }
  return expression.slice(0, -1);
}

/**
 * Fold one keypad/keyboard press into the state. Pure: the incoming
 * state is never mutated, and an over-length expression returns the
 * SAME reference so React can skip the re-render.
 */
export function pressScientificKey(state: ScientificState, key: ScientificKey): ScientificState {
  if (key === "clear") {
    // Keeps ans and angle mode — only the working expression resets.
    return { ...state, expression: "", justCommitted: false, lastEquation: null, error: null };
  }

  if (key === "toggleAngle") {
    return { ...state, angleMode: state.angleMode === "deg" ? "rad" : "deg" };
  }

  if (key === "backspace") {
    if (!state.expression) return state.error ? { ...state, error: null } : state;
    return {
      ...state,
      expression: removeLastToken(state.expression),
      justCommitted: false,
      error: null,
    };
  }

  if (key === "equals") {
    // "=" right after a result is a no-op; "=" on nothing does nothing.
    if (state.justCommitted || !state.expression) return state;
    const evaluated = evaluateExpression(state.expression, {
      angleMode: state.angleMode,
      ans: state.ans,
    });
    if (!evaluated.ok) return { ...state, error: evaluated.error, justCommitted: false };
    return {
      ...state,
      expression: evaluated.data,
      justCommitted: true,
      lastEquation: `${prettyExpression(state.expression)} = ${evaluated.data}`,
      ans: evaluated.data,
      error: null,
    };
  }

  const text = INSERT[key];
  if (!text) return state;

  let expression = state.expression;
  if (state.justCommitted) {
    // A primary (digit, constant, function, parenthesis) starts a brand
    // new calculation; an operator continues from the result.
    expression = STARTS_PRIMARY.test(text) ? "" : expression;
  } else if (state.error && STARTS_PRIMARY.test(text)) {
    // Recover from a failed evaluation: the next primary starts fresh.
    expression = "";
  }

  if (expression.length + text.length > MAX_EXPRESSION_LENGTH) return state;

  return {
    ...state,
    expression: expression + text,
    justCommitted: false,
    error: null,
  };
}
