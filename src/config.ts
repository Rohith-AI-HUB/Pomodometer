// Duration configuration.
//
// The dial is a free-form continuous control from MIN_DIAL_MINUTES (1) to
// DIAL_MAX_MINUTES (60) — a full clockwise rotation sweeps 1 → 60 minutes.
// Actual session durations are arbitrary: any value >= 1 minute is allowed
// with no upper limit (clampMinutes rounds and enforces the 1-minute floor).

export const MIN_DIAL_MINUTES = 1;
export const DIAL_MAX_MINUTES = 60;
export const FOCUS_DEFAULT_MINUTES = 25;

/** Round and enforce the 1-minute minimum. No upper limit. */
export function clampMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return MIN_DIAL_MINUTES;
  return Math.max(MIN_DIAL_MINUTES, Math.round(minutes));
}

/** 0..1 position of a duration on the dial (clamped to the dial range). */
export function dialFractionFor(minutes: number): number {
  const m = Math.min(Math.max(clampMinutes(minutes), MIN_DIAL_MINUTES), DIAL_MAX_MINUTES);
  return (m - MIN_DIAL_MINUTES) / (DIAL_MAX_MINUTES - MIN_DIAL_MINUTES);
}

/** Whole minutes for a 0..1 dial position (always within the dial range). */
export function minutesForDialFraction(fraction: number): number {
  const f = Math.min(Math.max(fraction, 0), 1);
  const m = MIN_DIAL_MINUTES + Math.round(f * (DIAL_MAX_MINUTES - MIN_DIAL_MINUTES));
  return Math.min(Math.max(m, MIN_DIAL_MINUTES), DIAL_MAX_MINUTES);
}

/** +/- 5 minute step around the dial, clamped to the dial range. */
export function stepDialMinutes(currentMinutes: number, dir: 1 | -1): number {
  const next = clampMinutes(currentMinutes) + dir * 5;
  return Math.min(Math.max(next, MIN_DIAL_MINUTES), DIAL_MAX_MINUTES);
}

/** Dial label markers (minutes) and their ring angle in degrees. */
export function dialLabelAngle(minutes: number): number {
  return dialFractionFor(minutes) * 360;
}
