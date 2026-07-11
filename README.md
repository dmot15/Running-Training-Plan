# Running Training Plan

A local, no-backend web app that builds a personal running training plan and adapts it
based on how your workouts actually go.

The training logic is transcribed from Ann Gaffigan's "Training Cycles for High School
Middle to Long Distance Runners" (Nebraska Coaches Association Winter Track & Field
Clinic, Feb 8, 2014) — see `src/domain/rules.ts` for the source-cited constants (pace
formulas, mileage progression caps, weekly day structure, phase-by-phase workout menus).

## What it does

- Generates a day-by-day schedule starting on a date you choose (e.g. August 1st):
  a **base** phase (endurance/volume, 10%/week mileage cap, a down week every 4th week),
  then a **build** phase (speed-endurance, track + tempo work), then a **peak** phase
  (speed, taper) if you've set a goal race.
- Every day, log how the workout went (completed/partial/skipped, how it felt, pain
  flag, notes). That feedback automatically adjusts the *upcoming* schedule — holding
  mileage flat, inserting an extra recovery week, or downgrading a hard day to easy —
  without touching anything you've already logged.
- Add a race (name, date, distance, priority) and the plan rebuilds from today toward
  it, tapering into race week. Mark a race "A" for a full taper, or "B" for a tune-up
  that just becomes that week's hard day.
- Computes your paces (mile / 5K / tempo) from a recent time trial using the deck's
  formulas.
- Everything is stored in your browser's `localStorage` — no account, no server, no
  data leaves your machine.

## Running it

```bash
npm install
npm run dev
```

Then open the printed local URL. To type-check, lint, test, or build:

```bash
npm run build   # tsc -b && vite build
npm run lint
npm test
```

## Project layout

- `src/domain/rules.ts` — every numeric/structural rule from the source deck, with
  citations.
- `src/domain/paces.ts` — time-trial → pace calculations.
- `src/domain/planGenerator.ts` — turns a profile + races + feedback history into a
  week-by-week plan (phase allocation, mileage progression, taper, race placement).
- `src/domain/adaptation.ts` — turns recent feedback into a grow/freeze/down decision
  for the upcoming week.
- `src/domain/storage.ts` — localStorage persistence.
- `src/components/` — the UI (onboarding, plan/calendar view, day detail + feedback
  form, race manager, settings).
