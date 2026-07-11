import { DEFAULT_WEEKLY_MILEAGE_INCREASE_PCT, MAX_WEEKLY_MILEAGE_INCREASE_PCT } from './rules';
import type { FeedbackEntry } from './types';

export type WeekMode = 'grow-max' | 'grow-default' | 'freeze' | 'down';

export interface ModeDecision {
  mode: WeekMode;
  reason: string;
}

const TOUGH_FEELS = new Set(['hard', 'very_hard']);

/**
 * "Athletes should be encouraged to 'listen to their body' and let the
 * coach know if more recovery is needed." This turns recent feedback into
 * a decision about how the upcoming week's mileage/intensity should move.
 */
export function decideWeekMode(recentFeedback: FeedbackEntry[]): ModeDecision {
  if (recentFeedback.some((f) => f.pain)) {
    return { mode: 'down', reason: 'Pain or injury reported in a recent workout — inserting an extra recovery week.' };
  }

  const toughCount = recentFeedback.filter(
    (f) => (f.feel && TOUGH_FEELS.has(f.feel)) || f.completed === 'no',
  ).length;

  if (toughCount >= 2) {
    return { mode: 'down', reason: 'Multiple tough or missed sessions recently — taking an extra recovery week before building again.' };
  }
  if (toughCount === 1) {
    return { mode: 'freeze', reason: 'A recent session felt tough — holding mileage steady before increasing again.' };
  }

  const goodCount = recentFeedback.filter(
    (f) => f.feel && (f.feel === 'great' || f.feel === 'good') && f.completed === 'yes',
  ).length;

  if (goodCount >= 3 && recentFeedback.length >= 3) {
    return { mode: 'grow-max', reason: 'Recent workouts have felt strong — progressing at the full 10%/week cap.' };
  }

  return { mode: 'grow-default', reason: 'Standard progression.' };
}

export function growthPctForMode(mode: WeekMode): number {
  switch (mode) {
    case 'grow-max':
      return MAX_WEEKLY_MILEAGE_INCREASE_PCT;
    case 'grow-default':
      return DEFAULT_WEEKLY_MILEAGE_INCREASE_PCT;
    default:
      return 0;
  }
}
