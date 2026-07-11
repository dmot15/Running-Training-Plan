import { MAX_MILEAGE_BY_EXPERIENCE, STARTING_MILEAGE_BY_EXPERIENCE } from './rules';
import type { AppState } from './types';

const STORAGE_KEY = 'rtp:v1';

export function defaultAppState(planStartDate: string): AppState {
  return {
    profile: {
      planStartDate,
      experienceLevel: 'intermediate',
      startingWeeklyMileage: STARTING_MILEAGE_BY_EXPERIENCE.intermediate,
      maxWeeklyMileageCap: MAX_MILEAGE_BY_EXPERIENCE.intermediate,
      timeTrials: [],
      onboarded: false,
    },
    races: [],
    plan: { weeks: [], adjustmentLog: [] },
    feedback: {},
  };
}

export function loadAppState(planStartDate: string): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAppState(planStartDate);
    const parsed = JSON.parse(raw) as AppState;
    return parsed;
  } catch {
    return defaultAppState(planStartDate);
  }
}

export function saveAppState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearAppState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
