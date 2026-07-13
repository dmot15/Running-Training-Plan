/**
 * Training rules transcribed from:
 * Ann Gaffigan, "Training Cycles for High School Middle to Long Distance
 * Runners," Nebraska Coaches Association Winter Track & Field Clinic,
 * Feb 8, 2014.
 *
 * The original talk lays out a full high-school-year cycle (summer base ->
 * cross country -> winter base -> pre-competition -> track season). This
 * app collapses that into a generic three-block model (base / build / peak)
 * that gets scaled to however many weeks stand between the plan start date
 * and a chosen race, while keeping every numeric rule from the source
 * (mileage caps, down-week cadence, pace formulas, weekly day structure,
 * workout menus, taper rules) intact.
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

/** Long run as a share of weekly mileage ("Long Run ~ 20% of weekly total"). */
export const LONG_RUN_PCT_OF_WEEKLY = 0.20;

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
 * weekday so e.g. the hard track day always lands on the deck's intended
 * Tuesday regardless of which weekday the plan start date falls on.
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

/** Base phase: hill-hard Tuesday / tempo Friday, rotated with fartlek variety notes from the deck. */
export const BASE_HARD_WORKOUT_MENU = [
  '1 mi warmup jog, then 25 min running uphill hard / jogging down, 1 mi cooldown (~5 mi)',
  'Fartlek: alternate 3 min hard / 2 min easy for 25-35 min (rest always shorter than the hard rep)',
  'Down ladder: 6-5-4-3-2-1 min hard with 1 min easy between',
  'Up/down ladder: 1-2-3-4-4-3-2-1 min hard with 1 min easy between',
  'Progression run: get faster each mile or half mile',
];

export const BASE_TEMPO_WORKOUT = '1 mi warmup, 3 mi tempo run at Tempo Pace (or 20 min at tempo effort), 1 mi cooldown';

export const BUILD_TRACK_WORKOUT_MENU = [
  '1 mi warmup; 1600m @ 5K pace - jog 800m; 1200m @ 2s/400 faster - jog 600m; 800m @ 2s/400 faster - jog 400m; 400m @ 2s/400 faster - jog 200m; 200m all out; 1 mi cooldown',
  '3-5 x 800m @ 5K pace, 200m jog rest; finish with 2 x 200m all out, 200m jog rest',
  'Mile repeats: 2-4 x 1 mile @ 5K pace + 10-15 sec/mile, 400m jog rest between',
  '3-5 x 1000m @ 5K pace, 200m walk rest',
  'Up/down ladder: 200-400-800-1000-800-400-200, rest = jog half the distance just run (1000m @ mile pace + 10 sec)',
];

export const BUILD_TEMPO_WORKOUT = '1 mi warmup, 2-4 mi at Tempo Pace, 1 mi cooldown';

export const PEAK_TRACK_WORKOUT_MENU = [
  '2-3 sets of 4x400m @ mile pace - 2s, 2 min rest between 400s, 400m walk between sets',
  '8-12 x 400m @ mile pace, 1 min rest, straight through',
  '2-3 sets of 400-600-400-200 @ mile pace-2s / mile pace / mile pace-2s / all out, 2 min rest (400m walk between sets)',
  '1200-800-600-400-200-100, starting a little faster than 5K pace and getting faster each rep, all out at the end, jog half the distance between',
  '3 x 1000m or 800m, 3 min rest, finish with 3 x 100m all out, 30 sec rest',
];

export const PEAK_TAPER_TRACK_WORKOUT_MENU = [
  '2 sets of 4x400m, starting at mile pace - 2s and getting faster each set, 3 min rest between 400s, 400m walk between sets',
  '2 sets of 400-600-400-200 @ mile pace-3s / faster / mile pace-3s / all out, 3 min rest, 400m walk between sets',
  '800-600-400-200-100, starting a little slower than mile pace and getting faster, rest = jog half the distance just run',
];

/** Championship/race week: "no more than 2 miles worth of hard reps... plenty of rest and speed at the end." */
export const RACE_WEEK_TRACK_WORKOUT_MENU = [
  '8 x 400m, 2 min rest, last one fast',
  '1 mile (4 min rest) - 800m (2 min rest) - 400m (1 min rest) - 200m fast',
  '3 x 1000m, 4 min rest, finish with 2 x 100m fast strides',
  '5-6 x 400m cutdowns: start at mile pace, get at least 1 sec faster each rep (never same or slower), 200m walk rest',
  '6-8 x 200m under 800m pace, 200m walk rest',
];

export const XC_STYLE_HARD_WORKOUT_MENU = [
  '3-5 x 1000m, 3 min rest, on grass (preferably hilly)',
  '3-4 x 1 mile repeats, 3 min rest, on grass (preferably hilly)',
  '4-6 x 800m, 3 min rest, on grass',
];

/**
 * Road-race workout menus transcribed from the B.A.A. Half Marathon Training Plan: Level
 * Three (Boston Athletic Association, 2018). Used in place of the track-style menus above
 * for build/peak phases when the goal race is a road race (5K/10K/half marathon/marathon)
 * rather than a track or cross-country race — "goal pace" means goal race pace.
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
