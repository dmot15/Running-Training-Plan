import { useEffect, useMemo, useState } from 'react';
import { todayISO } from '../domain/dates';
import { regeneratePlan } from '../domain/planGenerator';
import { defaultAppState, loadAppState, saveAppState } from '../domain/storage';
import type { AppState, Feel, FeedbackEntry, Race, UserProfile, Workout } from '../domain/types';

const DEFAULT_START_DATE = '2026-08-01';

export function useAppState() {
  const [state, setState] = useState<AppState>(() => loadAppState(DEFAULT_START_DATE));

  useEffect(() => {
    saveAppState(state);
  }, [state]);

  function regenerate(next: Pick<AppState, 'profile' | 'races' | 'plan' | 'feedback'>): AppState {
    const plan = regeneratePlan(next.profile, next.races, next.plan, next.feedback, todayISO());
    return { ...next, plan };
  }

  function completeOnboarding(profile: Partial<UserProfile>) {
    setState((prev) => {
      const merged: UserProfile = { ...prev.profile, ...profile, onboarded: true };
      return regenerate({ ...prev, profile: merged, plan: { weeks: [], adjustmentLog: [] } });
    });
  }

  function updateProfile(profile: Partial<UserProfile>) {
    setState((prev) => regenerate({ ...prev, profile: { ...prev.profile, ...profile } }));
  }

  function addRace(race: Race) {
    setState((prev) => regenerate({ ...prev, races: [...prev.races, race] }));
  }

  function updateRace(id: string, updates: Partial<Race>) {
    setState((prev) => regenerate({ ...prev, races: prev.races.map((r) => (r.id === id ? { ...r, ...updates } : r)) }));
  }

  function deleteRace(id: string) {
    setState((prev) => regenerate({ ...prev, races: prev.races.filter((r) => r.id !== id) }));
  }

  function logFeedback(workout: Workout, entry: { completed: 'yes' | 'partial' | 'no'; feel?: Feel; pain: boolean; notes?: string }) {
    setState((prev) => {
      const feedbackEntry: FeedbackEntry = {
        workoutId: workout.id,
        workoutDate: workout.date,
        completed: entry.completed,
        feel: entry.feel,
        pain: entry.pain,
        notes: entry.notes,
        loggedAt: new Date().toISOString(),
      };
      const status = entry.completed === 'yes' ? 'completed' : entry.completed === 'partial' ? 'partial' : 'skipped';
      const plan = {
        ...prev.plan,
        weeks: prev.plan.weeks.map((w) => ({
          ...w,
          days: w.days.map((d) => (d.id === workout.id ? { ...d, status: status as Workout['status'] } : d)),
        })),
      };
      const feedback = { ...prev.feedback, [workout.id]: feedbackEntry };
      return regenerate({ ...prev, plan, feedback });
    });
  }

  function resetAll() {
    setState(defaultAppState(DEFAULT_START_DATE));
  }

  const allWorkoutsByDate = useMemo(() => {
    const map = new Map<string, Workout>();
    for (const w of state.plan.weeks) for (const d of w.days) map.set(d.date, d);
    return map;
  }, [state.plan]);

  return {
    state,
    allWorkoutsByDate,
    completeOnboarding,
    updateProfile,
    addRace,
    updateRace,
    deleteRace,
    logFeedback,
    resetAll,
  };
}
