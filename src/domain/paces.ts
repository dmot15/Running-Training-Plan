import { FIVE_K_TO_MILE_OFFSET_SEC, MILE_TO_5K_OFFSET_SEC, RIEGEL_EXPONENT, TEMPO_OFFSET_SEC_RANGE } from './rules';
import type { Paces, TimeTrial } from './types';

const FIVE_K_MILES = 3.10686;
const TEN_K_MILES = 6.21371;
const HALF_MARATHON_MILES = 13.10938;

const TRIAL_DISTANCE_MILES: Record<TimeTrial['type'], number> = {
  mile: 1,
  '5k': FIVE_K_MILES,
  '10k': TEN_K_MILES,
  'half-marathon': HALF_MARATHON_MILES,
};

const tempoOffset = () => (TEMPO_OFFSET_SEC_RANGE[0] + TEMPO_OFFSET_SEC_RANGE[1]) / 2;

/** Riegel's race-time prediction formula: T2 = T1 * (D2/D1)^1.06, used to extend a single
 * time trial at any distance into pace estimates for other race distances. */
function riegelTime(knownSeconds: number, knownMiles: number, targetMiles: number): number {
  return knownSeconds * Math.pow(targetMiles / knownMiles, RIEGEL_EXPONENT);
}

/**
 * Derives mile / 5K / tempo / 10K / half-marathon pace (all seconds-per-mile) from the
 * most recent time trial.
 *
 * Mile and 5K trials use the clinic's exact formulas:
 *   1 mile TT + 33s = 5K pace
 *   5K TT pace/mile - 33s = mile pace
 *   5K pace + 30-40s = tempo pace
 * A 10K or half-marathon trial is first converted to a 5K-equivalent effort via Riegel's
 * formula, then the same offsets apply. 10K and half-marathon pace are always Riegel
 * predictions from the 5K-equivalent effort, regardless of which trial was entered.
 */
export function computePaces(trials: TimeTrial[]): Paces | undefined {
  if (trials.length === 0) return undefined;
  const latest = [...trials].sort((a, b) => b.date.localeCompare(a.date))[0];

  let milePace: number;
  let fiveKPace: number;

  if (latest.type === 'mile') {
    milePace = latest.timeSeconds;
    fiveKPace = milePace + MILE_TO_5K_OFFSET_SEC;
  } else if (latest.type === '5k') {
    fiveKPace = latest.timeSeconds / FIVE_K_MILES;
    milePace = fiveKPace - FIVE_K_TO_MILE_OFFSET_SEC;
  } else {
    const fiveKEquivalentSeconds = riegelTime(latest.timeSeconds, TRIAL_DISTANCE_MILES[latest.type], FIVE_K_MILES);
    fiveKPace = fiveKEquivalentSeconds / FIVE_K_MILES;
    milePace = fiveKPace - FIVE_K_TO_MILE_OFFSET_SEC;
  }

  const tempoPace = fiveKPace + tempoOffset();
  const per400 = milePace / 4;
  const fiveKTotalSeconds = fiveKPace * FIVE_K_MILES;
  const tenKPace = riegelTime(fiveKTotalSeconds, FIVE_K_MILES, TEN_K_MILES) / TEN_K_MILES;
  const halfMarathonPace = riegelTime(fiveKTotalSeconds, FIVE_K_MILES, HALF_MARATHON_MILES) / HALF_MARATHON_MILES;

  return { milePace, fiveKPace, tempoPace, tenKPace, halfMarathonPace, per400, sourceTrial: latest };
}

export function formatPace(secPerMile: number): string {
  const mins = Math.floor(secPerMile / 60);
  const secs = Math.round(secPerMile % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}/mi`;
}

export function formatSeconds(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function parseTimeToSeconds(input: string): number | undefined {
  const parts = input.trim().split(':').map((p) => Number(p));
  if (parts.some((p) => Number.isNaN(p))) return undefined;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return undefined;
}
