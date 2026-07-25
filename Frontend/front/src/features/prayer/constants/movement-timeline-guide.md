# Movement timeline guide

Reference for editing [`movementTimeline.ts`](./movementTimeline.ts) — the table that
tells the 3D teacher model which seconds of its baked animation to play for each
movement, and whether to loop that segment while it's still being demonstrated.

## Shape of the config

```ts
export const MOVEMENT_TIMELINE: MovementTimelineConfig = {
  <prayer name>: {
    <rak'ah number>: {
      <movement name>: { start: <time>, end: <time>, loop: <true | false> },
      ...
    },
    ...
  },
  ...
};
```

- **`start` / `end`** — the segment of the model's clip shown for this movement, in
  seconds. See [Time format](#time-format) below.
- **`loop`** — while the learner hasn't performed the movement yet:
  - `true`: the guide keeps demonstrating it, cycling `start → end → start → …`.
  - `false`: it just plays `start → end` once and holds on `end`.

  Once the learner *has* performed the movement, it always plays through to `end`
  and holds there — `loop` only affects the demo phase, not the confirmed hold.

- A movement with **no entry** for a given prayer/rak'ah is left alone — the model
  just stays wherever it already is. Useful for a movement that has no dedicated
  clip yet (e.g. the tasleem turns currently have none).

## Prayer names

Use these exact ids as the top-level keys (they match `Prayer.id` / `PrayerId`):

| id         | Arabic     | English   | Rak'ahs |
|------------|------------|-----------|---------|
| `fajr`     | الفجر      | Fajr      | 2       |
| `zuhr`     | الظهر      | Zuhr      | 4       |
| `asr`      | العصر      | Asr       | 4       |
| `maghrib`  | المغرب     | Maghrib   | 3       |
| `isha`     | العشاء     | Isha      | 4       |

## Rak'ah numbers

**1-based**, not 0-based — the first rak'ah of any prayer is `1`, not `0`. A prayer
only needs entries for rak'ahs it actually has (e.g. `fajr` only needs `1` and `2`).

## Movement names

Use these exact keys inside a rak'ah (matches the `MovementName` type in
[`../types/prayer.types.ts`](../types/prayer.types.ts)). They appear **in this order**
within a rak'ah:

| key           | Arabic          | English          | Appears in                                   |
|---------------|-----------------|------------------|-----------------------------------------------|
| `takbeer`     | تكبيرة الإحرام  | Takbeer          | Rak'ah 1 only (opens the whole prayer)        |
| `qiyam`       | القيام          | Qiyam            | Every rak'ah                                  |
| `ruku`        | الركوع          | Ruku'            | Every rak'ah                                  |
| `iqama`       | الاعتدال        | I'tidal          | Every rak'ah                                  |
| `sujood1`     | السجود (١)      | Sujood 1         | Every rak'ah — the 1st prostration            |
| `juloos`      | الجلسة          | Juloos           | Every rak'ah — sitting between prostrations   |
| `sujood2`     | السجود (٢)      | Sujood 2         | Every rak'ah — the 2nd prostration            |
| `tashahhud`   | التشهد          | Tashahhud        | The rak'ah that closes sitting (2nd rak'ah of a 3/4-rak'ah prayer, and every prayer's last rak'ah) |
| `salam_right` | التسليم يمينًا  | Tasleem (right)  | Only the prayer's final rak'ah                |
| `salam_left`  | التسليم يسارًا  | Tasleem (left)   | Only the prayer's final rak'ah                |

Note: there is **no separate key for the two prostrations** other than `sujood1` /
`sujood2` — they're written out because the model holds each at a different point
in the clip, unlike most other movements which occur once per rak'ah.

## Time format

A `start` or `end` value can be written either way:

- **A plain number** — raw seconds: `7.7`, `34`.
- **`"SS:CC"` text** — whole seconds and hundredths-of-a-second, separated by a
  colon instead of a decimal point: `"00:00"` = 0s, `"07:70"` = 7.7s, `"13:83"` =
  13.83s, `"34:60"` = 34.6s. This is **not** minutes:seconds — the colon is only
  there so the number reads like a familiar clock/stopwatch display; write the
  whole-seconds count on the left no matter how large it gets (`"46:00"` is 46
  seconds, not 46 minutes).

Both forms are parsed by `parseTimeInput` in
[`../utils/time.ts`](../utils/time.ts). There's also `formatSeconds`, the inverse,
which turns a raw seconds value back into zero-padded `"SS:CC"` text (e.g. `7.7` →
`"07:70"`) for anywhere you need to *display* a timestamp.

## Chaining `start`/`end` across movements

Within a rak'ah (and across rak'ahs), a movement's `end` is written to equal the
**next** movement's `start`. That's what makes the demo read as one continuous
motion instead of jump-cuts:

- While a movement is **unconfirmed**: if `loop: true`, the guide cycles
  `start → end → start → …`, demonstrating just that movement, until the learner
  performs it correctly. If `loop: false`, it just plays `start → end` once and
  holds.
- The instant it's **confirmed**, the model plays forward to `end` and holds —
  which, since `end` matches the next movement's `start`, is exactly "continue to
  where the next movement begins". That next movement then starts its own loop
  from right there, with no visible jump.

So when adding or editing entries, keep each movement's `end` equal to the very
next movement's `start` (see any existing rak'ah in `movementTimeline.ts` for the
pattern) — breaking that chain doesn't crash anything, but it'll show as a jump
or a rewind in the model when the learner advances past that movement.

## Example: editing one entry

To make the guide play "ruku'" once instead of looping it while demonstrating,
in fajr's 1st rak'ah:

```ts
fajr: {
  1: {
    ...
    ruku: { start: '02:20', end: '05:00', loop: false },
    ...
  },
},
```

## Current caveat

Rak'ah 3 and 4 (`zuhr`, `asr`, `isha`; maghrib only has a 3rd) currently reuse
rak'ah 1's movement *durations*, just chained onward from rak'ah 2's tashahhud
hold instead of restarting at rak'ah 1's own (lower) timestamps — a placeholder
until their own timings are motion-checked against the model. Feel free to
overwrite `RAKA_3_PLACEHOLDER` / `RAKA_4_PLACEHOLDER` in `movementTimeline.ts`
once you have the real numbers — just keep the chaining rule above in mind.
