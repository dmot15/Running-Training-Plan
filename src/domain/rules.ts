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

/** "Start at a low level of mileage and work up no more than 10% a week." */
export const MAX_WEEKLY_MILEAGE_INCREASE_PCT = 0.10;
/** Conservative default increase used unless recent feedback has been consistently easy. */
export const DEFAULT_WEEKLY_MILEAGE_INCREASE_PCT = 0.08;

/** "Have a down week every 4th week." */
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

/** Mileage step-downs between phases ("come down from height of base training"). */
export const PHASE_MILEAGE_STEP_DOWN = {
  /** Build phase (pre-competition analogue): "come down 15% from height of base training." */
  baseToBuild: 0.15,
  /** Peak phase (competition analogue): "come down from pre-competition phase mileage ~15%." */
  buildToPeak: 0.15,
  /** Final taper block within peak: "cut down mileage another 15%" heading into championship week. */
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

export const CORE_NOTE = 'Core + strides';
export const STRETCH_NOTE = 'Stretch after every run.';
