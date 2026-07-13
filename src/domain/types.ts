export type Phase = 'base' | 'build' | 'peak';

export type DayRole = 'easy' | 'hard' | 'medium' | 'long' | 'rest' | 'race';

export type WorkoutStatus = 'planned' | 'completed' | 'partial' | 'skipped' | 'modified';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type RaceDistance =
  | '800m'
  | '1600m/mile'
  | '3200m/2mile'
  | '5k'
  | '10k'
  | 'half-marathon'
  | 'marathon'
  | 'other';

export type RaceType = 'track' | 'road' | 'xc';

export interface TimeTrial {
  type: 'mile' | '5k' | '10k' | 'half-marathon';
  timeSeconds: number;
  date: string; // ISO date
}

export interface Paces {
  /** seconds per mile */
  milePace: number;
  /** seconds per mile */
  fiveKPace: number;
  /** seconds per mile, midpoint of the 30-40s/mile-over-5K-pace range */
  tempoPace: number;
  /** seconds per mile, Riegel-predicted from the 5K-equivalent effort */
  tenKPace: number;
  /** seconds per mile, Riegel-predicted from the 5K-equivalent effort */
  halfMarathonPace: number;
  /** seconds per 400m, derived from mile pace / 4 */
  per400: number;
  sourceTrial?: TimeTrial;
}

export interface UserProfile {
  planStartDate: string; // ISO date, defaults to Aug 1
  experienceLevel: ExperienceLevel;
  startingWeeklyMileage: number;
  maxWeeklyMileageCap: number;
  timeTrials: TimeTrial[];
  onboarded: boolean;
}

export interface Race {
  id: string;
  name: string;
  date: string; // ISO date
  distance: RaceDistance;
  type: RaceType;
  priority: 'A' | 'B';
  goalTimeSeconds?: number;
}

export interface Workout {
  id: string;
  date: string; // ISO date
  weekNumber: number;
  phase: Phase;
  role: DayRole;
  title: string;
  description: string;
  targetMiles?: number;
  isDownWeek: boolean;
  status: WorkoutStatus;
  raceId?: string;
  adaptationNote?: string;
  originalDescription?: string;
}

export interface Week {
  weekNumber: number;
  startDate: string; // ISO Monday
  phase: Phase;
  isDownWeek: boolean;
  targetMileage: number;
  days: Workout[];
}

export type Feel = 'great' | 'good' | 'ok' | 'hard' | 'very_hard';

export interface FeedbackEntry {
  workoutId: string;
  workoutDate: string;
  completed: 'yes' | 'partial' | 'no';
  feel?: Feel;
  pain: boolean;
  notes?: string;
  loggedAt: string;
}

export interface AdjustmentLogEntry {
  id: string;
  date: string; // ISO date logged
  weekNumber: number;
  reason: string;
  action: string;
}

export interface PlanState {
  weeks: Week[];
  adjustmentLog: AdjustmentLogEntry[];
}

export interface AppState {
  profile: UserProfile;
  races: Race[];
  plan: PlanState;
  feedback: Record<string, FeedbackEntry>; // keyed by workoutId
}
