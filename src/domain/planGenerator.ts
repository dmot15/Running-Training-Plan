import { decideWeekMode, growthPctForMode } from './adaptation';
import { contentForRole, simulationSegmentFor, type RoadPaces, type Variant } from './content';
import { addDays, diffDays, weekdayIndexMon0, weeksBetween } from './dates';
import { roundToHalf } from './format';
import { computePaces } from './paces';
import {
  DOWN_WEEK_INTERVAL,
  LONG_RUN_PCT_OF_WEEKLY,
  MAX_MILEAGE_BY_EXPERIENCE,
  MIN_PHASE_WEEKS,
  PHASE_MILEAGE_STEP_DOWN,
  PHASE_WEEK_SHARE,
  TAPER_WEEKS_BEFORE_RACE,
} from './rules';
import type {
  AdjustmentLogEntry,
  DayRole,
  FeedbackEntry,
  Paces,
  Phase,
  PlanState,
  Race,
  RaceDistance,
  UserProfile,
  Week,
  Workout,
} from './types';

// 'long' is weighted well above the others so the long run lands around 30% of weekly
// mileage, matching the B.A.A. plan's actual proportions (e.g. a 13-14 mi long run in a
// ~42 mi week) rather than a smaller, flatter share.
const ROLE_WEIGHT: Record<DayRole, number> = { long: 32, medium: 15, hard: 16, easy: 13, rest: 3, race: 0 };

/** B.A.A. Half Marathon Training Plan-style weekly structure: base/build share the same
 * progression-run + goal-pace-tempo template; peak switches to race-pace ladders. */
const DAY_TEMPLATES: Record<'build' | 'peak', { role: DayRole; variant?: Variant; drills?: boolean }[]> = {
  build: [
    { role: 'easy', drills: true },
    { role: 'hard', variant: 'goal-pace-tempo' },
    { role: 'medium' },
    { role: 'easy', drills: true },
    { role: 'hard', variant: 'progression-run' },
    { role: 'long' },
    { role: 'rest' },
  ],
  peak: [
    { role: 'long' },
    { role: 'hard', variant: 'race-pace-ladder' },
    { role: 'medium' },
    { role: 'easy', drills: true },
    { role: 'easy' },
    { role: 'hard', variant: 'progression-run' },
    { role: 'rest' },
  ],
};

/** Race-week taper template, keyed by days-before-race (0 = race day). */
const TAPER_ROLE_BY_DAYS_BEFORE: Record<number, { role: DayRole; variant?: Variant }> = {
  0: { role: 'race' },
  1: { role: 'easy' },
  2: { role: 'easy' },
  3: { role: 'medium' },
  4: { role: 'hard', variant: 'race-week-road' },
  5: { role: 'easy' },
  6: { role: 'easy' },
};

// Rounded to the nearest half mile for display consistency with the rest of the plan.
const RACE_DISTANCE_MILES: Record<RaceDistance, number> = {
  '800m': 0.5,
  '1600m/mile': 1,
  '3200m/2mile': 2,
  '5k': 3,
  '10k': 6,
  'half-marathon': 13,
  marathon: 26,
  other: 3,
};

function allocatePhases(totalWeeks: number): { base: number; build: number; peak: number } {
  if (totalWeeks <= 0) return { base: 0, build: 0, peak: 0 };
  if (totalWeeks < MIN_PHASE_WEEKS.peak) return { base: 0, build: 0, peak: totalWeeks };

  let peak = Math.max(MIN_PHASE_WEEKS.peak, Math.round(totalWeeks * PHASE_WEEK_SHARE.peak));
  peak = Math.min(peak, totalWeeks);
  let remaining = totalWeeks - peak;

  let build = 0;
  let base = 0;
  if (remaining < MIN_PHASE_WEEKS.build) {
    peak += remaining;
  } else {
    build = Math.max(MIN_PHASE_WEEKS.build, Math.round(totalWeeks * PHASE_WEEK_SHARE.build));
    build = Math.min(build, remaining);
    remaining -= build;
    base = remaining;
    if (base > 0 && base < MIN_PHASE_WEEKS.base) {
      build += base;
      base = 0;
    }
  }
  return { base, build, peak };
}

function feedbackWindow(feedback: Record<string, FeedbackEntry>, beforeDate: string, days: number): FeedbackEntry[] {
  const from = addDays(beforeDate, -days);
  return Object.values(feedback).filter((f) => f.workoutDate >= from && f.workoutDate < beforeDate);
}

function raceMilesFor(race: Race): number {
  return RACE_DISTANCE_MILES[race.distance] ?? 3;
}

/** Goal race pace (seconds/mile): the race's own goal time if set, else predicted from time trials. */
function goalPaceForRace(race: Race | undefined, paces: Paces | undefined): number | undefined {
  if (!race) return undefined;
  if (race.goalTimeSeconds) return race.goalTimeSeconds / raceMilesFor(race);
  if (!paces) return undefined;
  switch (race.distance) {
    case '5k':
      return paces.fiveKPace;
    case '10k':
      return paces.tenKPace;
    case 'half-marathon':
      return paces.halfMarathonPace;
    default:
      return paces.halfMarathonPace;
  }
}

function distributeMileage(
  days: { role: DayRole; locked: boolean; lockedMiles?: number; raceMiles?: number; fixedMiles?: number }[],
  weekTotal: number,
): number[] {
  const result = new Array(days.length).fill(0);
  let pool = weekTotal;
  days.forEach((d, i) => {
    if (d.locked) {
      result[i] = d.lockedMiles ?? 0;
      pool -= result[i];
    } else if (d.role === 'race') {
      result[i] = d.raceMiles ?? 3;
      pool -= result[i];
    } else if (d.fixedMiles !== undefined) {
      result[i] = d.fixedMiles;
      pool -= result[i];
    }
  });
  pool = Math.max(0, pool);
  const flexible = days.map((d, i) => ({ d, i })).filter(({ d }) => !d.locked && d.role !== 'race' && d.fixedMiles === undefined);
  const weightSum = flexible.reduce((s, { d }) => s + ROLE_WEIGHT[d.role], 0);
  if (weightSum > 0) {
    flexible.forEach(({ d, i }) => {
      result[i] = roundToHalf(pool * (ROLE_WEIGHT[d.role] / weightSum));
    });
  }
  return result;
}

interface GenContext {
  profile: UserProfile;
  races: Race[];
  feedback: Record<string, FeedbackEntry>;
  lockedByDate: Map<string, Workout>;
  today: string;
  roadPaces?: RoadPaces;
}

function buildDay(
  date: string,
  weekNumber: number,
  phase: Phase,
  isDownWeek: boolean,
  role: DayRole,
  variant: Variant | undefined,
  drills: boolean | undefined,
  miles: number,
  weekIndexInPhase: number,
  ctx: GenContext,
  raceOnThisDay?: Race,
): Workout {
  const locked = ctx.lockedByDate.get(date);
  if (locked) return locked;

  const { title, description } = contentForRole(role, miles, {
    variant,
    weekIndex: weekIndexInPhase,
    roadPaces: ctx.roadPaces,
    withDrills: drills,
    race: raceOnThisDay,
  });

  return {
    id: date,
    date,
    weekNumber,
    phase,
    role,
    title,
    description,
    targetMiles: role === 'rest' ? undefined : miles,
    isDownWeek,
    status: 'planned',
    raceId: raceOnThisDay?.id,
  };
}

export function regeneratePlan(
  profile: UserProfile,
  races: Race[],
  existingPlan: PlanState,
  feedback: Record<string, FeedbackEntry>,
  today: string,
): PlanState {
  const lockedByDate = new Map<string, Workout>();
  for (const week of existingPlan.weeks) {
    for (const day of week.days) {
      if (day.status !== 'planned') lockedByDate.set(day.date, day);
    }
  }

  const planStart = profile.planStartDate;
  const upcomingARace = races
    .filter((r) => r.priority === 'A' && r.date >= planStart)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const horizonEnd = upcomingARace ? upcomingARace.date : addDays(planStart, 16 * 7 - 1);
  const totalWeeks = Math.max(1, weeksBetween(planStart, horizonEnd));
  // With no goal race on the books there's nothing to build toward or taper into, so stay in
  // base training indefinitely (in rolling 16-week windows) until a race is added.
  const { base: baseWeeks, build: buildWeeks, peak: peakWeeks } = upcomingARace
    ? allocatePhases(totalWeeks)
    : { base: totalWeeks, build: 0, peak: 0 };

  const cap = roundToHalf(profile.maxWeeklyMileageCap || MAX_MILEAGE_BY_EXPERIENCE[profile.experienceLevel]);
  const startMileage = roundToHalf(profile.startingWeeklyMileage);

  const paces = computePaces(profile.timeTrials);
  const roadPaces: RoadPaces = { goalPace: goalPaceForRace(upcomingARace, paces), tenKPace: paces?.tenKPace, fiveKPace: paces?.fiveKPace };

  // Keyed by id so repeated regenerations (e.g. one per keystroke) overwrite rather than
  // duplicate an already-recorded adjustment for the same week/reason.
  const adjustmentsById = new Map<string, AdjustmentLogEntry>(existingPlan.adjustmentLog.map((a) => [a.id, a]));
  const recordAdjustment = (entry: AdjustmentLogEntry) => adjustmentsById.set(entry.id, entry);
  const ctx: GenContext = { profile, races, feedback, lockedByDate, today, roadPaces };

  const weeks: Week[] = [];
  let smoothMileage = startMileage;
  let weeksSinceDown = 0;
  let highestGrowthMileage = startMileage;
  let peakBaseline: number | undefined;

  for (let w = 0; w < totalWeeks; w++) {
    const weekNumber = w + 1;
    const weekStart = addDays(planStart, w * 7);
    const dayDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    let phase: Phase;
    let weekIndexInPhase: number;
    if (w < baseWeeks) {
      phase = 'base';
      weekIndexInPhase = w;
    } else if (w < baseWeeks + buildWeeks) {
      phase = 'build';
      weekIndexInPhase = w - baseWeeks;
    } else {
      phase = 'peak';
      weekIndexInPhase = w - baseWeeks - buildWeeks;
    }

    const recentFeedback = feedbackWindow(feedback, weekStart, 10);
    const { mode, reason } = decideWeekMode(recentFeedback);
    let isDownWeek = false;
    let targetMileage: number;
    const isRaceWeek = phase === 'peak' && w === totalWeeks - 1 && !!upcomingARace;
    // Fixed 2-week taper leading into a goal race (or fewer if the peak phase itself is shorter).
    const taperWeeksCount = Math.min(TAPER_WEEKS_BEFORE_RACE, peakWeeks);
    const taperZoneStart = Math.max(0, peakWeeks - taperWeeksCount);

    if (phase === 'base' || phase === 'build') {
      // Base and build share one continuous mileage build-up: 10%/week, with a down week
      // (reset to the plan's starting mileage) every 4th week, capped at the profile's max.
      if (w === 0) {
        targetMileage = smoothMileage;
        weeksSinceDown = 1;
      } else {
        const scheduledDown = weeksSinceDown >= DOWN_WEEK_INTERVAL - 1;
        if (scheduledDown || mode === 'down') {
          isDownWeek = true;
          targetMileage = startMileage;
          weeksSinceDown = 0;
          if (mode === 'down') recordAdjustment({ id: `${weekStart}-down`, date: today, weekNumber, reason, action: 'Inserted an unscheduled down week and reset mileage toward the plan’s starting level.' });
        } else {
          const pct = growthPctForMode(mode);
          smoothMileage = Math.min(cap, roundToHalf(smoothMileage * (1 + pct)));
          targetMileage = smoothMileage;
          weeksSinceDown += 1;
          if (mode === 'freeze') recordAdjustment({ id: `${weekStart}-freeze`, date: today, weekNumber, reason, action: 'Held weekly mileage flat instead of increasing.' });
        }
      }
      highestGrowthMileage = Math.max(highestGrowthMileage, targetMileage);
    } else {
      // Peak: hold flat at the highest mileage reached during base/build until the taper.
      if (peakBaseline === undefined) {
        peakBaseline = highestGrowthMileage;
      }
      if (isRaceWeek) {
        targetMileage = roundToHalf(peakBaseline * (1 - PHASE_MILEAGE_STEP_DOWN.peakTaper) * 0.6);
      } else if (weekIndexInPhase >= taperZoneStart) {
        targetMileage = roundToHalf(peakBaseline * (1 - PHASE_MILEAGE_STEP_DOWN.peakTaper));
      } else {
        targetMileage = peakBaseline;
      }
      if (mode === 'down' && !isRaceWeek) {
        isDownWeek = true;
        targetMileage = roundToHalf(targetMileage * 0.85);
        recordAdjustment({ id: `${weekStart}-peakdown`, date: today, weekNumber, reason, action: 'Cut this week’s mileage ~15% for extra recovery.' });
      } else if (mode === 'down' && isRaceWeek) {
        recordAdjustment({ id: `${weekStart}-racedown`, date: today, weekNumber, reason, action: 'Flagged fatigue/pain heading into race week — review whether this race is still a go.' });
      }
    }

    // Determine day roles for the week. Base and build share the same progression-run +
    // goal-pace-tempo template; peak switches to race-pace ladders.
    const template = phase === 'peak' ? DAY_TEMPLATES.peak : DAY_TEMPLATES.build;

    type DaySpec = { role: DayRole; variant?: Variant; drills?: boolean; race?: Race; fixedMiles?: number };

    // Taper day-roles are keyed by days-before-race, evaluated per calendar date rather than
    // per week-block: week blocks run on a fixed 7-day cadence from the plan start date, which
    // has no reason to line up with the race date, so the taper window can straddle two blocks.
    function taperSpecFor(date: string): DaySpec | undefined {
      if (!upcomingARace) return undefined;
      const offset = diffDays(date, upcomingARace.date);
      if (offset < 0) return { role: 'rest' }; // after the race, within the same trailing block
      const spec = TAPER_ROLE_BY_DAYS_BEFORE[offset];
      if (!spec) return undefined;
      return { ...spec, race: offset === 0 ? upcomingARace : undefined };
    }

    // Map by actual weekday (Mon..Sun) rather than position-in-plan, so e.g. the hard day
    // always lands on the deck's intended Tuesday regardless of which weekday the plan start
    // date falls on. The taper window (0-6 days before the race) overrides this per date.
    let daySpecs: DaySpec[] = dayDates.map((date) => {
      const taper = taperSpecFor(date);
      if (taper) return taper;
      const t = template[weekdayIndexMon0(date)];
      return { role: t.role, variant: t.variant, drills: t.drills };
    });

    // In the couple of weeks approaching the race (but not the taper window itself), switch to
    // the shorter/faster taper menu ahead of the full race-week sharpener.
    if (phase === 'peak' && weekIndexInPhase >= taperZoneStart) {
      daySpecs = daySpecs.map((s) => (s.variant === 'race-pace-ladder' ? { ...s, variant: 'race-week-road' } : s));
    }
    // Roughly every other peak-phase week (before the taper), get a "simulation" long run — a
    // large goal-pace block embedded in an otherwise easy long run. Indexed the same way
    // content.ts's simulationLongContent picks its segment, so the mileage shown on the day
    // card always matches the segment described in the workout text.
    if (phase === 'peak' && weekIndexInPhase < taperZoneStart && weekIndexInPhase % 2 === 1) {
      daySpecs = daySpecs.map((s) => {
        if (s.role !== 'long') return s;
        const segment = simulationSegmentFor(weekIndexInPhase);
        return { ...s, variant: 'hm-simulation', fixedMiles: segment.easyBefore + segment.atGoalPace + segment.easyAfter };
      });
    }

    // Overlay any other races (B-priority tune-ups, or A-races beyond this horizon) that land in this week.
    dayDates.forEach((date, i) => {
      if (daySpecs[i].race) return;
      const hit = races.find((r) => r.date === date && r.id !== upcomingARace?.id);
      if (hit) daySpecs[i] = { role: 'race', race: hit };
    });

    // Adaptation: downgrade the next hard/long day when mode is 'down' or 'freeze' (base/build phases
    // only, since peak already applies a mileage cut above); skip days already locked by prior feedback.
    if ((phase === 'base' || phase === 'build') && (mode === 'down' || mode === 'freeze') && !isRaceWeek) {
      const idx = daySpecs.findIndex((s, i) => !lockedByDate.has(dayDates[i]) && (s.role === 'hard' || s.role === 'long'));
      if (idx >= 0) {
        daySpecs[idx] = { role: 'easy' };
      }
    }

    const dayInputs = daySpecs.map((s, i) => {
      const locked = lockedByDate.get(dayDates[i]);
      return {
        role: s.role,
        locked: !!locked,
        lockedMiles: locked?.targetMiles,
        raceMiles: s.race ? raceMilesFor(s.race) : undefined,
        fixedMiles: s.fixedMiles,
      };
    });
    const miles = distributeMileage(dayInputs, targetMileage);

    // Ensure long run reflects the documented ~20% share when not overridden by locking/race/simulation.
    const longIdx = daySpecs.findIndex((s) => s.role === 'long');
    if (longIdx >= 0 && !dayInputs[longIdx].locked && dayInputs[longIdx].fixedMiles === undefined) {
      miles[longIdx] = roundToHalf(Math.max(miles[longIdx], targetMileage * LONG_RUN_PCT_OF_WEEKLY * 0.8));
    }

    const days: Workout[] = dayDates.map((date, i) =>
      buildDay(date, weekNumber, phase, isDownWeek, daySpecs[i].role, daySpecs[i].variant, daySpecs[i].drills, miles[i], weekIndexInPhase, ctx, daySpecs[i].race),
    );

    weeks.push({ weekNumber, startDate: weekStart, phase, isDownWeek, targetMileage, days });
  }

  return { weeks, adjustmentLog: Array.from(adjustmentsById.values()) };
}
