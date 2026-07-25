/** A timestamp as written in {@link MOVEMENT_TIMELINE} — either raw seconds (7.7)
 * or "SS:CC" text, i.e. whole seconds and hundredths separated by a colon instead
 * of a decimal point (e.g. "00:00" = 0s, "13:83" = 13.83s). See
 * constants/movement-timeline-guide.md. */
export type TimeInput = number | string;

/** Parses a {@link TimeInput} down to a plain seconds value. */
export function parseTimeInput(value: TimeInput): number {
  if (typeof value === 'number') return value;
  return parseFloat(value.trim().replace(':', '.'));
}

/** Formats a seconds value as zero-padded "SS:CC" (e.g. 7.7 -> "07:70"), for
 * displaying a timestamp back to a human — the inverse of {@link parseTimeInput}. */
export function formatSeconds(totalSeconds: number): string {
  return totalSeconds.toFixed(2).replace('.', ':').padStart(5, '0');
}
