import { formatPace } from './paces';
import {
  BASE_HARD_WORKOUT_MENU,
  BASE_TEMPO_WORKOUT,
  BUILD_TEMPO_WORKOUT,
  BUILD_TRACK_WORKOUT_MENU,
  CORE_NOTE,
  GOAL_PACE_TEMPO_MENU,
  HM_SIMULATION_SEGMENTS,
  PEAK_TAPER_TRACK_WORKOUT_MENU,
  PEAK_TRACK_WORKOUT_MENU,
  PROGRESSION_RUN_MENU,
  RACE_PACE_LADDER_MENU,
  RACE_WEEK_ROAD_MENU,
  RACE_WEEK_TRACK_WORKOUT_MENU,
  STRETCH_NOTE,
} from './rules';
import type { DayRole, Paces, Race } from './types';

export type Variant =
  | 'hill-fartlek'
  | 'tempo-base'
  | 'track-build'
  | 'tempo-build'
  | 'track-peak'
  | 'track-peak-taper'
  | 'track-race-taper'
  | 'progression-run'
  | 'goal-pace-tempo'
  | 'race-pace-ladder'
  | 'race-week-road'
  | 'hm-simulation';

/** Goal/10K/5K pace for the road-race workout menus (seconds per mile). */
export interface RoadPaces {
  goalPace?: number;
  tenKPace?: number;
  fiveKPace?: number;
}

function pick<T>(menu: T[], index: number): T {
  return menu[((index % menu.length) + menu.length) % menu.length];
}

function paceCheatSheet(paces?: Paces): string {
  if (!paces) return '';
  return `\n\nYour paces — Mile: ${formatPace(paces.milePace)} · 5K: ${formatPace(paces.fiveKPace)} · Tempo: ${formatPace(paces.tempoPace)}`;
}

function roadPaceCheatSheet(roadPaces?: RoadPaces): string {
  if (!roadPaces) return '';
  const parts: string[] = [];
  if (roadPaces.goalPace) parts.push(`Goal pace: ${formatPace(roadPaces.goalPace)}`);
  if (roadPaces.tenKPace) parts.push(`10K pace: ${formatPace(roadPaces.tenKPace)}`);
  if (roadPaces.fiveKPace) parts.push(`5K pace: ${formatPace(roadPaces.fiveKPace)}`);
  return parts.length ? `\n\nYour paces — ${parts.join(' · ')}` : '';
}

export function hardWorkoutContent(
  variant: Variant,
  weekIndex: number,
  paces?: Paces,
  roadPaces?: RoadPaces,
): { title: string; description: string } {
  switch (variant) {
    case 'hill-fartlek':
      return { title: 'Hard: Hills / Fartlek', description: pick(BASE_HARD_WORKOUT_MENU, weekIndex) + paceCheatSheet(paces) };
    case 'tempo-base':
      return { title: 'Hard: Tempo Run', description: BASE_TEMPO_WORKOUT + paceCheatSheet(paces) };
    case 'track-build':
      return { title: 'Hard: Track Ladder', description: pick(BUILD_TRACK_WORKOUT_MENU, weekIndex) + paceCheatSheet(paces) };
    case 'tempo-build':
      return { title: 'Hard: Tempo Run', description: BUILD_TEMPO_WORKOUT + paceCheatSheet(paces) };
    case 'track-peak':
      return { title: 'Hard: Speed Endurance', description: pick(PEAK_TRACK_WORKOUT_MENU, weekIndex) + paceCheatSheet(paces) };
    case 'track-peak-taper':
      return { title: 'Hard: Speed Endurance (shorter/faster)', description: pick(PEAK_TAPER_TRACK_WORKOUT_MENU, weekIndex) + paceCheatSheet(paces) };
    case 'track-race-taper':
      return {
        title: 'Hard: Race-Week Sharpener (≤2 mi of hard reps)',
        description: pick(RACE_WEEK_TRACK_WORKOUT_MENU, weekIndex) + paceCheatSheet(paces),
      };
    case 'progression-run':
      return { title: 'Hard: Progression Run', description: pick(PROGRESSION_RUN_MENU, weekIndex) + roadPaceCheatSheet(roadPaces) };
    case 'goal-pace-tempo':
      return { title: 'Hard: Goal-Pace Tempo Intervals', description: pick(GOAL_PACE_TEMPO_MENU, weekIndex) + roadPaceCheatSheet(roadPaces) };
    case 'race-pace-ladder':
      return { title: 'Hard: Race-Pace Ladder', description: pick(RACE_PACE_LADDER_MENU, weekIndex) + roadPaceCheatSheet(roadPaces) };
    case 'race-week-road':
      return {
        title: 'Hard: Race-Week Sharpener',
        description: pick(RACE_WEEK_ROAD_MENU, weekIndex) + roadPaceCheatSheet(roadPaces),
      };
    case 'hm-simulation':
      // Only ever used on the 'long' role (see contentForRole); hardWorkoutContent shouldn't
      // be called with it, but a menu entry keeps this switch exhaustive and safe.
      return { title: 'Hard: Race Simulation', description: 'See long run for today.' };
  }
}

/** The single source of truth for which simulation segment a given peak-phase week uses,
 * so the mileage set on the day (see planGenerator.ts) always matches this description. */
export function simulationSegmentFor(weekIndex: number) {
  return pick(HM_SIMULATION_SEGMENTS, weekIndex);
}

export function simulationLongContent(miles: number, weekIndex: number, roadPaces?: RoadPaces): { title: string; description: string } {
  const segment = simulationSegmentFor(weekIndex);
  const paceNote = roadPaces?.goalPace ? ` (${formatPace(roadPaces.goalPace)}/mi)` : '';
  return {
    title: 'Long Run: Race Simulation',
    description: `${segment.easyBefore} mi easy, ${segment.atGoalPace} mi at goal pace${paceNote}, ${segment.easyAfter} mi easy (~${miles} mi total). A dress rehearsal for race-day pacing and fueling. ${STRETCH_NOTE}`,
  };
}

export function easyContent(miles: number, withDrills: boolean): { title: string; description: string } {
  return {
    title: 'Easy Recovery',
    description: `${CORE_NOTE}${withDrills ? ' + running drills' : ''}. ${miles} mi easy + a few strides. ${STRETCH_NOTE}`,
  };
}

export function mediumContent(miles: number): { title: string; description: string } {
  return { title: 'Medium — As You Feel', description: `${miles} mi at a "as you feel" medium effort. ${STRETCH_NOTE}` };
}

export function longContent(miles: number): { title: string; description: string } {
  return { title: 'Long Run', description: `${miles} mi long run (about 20% of weekly mileage). Keep it conversational. ${STRETCH_NOTE}` };
}

export function restContent(): { title: string; description: string } {
  return { title: 'Rest', description: 'Day off, or a very easy 15-20 min jog if you feel like moving. Listen to your body.' };
}

export function preRaceContent(): { title: string; description: string } {
  return { title: 'Pre-Race', description: `Easy jog + a few strides to stay loose. ${STRETCH_NOTE}` };
}

export function raceContent(race: Race, miles: number): { title: string; description: string } {
  const label = race.priority === 'A' ? 'GOAL RACE' : 'Tune-up Race';
  const goal = race.goalTimeSeconds ? ` Goal: ${formatPace(race.goalTimeSeconds)} total.` : '';
  return {
    title: `${label}: ${race.name}`,
    description: `${race.distance} (${race.type}) — race day! ~${miles} mi total with warmup/cooldown.${goal}`,
  };
}

/**
 * A general-purpose paragraph explaining what a run type is for and how it should feel —
 * shown alongside (not instead of) the specific prescribed workout for the day.
 */
export const ROLE_EXPLANATION: Record<DayRole, string> = {
  easy: 'Easy recovery runs are the foundation of the week, not filler. Run at a relaxed, conversational pace — you should be able to talk in full sentences the whole way. Their job is to add aerobic volume and blood flow to your legs without adding fatigue, so you show up fresh for the next hard day. Resist the urge to push the pace here; a "fast" easy run borrows energy from the workout that actually needs it.',
  hard: 'Hard days are where fitness actually gets built: hills, fartlek, track intervals, or tempo work run at a genuinely demanding effort. The plan schedules exactly two of these a week and surrounds them with recovery, because the adaptation happens during rest, not during the workout itself. Warm up and cool down properly, hit the effort or pace called for, and if a rep starts falling apart, it is fine to ease off rather than force it.',
  medium: 'Medium days are a flexible middle gear — more substantial than an easy jog but not a hard effort. Run this one "as you feel": if your legs are lively, drift toward a moderate, purposeful pace; if you are still carrying fatigue from the last hard day, keep it closer to easy. It is a day to listen to your body rather than hit a number.',
  long: 'The long run is the week\'s single biggest dose of aerobic development, built up gradually to roughly 20% of your weekly mileage. Keep the effort conversational, especially in the first half — the point is time on your feet and durability, not speed. It is normal for the last mile or two to feel harder; that is exactly the stimulus this run is for.',
  rest: 'A rest day (or a very easy 15-20 minute jog if you would rather move than sit still) is not wasted time — it is when your body actually absorbs the training you have already done and comes back stronger. Skipping rest days to "make up" mileage tends to backfire by carrying fatigue into the next hard session. If you are feeling beat up, this is also the day to tell the plan so it can back off.',
  race: 'Race day is the payoff for the whole training cycle. Warm up the way you have practiced, settle into your goal effort early rather than sprinting the first mile, and trust the fitness the base, build, and taper phases were built to produce. However it goes, log how it felt afterward — that feedback shapes whatever comes next.',
};

export function contentForRole(
  role: DayRole,
  miles: number,
  opts: { variant?: Variant; weekIndex: number; paces?: Paces; roadPaces?: RoadPaces; withDrills?: boolean; race?: Race },
): { title: string; description: string } {
  switch (role) {
    case 'hard':
      return hardWorkoutContent(opts.variant ?? 'hill-fartlek', opts.weekIndex, opts.paces, opts.roadPaces);
    case 'easy':
      return easyContent(miles, !!opts.withDrills);
    case 'medium':
      return mediumContent(miles);
    case 'long':
      return opts.variant === 'hm-simulation'
        ? simulationLongContent(miles, opts.weekIndex, opts.roadPaces)
        : longContent(miles);
    case 'rest':
      return restContent();
    case 'race':
      return opts.race ? raceContent(opts.race, miles) : preRaceContent();
  }
}
