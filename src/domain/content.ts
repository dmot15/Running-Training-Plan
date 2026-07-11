import { formatPace } from './paces';
import {
  BASE_HARD_WORKOUT_MENU,
  BASE_TEMPO_WORKOUT,
  BUILD_TEMPO_WORKOUT,
  BUILD_TRACK_WORKOUT_MENU,
  CORE_NOTE,
  PEAK_TAPER_TRACK_WORKOUT_MENU,
  PEAK_TRACK_WORKOUT_MENU,
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
  | 'track-race-taper';

function pick<T>(menu: T[], index: number): T {
  return menu[((index % menu.length) + menu.length) % menu.length];
}

function paceCheatSheet(paces?: Paces): string {
  if (!paces) return '';
  return `\n\nYour paces — Mile: ${formatPace(paces.milePace)} · 5K: ${formatPace(paces.fiveKPace)} · Tempo: ${formatPace(paces.tempoPace)}`;
}

export function hardWorkoutContent(variant: Variant, weekIndex: number, paces?: Paces): { title: string; description: string } {
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
  }
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

export function contentForRole(
  role: DayRole,
  miles: number,
  opts: { variant?: Variant; weekIndex: number; paces?: Paces; withDrills?: boolean; race?: Race },
): { title: string; description: string } {
  switch (role) {
    case 'hard':
      return hardWorkoutContent(opts.variant ?? 'hill-fartlek', opts.weekIndex, opts.paces);
    case 'easy':
      return easyContent(miles, !!opts.withDrills);
    case 'medium':
      return mediumContent(miles);
    case 'long':
      return longContent(miles);
    case 'rest':
      return restContent();
    case 'race':
      return opts.race ? raceContent(opts.race, miles) : preRaceContent();
  }
}
