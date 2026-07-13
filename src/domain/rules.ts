/**
 * Training rules. The overall shape of a plan (base -> build -> peak phases, mileage
 * progression, weekly day structure) is adapted from Ann Gaffigan's "Training Cycles for
 * High School Middle to Long Distance Runners" (Nebraska Coaches Association Winter Track &
 * Field Clinic, Feb 8, 2014): a base-building phase (10%/week mileage cap, a down week every
 * 4th week), then build and peak/taper blocks as a race approaches.
 *
 * All of the actual workout content — the specific sessions prescribed on hard days and long
 * run days — comes from the B.A.A. Half Marathon Training Plan: Level Three (Boston Athletic
 * Association, 2018): progression runs, goal-pace tempo intervals, race-pace ladders blending
 * goal/10K/5K pace, and "simulation" long runs with a large goal-pace block embedded in an
 * otherwise easy long run. See the menus further down this file.
 */

import type { ExperienceLevel } from './types';

/** "Start at a low level of mileage and work up no more than 10% a week." Every week that
 * isn't a down week (or held flat by the adaptation engine) grows by this amount. */
export const MAX_WEEKLY_MILEAGE_INCREASE_PCT = 0.10;
/** Same as the max — normal weeks always grow at the full 10%; only feedback-driven freezes hold it back. */
export const DEFAULT_WEEKLY_MILEAGE_INCREASE_PCT = 0.10;

/** "Have a down week every 4th week." Applies through base and build (the mileage-building phases). */
export const DOWN_WEEK_INTERVAL = 4;

/** Base phase mileage ceiling depends on experience/durability/commitment: "40-60 miles". */
export const MAX_MILEAGE_BY_EXPERIENCE: Record<ExperienceLevel, number> = {
  beginner: 40,
  intermediate: 50,
  advanced: 60,
};

/** Suggested starting weekly mileage by experience, used only if the user doesn't override it. */
export const STARTING_MILEAGE_BY_EXPERIENCE: Record<ExperienceLevel, number> = {
  beginner: 15,
  intermediate: 20,
  advanced: 30,
};

/**
 * Base and build share one continuous mileage build-up (10%/week, down week every 4th).
 * Peak-phase weeks hold flat at the highest mileage reached during that build-up, right up
 * until the taper: the final 2 weeks before a goal race, which step mileage back down.
 */
export const TAPER_WEEKS_BEFORE_RACE = 2;
export const PHASE_MILEAGE_STEP_DOWN = {
  /** The week before race week: "cut down mileage another 15% and decrease a bit each week." */
  peakTaper: 0.15,
} as const;

/**
 * Long run as a share of weekly mileage. Matches the B.A.A. Half Marathon plan's actual
 * proportions (e.g. a 9-10 mi long run in a ~34 mi week, a 13-14 mi long run in a ~42 mi
 * week) rather than a flatter, smaller share.
 */
export const LONG_RUN_PCT_OF_WEEKLY = 0.30;

/**
 * Approximate share of total plan weeks given to each block, based on the
 * source's phase lengths (12 / 9 / 8 weeks -> base / build / peak). Used to
 * scale a plan of arbitrary length to a race date.
 */
export const PHASE_WEEK_SHARE = {
  base: 12 / 29,
  build: 9 / 29,
  peak: 8 / 29,
} as const;

export const MIN_PHASE_WEEKS = {
  base: 2,
  build: 2,
  peak: 2,
} as const;

/**
 * "A week typically consists of: 2 hard workouts (counting a competition as
 * a hard workout), 2 easy/recovery days + core, 1 medium day, 1 long run
 * day, 1 day off or very easy recovery day."
 *
 * The concrete Monday-Sunday day-role templates per phase live in
 * planGenerator.ts's DAY_TEMPLATES, mapped onto each day by its actual
 * weekday so e.g. the hard day always lands on the deck's intended Tuesday
 * regardless of which weekday the plan start date falls on.
 */

/** "1 mile time trial + 33 sec = 5K PACE" (seconds per mile). */
export const MILE_TO_5K_OFFSET_SEC = 33;
/** "5K time trial pace/mile - 33 sec = MILE PACE". */
export const FIVE_K_TO_MILE_OFFSET_SEC = 33;
/** "5K PACE + 30-40 sec = TEMPO RUN PACE" - use the midpoint. */
export const TEMPO_OFFSET_SEC_RANGE: [number, number] = [30, 40];
/** Standard exponent in Riegel's race-time prediction formula (T2 = T1 * (D2/D1)^1.06),
 * used to extend a single time trial into 10K/half-marathon pace estimates. */
export const RIEGEL_EXPONENT = 1.06;

/**
 * Workout menus transcribed from the B.A.A. Half Marathon Training Plan: Level Three
 * (Boston Athletic Association, 2018) — "goal pace" means goal race pace.
 */
export const PROGRESSION_RUN_MENU = [
  '4 miles steady, then 3-4 min rest, then 6 x 30 sec hard with 60 sec rest',
  '5 miles steady, then 3-4 min rest, then 4 x 60 sec hard with 90 sec rest',
  '6 miles steady, then 3-4 min rest, then 6-7 x 45 sec hard with 60 sec rest',
  '7 miles steady, then 3-4 min rest, then 8 x 30 sec hard with 60 sec rest',
];

export const GOAL_PACE_TEMPO_MENU = [
  '5-6 x 3/4 mile at goal pace, 400m recovery jog between',
  '4-5 x 1 mile at goal pace, 2 min rest between',
];

/** Race-pace ladder intervals blending goal, 10K, and 5K pace — gets more complex as the race approaches. */
export const RACE_PACE_LADDER_MENU = [
  '8 x 1/2 mile at 10K pace, 90 sec jog rest',
  '6 x 3/4 mile at 10K pace, 1/4-mile jog rest',
  '3 x 1 mile at 10K pace (1/4-mile jog) + 2 x 1/2 mile at 5K pace (1/4-mile jog)',
  '2 miles at goal pace (3 min rest), 2 x 1 mile at 10K pace (3 min rest), 2 x 1/2 mile at 5K pace (2 min rest)',
  '2 x 2 miles at 10K pace (3 min jog), 2 x 1/2 mile at 5K pace (90 sec jog)',
  '2 miles at goal pace (2 min rest), 2 x 1 mile at 10K pace (2 min rest), 2 x 1/2 mile at 5K pace (2 min rest)',
  '1 mile at goal pace (2 min rest), 3 x 1 mile at 10K pace (3 min rest), 2 x 1/2 mile at 5K pace (2 min rest)',
  '3 x 1 mile at 10K pace (3 min rest) + 2 x 3/4 mile at 5K pace (1/4-mile jog)',
];

/** Race week: short and sharp, mirroring the plan's final-week Tuesday session and Thursday strides. */
export const RACE_WEEK_ROAD_MENU = [
  '3 x 1/2 mile at 10K pace (2 min rest) + 3 x 1/2 mile at 5K pace (1/4-mile jog)',
  '3-4 easy miles, then 4 x 30 sec hard with 60 sec rest',
];

/**
 * "Half Marathon Simulation": a large goal-pace block embedded in an otherwise easy long
 * run, used as a periodic dress rehearsal in the peak phase. Distances scale down for
 * shorter goal races (10K/5K).
 */
export const HM_SIMULATION_SEGMENTS = [
  { easyBefore: 6, atGoalPace: 5, easyAfter: 2 },
  { easyBefore: 6, atGoalPace: 6, easyAfter: 2 },
];

export const CORE_NOTE = 'Core + strides';
export const STRETCH_NOTE = 'Stretch after every run.';
