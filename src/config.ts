// Sequential timing system on a 60-minute clock framework.
// The dial snaps to these clock values; the value 0 is equivalent to
// 60 minutes (the top of the clock), so a full cycle is:
// 0 → 5 → 10 → 15 → 20 → 30 → 50 → 0
export const DIAL_SEQUENCE = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

/** Actual session minutes for a clock value (0 ≡ 60). */
export function minutesFor(value: number): number {
  return value === 0 ? 60 : value;
}

/** Clock value for actual minutes (60 ≡ 0). */
export function displayFor(minutes: number): number {
  return minutes === 60 ? 0 : minutes;
}

/** Clock angle (degrees, 0 at top, clockwise) for a clock value. */
export function sequenceAngle(value: number): number {
  return ((value % 60) / 60) * 360;
}

/** Snap actual minutes to the nearest valid sequence value. */
export function snapToSequence(minutes: number): number {
  let best = minutesFor(DIAL_SEQUENCE[0]);
  let bestDist = Infinity;
  for (const v of DIAL_SEQUENCE) {
    const m = minutesFor(v);
    const d = Math.abs(m - minutes);
    if (d < bestDist) {
      bestDist = d;
      best = m;
    }
  }
  return best;
}

/** Next/previous value in the cycle (wrapping at both ends). */
export function nextInSequence(currentMinutes: number, dir: 1 | -1): number {
  const cur = displayFor(currentMinutes);
  const i = DIAL_SEQUENCE.indexOf(cur);
  const next = DIAL_SEQUENCE[(i + dir + DIAL_SEQUENCE.length) % DIAL_SEQUENCE.length];
  return minutesFor(next);
}
