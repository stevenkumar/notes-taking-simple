/**
 * Basic Calculator – calculation engine.
 *
 * A pure state-machine reducer instead of a form/result pair:
 * pressKey(state, key) returns the next state and never mutates its input,
 * so the UI is just useState<BasicState> + keypad/keyboard events.
 *
 * Semantics (standard pocket-calculator behaviour):
 *   - Left-to-right evaluation, NO precedence: 2 + 3 × 4 = 20.
 *   - Pressing an operator evaluates the pending pair first (chaining),
 *     so 10 + 5 − 3 = computes 15 then 12.
 *   - "=" repeats the last operation when pressed again (5 + 3 = → 8, = → 11).
 *   - Pressing "=" right after an operator squares the operation through the
 *     visible operand (2 + = → 4).
 *   - "%" converts the display: with +/− pending it is percent OF the
 *     accumulator (200 + 10% → 20, then = gives 220); with ×/÷ pending or
 *     standalone it divides by 100 (50% → 0.5, 200 × 10% → 0.1).
 *   - Division by zero sets an error; digits, AC and backspace recover,
 *     every other key is ignored until then.
 *
 * Arithmetic uses decimal.js per PRD §14 — 0.1 + 0.2 = 0.3, never float
 * noise. Computed results keep 10 decimal places (half-up) with trailing
 * zeros stripped; typed input is capped at MAX_DIGITS digits. No eval.
 */

import Decimal from "decimal.js";

// Shared config — idempotent with the other engines' call.
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

// ── Types ────────────────────────────────────────────────────

export type BasicOperator = "add" | "subtract" | "multiply" | "divide";

export type BasicKey =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "."
  | "add" | "subtract" | "multiply" | "divide"
  | "equals" | "percent" | "sign" | "clear" | "backspace";

export interface BasicState {
  /** Current value as a raw string, e.g. "12.5", "-3", "0.". */
  display: string;
  /** Small equation line above the value: "200 +" or "200 + 100 =". */
  expression: string | null;
  /** Left operand committed when an operator was pressed. */
  accumulator: string | null;
  /** Operator waiting for its right operand. */
  pendingOp: BasicOperator | null;
  /** The next digit starts a fresh display (after an operator or "="). */
  awaitingOperand: boolean;
  /** Last completed operation, so "=" can repeat it. */
  lastOp: { op: BasicOperator; operand: string } | null;
  /** Error message (division by zero); null while healthy. */
  error: string | null;
}

// ── Constants ────────────────────────────────────────────────

/** Maximum digits a user may type into the display (sign/dot excluded). */
export const MAX_DIGITS = 12;

/** Decimal places kept on computed results (half-up). */
const RESULT_FRACTION_DIGITS = 10;

export const DIVIDE_BY_ZERO = "Cannot divide by zero";

export const OPERATOR_SYMBOLS: Record<BasicOperator, string> = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
};

/** Accessible name for every key. */
export const KEY_LABELS: Record<BasicKey, string> = {
  "0": "0", "1": "1", "2": "2", "3": "3", "4": "4",
  "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
  ".": "Decimal point",
  add: "Plus",
  subtract: "Minus",
  multiply: "Multiply",
  divide: "Divide",
  equals: "Equals",
  percent: "Percent",
  sign: "Toggle sign",
  clear: "All clear",
  backspace: "Backspace",
};

/** 4×5 keypad layout, row by row. */
export const KEYPAD_LAYOUT: BasicKey[][] = [
  ["clear", "backspace", "percent", "divide"],
  ["7", "8", "9", "multiply"],
  ["4", "5", "6", "subtract"],
  ["1", "2", "3", "add"],
  ["sign", "0", ".", "equals"],
];

/** Keyboard event.key → key. */
export const KEYBOARD_MAP: Record<string, BasicKey> = {
  "0": "0", "1": "1", "2": "2", "3": "3", "4": "4",
  "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
  ".": ".", ",": ".",
  "+": "add",
  "-": "subtract",
  "*": "multiply",
  x: "multiply",
  X: "multiply",
  "/": "divide",
  Enter: "equals",
  "=": "equals",
  "%": "percent",
  Backspace: "backspace",
  Escape: "clear",
  Delete: "clear",
};

// ── Helpers ──────────────────────────────────────────────────

function dec(value: string): Decimal {
  return new Decimal(value);
}

/** Round a computed result to 10dp half-up and strip trailing zeros. */
function normalizeResult(value: Decimal): string {
  const rounded = value.toDecimalPlaces(RESULT_FRACTION_DIGITS, Decimal.ROUND_HALF_UP);
  let s = rounded.toFixed(); // normal notation, never exponent
  if (s.includes(".")) {
    s = s.replace(/0+$/, "").replace(/\.$/, "");
  }
  return s === "-0" ? "0" : s;
}

function digitCount(display: string): number {
  const matches = display.match(/\d/g);
  return matches ? matches.length : 0;
}

type OpResult = { ok: true; value: string } | { ok: false; error: string };

function applyOp(op: BasicOperator, left: string, right: string): OpResult {
  const a = dec(left);
  const b = dec(right);
  let result: Decimal;
  switch (op) {
    case "add":
      result = a.plus(b);
      break;
    case "subtract":
      result = a.minus(b);
      break;
    case "multiply":
      result = a.times(b);
      break;
    case "divide":
      if (b.isZero()) return { ok: false, error: DIVIDE_BY_ZERO };
      result = a.div(b);
      break;
  }
  return { ok: true, value: normalizeResult(result) };
}

// ── Initial state ────────────────────────────────────────────

export function createBasicState(): BasicState {
  return {
    display: "0",
    expression: null,
    accumulator: null,
    pendingOp: null,
    awaitingOperand: false,
    lastOp: null,
    error: null,
  };
}

function errorState(state: BasicState, message: string): BasicState {
  return {
    ...state,
    error: message,
    accumulator: null,
    pendingOp: null,
    awaitingOperand: true,
    lastOp: null,
  };
}

// ── Reducer ──────────────────────────────────────────────────

/** Pure: returns the next state; ignored keys return the input unchanged. */
export function pressKey(state: BasicState, key: BasicKey): BasicState {
  switch (key) {
    case "0":
    case "1":
    case "2":
    case "3":
    case "4":
    case "5":
    case "6":
    case "7":
    case "8":
    case "9":
      return pressDigit(state, key);
    case ".":
      return pressDecimal(state);
    case "add":
    case "subtract":
    case "multiply":
    case "divide":
      return pressOperator(state, key);
    case "equals":
      return pressEquals(state);
    case "percent":
      return pressPercent(state);
    case "sign":
      return pressSign(state);
    case "clear":
      return createBasicState();
    case "backspace":
      return pressBackspace(state);
  }
}

function pressDigit(state: BasicState, digit: string): BasicState {
  // Any digit starts a fresh calculation after an error.
  if (state.error) {
    return { ...createBasicState(), display: digit };
  }

  if (state.awaitingOperand) {
    if (!state.pendingOp) {
      // A fresh number after "=" — drop the finished equation line.
      return {
        ...state,
        display: digit,
        expression: null,
        awaitingOperand: false,
        lastOp: null,
      };
    }
    // First digit of the right operand.
    return { ...state, display: digit, awaitingOperand: false };
  }

  if (digitCount(state.display) >= MAX_DIGITS) return state;
  const display = state.display === "0" ? digit : state.display + digit;
  return { ...state, display };
}

function pressDecimal(state: BasicState): BasicState {
  if (state.error) return { ...createBasicState(), display: "0." };

  if (state.awaitingOperand) {
    const next: BasicState = { ...state, display: "0.", awaitingOperand: false };
    if (!state.pendingOp) return { ...next, expression: null, lastOp: null };
    return next;
  }

  if (state.display.includes(".")) return state;
  return { ...state, display: `${state.display}.` };
}

function pressOperator(state: BasicState, op: BasicOperator): BasicState {
  if (state.error) return state;
  const symbol = OPERATOR_SYMBOLS[op];

  // A pair is pending and typed — evaluate it first (left-to-right chain).
  if (state.pendingOp && !state.awaitingOperand) {
    const left = state.accumulator ?? state.display;
    const result = applyOp(state.pendingOp, left, state.display);
    if (!result.ok) return errorState(state, result.error);
    return {
      ...state,
      display: result.value,
      expression: `${result.value} ${symbol}`,
      accumulator: result.value,
      pendingOp: op,
      awaitingOperand: true,
    };
  }

  // Repeated operator swaps it instead of computing (2 + × → 2 ×).
  if (state.pendingOp && state.awaitingOperand) {
    const left = state.accumulator ?? state.display;
    return {
      ...state,
      expression: `${left} ${symbol}`,
      pendingOp: op,
    };
  }

  // No pending operation — commit the display as the left operand.
  return {
    ...state,
    expression: `${state.display} ${symbol}`,
    accumulator: state.display,
    pendingOp: op,
    awaitingOperand: true,
  };
}

function pressEquals(state: BasicState): BasicState {
  if (state.error) return state;

  if (state.pendingOp) {
    const left = state.accumulator ?? state.display;
    const right = state.display;
    const result = applyOp(state.pendingOp, left, right);
    if (!result.ok) return errorState(state, result.error);
    return {
      display: result.value,
      expression: `${left} ${OPERATOR_SYMBOLS[state.pendingOp]} ${right} =`,
      accumulator: null,
      pendingOp: null,
      awaitingOperand: true,
      lastOp: { op: state.pendingOp, operand: right },
      error: null,
    };
  }

  // Repeat the last completed operation (= = = chains: 5 + 3 = → 8, 11, 14).
  if (state.lastOp) {
    const result = applyOp(state.lastOp.op, state.display, state.lastOp.operand);
    if (!result.ok) return errorState(state, result.error);
    return {
      ...state,
      display: result.value,
      expression: `${state.display} ${OPERATOR_SYMBOLS[state.lastOp.op]} ${state.lastOp.operand} =`,
      awaitingOperand: true,
      error: null,
    };
  }

  // Nothing pending and nothing to repeat — "=" is a no-op.
  return state;
}

function pressPercent(state: BasicState): BasicState {
  if (state.error) return state;

  const value = dec(state.display);
  let converted: Decimal;
  if (state.pendingOp === "add" || state.pendingOp === "subtract") {
    // Percent of the accumulator: 200 + 10% → 20.
    const base = dec(state.accumulator ?? state.display);
    converted = base.times(value).div(100);
  } else {
    // Standalone or ×/÷: 50% → 0.5.
    converted = value.div(100);
  }

  return {
    ...state,
    display: normalizeResult(converted),
    awaitingOperand: false,
  };
}

function pressSign(state: BasicState): BasicState {
  if (state.error) return state;
  if (state.display === "0") return state;

  const display = state.display.startsWith("-")
    ? state.display.slice(1)
    : `-${state.display}`;
  return { ...state, display, awaitingOperand: false };
}

function pressBackspace(state: BasicState): BasicState {
  // Backspace clears an error, like a soft AC.
  if (state.error) return createBasicState();
  // Nothing typed for the pending operator yet — nothing to delete.
  if (state.awaitingOperand && state.pendingOp) return state;

  const trimmed = state.display.slice(0, -1);
  const display = trimmed === "" || trimmed === "-" ? "0" : trimmed;
  return { ...state, display, awaitingOperand: false };
}
