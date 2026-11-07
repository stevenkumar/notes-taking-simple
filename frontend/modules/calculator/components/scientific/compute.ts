/**
 * Maps the scientific calculator's engine state onto the shared
 * ComputeState contract.
 *
 * Mid-typing expressions that don't parse yet stay "incomplete" — an
 * error only surfaces after "=" is pressed (the engine records it in
 * state.error). Everything that does parse shows a live preview, so the
 * result updates as the user types.
 */

import {
  evaluateExpression,
  prettyExpression,
  type AngleMode,
  type ScientificState,
} from "../../engine/scientific-calculator";
import type { ComputeState } from "../shared/result-types";

const ANGLE_LABELS: Record<AngleMode, string> = {
  deg: "Degrees",
  rad: "Radians",
};

export function deriveScientificState(state: ScientificState): ComputeState {
  // A failed "=" is the only real error — parser noise while typing is not.
  if (state.error) return { state: "error", message: state.error };
  if (!state.expression) return { state: "incomplete" };

  const preview = evaluateExpression(state.expression, {
    angleMode: state.angleMode,
    ans: state.ans,
  });
  if (!preview.ok) return { state: "incomplete" };

  const expression = prettyExpression(state.expression);
  const committed = state.justCommitted;

  return {
    state: "ok",
    view: {
      headlineLabel: committed ? "Result" : "Live result",
      headlineValue: preview.data,
      rows: [
        { label: "Expression", value: expression },
        { label: "Angle mode", value: ANGLE_LABELS[state.angleMode] },
        { label: "Answer (Ans)", value: state.ans },
      ],
      note: committed
        ? "Saved as Ans — type a digit for a new calculation or an operator to continue."
        : "Live preview — press = to evaluate and commit the answer.",
      copyText: [
        "Scientific Calculator",
        `Expression: ${expression}`,
        `Result: ${preview.data}`,
        `Angle mode: ${ANGLE_LABELS[state.angleMode]}`,
      ].join("\n"),
    },
  };
}
