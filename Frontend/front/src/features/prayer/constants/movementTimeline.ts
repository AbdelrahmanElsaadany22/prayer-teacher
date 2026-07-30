import type { MovementName, PrayerId } from '../types/prayer.types';
import { parseTimeInput, type TimeInput } from '../utils/time';

/**
 * When the 3D demo shows this movement:
 * - `start`/`end`: the segment of the model's baked animation clip that plays
 *   for it, written in seconds — either a plain number (7.5) or "MM:SS" text
 *   (e.g. "00:07.5"). See constants/movement-timeline-guide.md for the full
 *   naming reference and more on the time formats.
 * - `loop`: while the learner hasn't performed this movement yet, whether the
 *   guide keeps demonstrating it by cycling start -> end -> start ... (true),
 *   or just plays start -> end once and holds (false). Once the learner *has*
 *   performed it, the demo always plays through to `end` and holds there,
 *   regardless of this flag.
 */
export interface MovementTiming {
  start: TimeInput;
  end: TimeInput;
  loop: boolean;
}

type RakaTimeline = Partial<Record<MovementName, MovementTiming>>;

/** [prayer name] -> [rak'ah number, 1-based] -> [movement name] -> timing. */
export type MovementTimelineConfig = Record<PrayerId, Record<number, RakaTimeline>>;

/**
 * Rak'ah 1 and 2 below are confirmed against the actual model. Rak'ah 3 and 4
 * (only relevant for zuhr/asr/isha, which have 4 rak'ahs) reuse rak'ah 1's
 * segment as a placeholder until their own timings are motion-checked and
 * filled in — same caveat the old per-pose tables carried.
 */
const RAKA_1_FAJR: RakaTimeline = {
  takbeer:  { start: '00:00', end: '01:90', loop: true },
  qiyam:    { start: '01:90', end: '02:20', loop: true },
  ruku:     { start: '02:20', end: '05:00', loop: true },
  iqama:    { start: '05:00', end: '07:70', loop: true },
  sujood1:  { start: '07:70', end: '10:10', loop: true },
  juloos:   { start: '10:10', end: '11:50', loop: true },
  sujood2:  { start: '11:50', end: '13:90', loop: true },
};

const RAKA_2_FAJR: RakaTimeline = {
  qiyam:     { start: '13:90', end: '17:30', loop: true },
  ruku:      { start: '17:30', end: '20:70', loop: true },
  iqama:     { start: '20:70', end: '23:50', loop: true },
  sujood1:   { start: '23:50', end: '25:00', loop: true },
  juloos:    { start: '25:00', end: '27:20', loop: true },
  sujood2:   { start: '27:20', end: '29:40', loop: true },
  tashahhud: { start: '29:40', end: '34:00', loop: true },
  salam_right: { start: '34:00', end: '37:50', loop: true },
  // salam_left:  { start: '35:40', end: '37:50', loop: true },
};

const RAKA_1_3: RakaTimeline = {
  takbeer:  { start: '00:00', end: '01:90', loop: true },
  qiyam:    { start: '01:90', end: '02:20', loop: true },
  ruku:     { start: '02:20', end: '05:00', loop: true },
  iqama:    { start: '05:00', end: '07:70', loop: true },
  sujood1:  { start: '07:70', end: '10:10', loop: true },
  juloos:   { start: '10:10', end: '11:50', loop: true },
  sujood2:  { start: '11:50', end: '13:90', loop: true },
};
const RAKA_2_3: RakaTimeline = {
  qiyam:     { start: '13:90', end: '17:30', loop: true },
  ruku:      { start: '17:30', end: '20:70', loop: true },
  iqama:     { start: '20:70', end: '23:50', loop: true },
  sujood1:   { start: '23:50', end: '25:00', loop: true },
  juloos:    { start: '25:00', end: '27:20', loop: true },
  sujood2:   { start: '27:20', end: '29:40', loop: true },
  tashahhud: { start: '29:40', end: '34:00', loop: true },
};
const RAKA_3_3: RakaTimeline = {
  qiyam:     { start: '13:90', end: '17:30', loop: true },
  ruku:      { start: '17:30', end: '20:70', loop: true },
  iqama:     { start: '20:70', end: '23:50', loop: true },
  sujood1:   { start: '23:50', end: '25:00', loop: true },
  juloos:    { start: '25:00', end: '27:20', loop: true },
  sujood2:   { start: '27:20', end: '29:40', loop: true },
  tashahhud: { start: '29:40', end: '34:00', loop: true },
  salam_right: { start: '34:00', end: '37:50', loop: true },
  // salam_left:  { start: '35:40', end: '37:50', loop: true },
};

const RAKA_1_4: RakaTimeline = {
  takbeer:  { start: '00:00', end: '01:90', loop: true },
  qiyam:    { start: '01:90', end: '02:20', loop: true },
  ruku:     { start: '02:20', end: '05:00', loop: true },
  iqama:    { start: '05:00', end: '07:70', loop: true },
  sujood1:  { start: '07:70', end: '10:10', loop: true },
  juloos:   { start: '10:10', end: '11:50', loop: true },
  sujood2:  { start: '11:50', end: '13:90', loop: true },
};
const RAKA_2_4: RakaTimeline = {
  qiyam:     { start: '13:90', end: '17:30', loop: true },
  ruku:      { start: '17:30', end: '20:70', loop: true },
  iqama:     { start: '20:70', end: '23:50', loop: true },
  sujood1:   { start: '23:50', end: '25:00', loop: true },
  juloos:    { start: '25:00', end: '27:20', loop: true },
  sujood2:   { start: '27:20', end: '29:40', loop: true },
  tashahhud: { start: '29:40', end: '34:00', loop: true },
};
const RAKA_3_4: RakaTimeline = {
  takbeer:  { start: '00:00', end: '01:90', loop: true },
  qiyam:    { start: '01:90', end: '02:20', loop: true },
  ruku:     { start: '02:20', end: '05:00', loop: true },
  iqama:    { start: '05:00', end: '07:70', loop: true },
  sujood1:  { start: '07:70', end: '10:10', loop: true },
  juloos:   { start: '10:10', end: '11:50', loop: true },
  sujood2:  { start: '11:50', end: '13:90', loop: true },
};
const RAKA_4_4: RakaTimeline = {
  qiyam:     { start: '13:90', end: '17:30', loop: true },
  ruku:      { start: '17:30', end: '20:70', loop: true },
  iqama:     { start: '20:70', end: '23:50', loop: true },
  sujood1:   { start: '23:50', end: '25:00', loop: true },
  juloos:    { start: '25:00', end: '27:20', loop: true },
  sujood2:   { start: '27:20', end: '29:40', loop: true },
  tashahhud: { start: '29:40', end: '34:00', loop: true },
  salam_right: { start: '34:00', end: '37:50', loop: true },
  // salam_left:  { start: '35:40', end: '37:50', loop: true },
};



export const MOVEMENT_TIMELINE: MovementTimelineConfig = {
  fajr: {
    1: RAKA_1_FAJR,
    2: RAKA_2_FAJR,
  },
  maghrib: {
    1: RAKA_1_3,
    2: RAKA_2_3,
    3: RAKA_3_3,
  },
  zuhr: {
    1: RAKA_1_4,
    2: RAKA_2_4,
    3: RAKA_3_4,
    4: RAKA_4_4,
  },
  asr: {
    1: RAKA_1_4,
    2: RAKA_2_4,
    3: RAKA_3_4,
    4: RAKA_4_4,
  },
  isha: {
    1: RAKA_1_4,
    2: RAKA_2_4,
    3: RAKA_3_4,
    4: RAKA_4_4,
  },
};

/** A movement's timing, resolved to plain seconds — or `undefined` if `movement`
 * has no entry for this prayer/rak'ah (the demo just holds wherever it is). */
export function resolveMovementTiming(
  prayerId: PrayerId,
  rakaNumber: number,
  movement: MovementName,
): { start: number; end: number; loop: boolean } | undefined {
  const timing = MOVEMENT_TIMELINE[prayerId]?.[rakaNumber]?.[movement];
  if (!timing) return undefined;
  return { start: parseTimeInput(timing.start), end: parseTimeInput(timing.end), loop: timing.loop };
}
