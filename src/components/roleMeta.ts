import type { DayRole } from '../domain/types';

export const ROLE_LABEL: Record<DayRole, string> = {
  easy: 'Easy',
  hard: 'Hard',
  medium: 'Medium',
  long: 'Long',
  rest: 'Rest',
  race: 'Race',
};

export const ROLE_CLASS: Record<DayRole, string> = {
  easy: 'role-easy',
  hard: 'role-hard',
  medium: 'role-medium',
  long: 'role-long',
  rest: 'role-rest',
  race: 'role-race',
};
