/**
 * @deprecated Logit is NOT the project model. Use probit.js (Φ link).
 * Re-exports Probit API for migration; do not use for golden tests.
 */
export {
  fitProbit as fitLogit,
  fitProbit,
  predictProbit,
  brier,
  aucMannWhitney,
  bss,
  splitProbitRows,
  evaluateProbitOos,
} from "./probit.js";
