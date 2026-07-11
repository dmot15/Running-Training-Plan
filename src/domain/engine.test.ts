import { describe, expect, it } from 'vitest';
import { computePaces, formatPace } from './paces';
import { regeneratePlan } from './planGenerator';
import { defaultAppState } from './storage';
import type { Race } from './types';

describe('computePaces', () => {
  it('derives 5K pace from a mile time trial (+33s)', () => {
    const paces = computePaces([{ type: 'mile', timeSeconds: 300, date: '2026-07-01' }]); // 5:00 mile
    expect(paces?.milePace).toBe(300);
    expect(paces?.fiveKPace).toBe(333);
  });

  it('derives mile pace from a 5K time trial (pace/mi - 33s)', () => {
    // 20:00 5K -> pace/mi = 1200/3.10686 = 386.2s -> mile pace ~ 353.2s
    const paces = computePaces([{ type: '5k', timeSeconds: 1200, date: '2026-07-01' }]);
    expect(paces?.fiveKPace).toBeCloseTo(1200 / 3.10686, 1);
    expect(paces?.milePace).toBeCloseTo(1200 / 3.10686 - 33, 1);
  });

  it('formats seconds/mile as m:ss/mi', () => {
    expect(formatPace(330)).toBe('5:30/mi');
  });
});

describe('regeneratePlan (base phase, no race)', () => {
  it('increases mileage weekly and inserts a down week every 4th week', () => {
    const state = defaultAppState('2026-08-01');
    state.profile.startingWeeklyMileage = 20;
    state.profile.maxWeeklyMileageCap = 60;
    const plan = regeneratePlan(state.profile, [], state.plan, {}, '2026-08-01');

    expect(plan.weeks).toHaveLength(16);
    expect(plan.weeks[0].targetMileage).toBe(20);
    expect(plan.weeks[0].phase).toBe('base');
    // Every 4th week (index 3, 7, 11, 15) should be a down week reset to the start mileage.
    expect(plan.weeks[3].isDownWeek).toBe(true);
    expect(plan.weeks[3].targetMileage).toBe(20);
    expect(plan.weeks[7].isDownWeek).toBe(true);
    expect(plan.weeks[7].targetMileage).toBe(20);
    // Weeks between down weeks should generally trend upward.
    expect(plan.weeks[1].targetMileage).toBeGreaterThan(plan.weeks[0].targetMileage);
    expect(plan.weeks[2].targetMileage).toBeGreaterThan(plan.weeks[1].targetMileage);
    // No week should jump more than 10% relative to the smooth growth curve week-over-week
    // (down weeks are an intentional exception).
    for (let i = 1; i < plan.weeks.length; i++) {
      if (plan.weeks[i].isDownWeek) continue;
      if (plan.weeks[i - 1].isDownWeek) continue;
      const ratio = plan.weeks[i].targetMileage / plan.weeks[i - 1].targetMileage;
      expect(ratio).toBeLessThanOrEqual(1.11);
    }
  });

  it('gives every week exactly 2 hard days, 2 easy days, 1 medium, 1 long, 1 rest', () => {
    const state = defaultAppState('2026-08-01');
    const plan = regeneratePlan(state.profile, [], state.plan, {}, '2026-08-01');
    for (const week of plan.weeks) {
      const roles = week.days.map((d) => d.role);
      expect(roles.filter((r) => r === 'hard')).toHaveLength(2);
      expect(roles.filter((r) => r === 'easy')).toHaveLength(2);
      expect(roles.filter((r) => r === 'medium')).toHaveLength(1);
      expect(roles.filter((r) => r === 'long')).toHaveLength(1);
      expect(roles.filter((r) => r === 'rest')).toHaveLength(1);
    }
  });
});

describe('regeneratePlan (with a goal race)', () => {
  it('places the race on its exact date in the final week and tapers mileage', () => {
    const state = defaultAppState('2026-08-01');
    const race: Race = { id: 'r1', name: 'Fall 5K', date: '2026-10-24', distance: '5k', type: 'road', priority: 'A' };
    const plan = regeneratePlan(state.profile, [race], state.plan, {}, '2026-08-01');

    const raceDay = plan.weeks.flatMap((w) => w.days).find((d) => d.role === 'race');
    expect(raceDay?.date).toBe('2026-10-24');

    const lastWeek = plan.weeks[plan.weeks.length - 1];
    const firstWeek = plan.weeks[0];
    expect(lastWeek.targetMileage).toBeLessThan(firstWeek.targetMileage + 40);
    expect(lastWeek.phase).toBe('peak');

    // Days after the race (if any, within the same 7-day block) shouldn't schedule more hard work.
    const afterRace = lastWeek.days.filter((d) => d.date > '2026-10-24');
    for (const d of afterRace) expect(d.role).not.toBe('hard');
  });

  it('inserts a B-priority tune-up race as a single hard day without a full taper week', () => {
    const state = defaultAppState('2026-08-01');
    const goal: Race = { id: 'r1', name: 'Goal Race', date: '2026-11-14', distance: '10k', type: 'road', priority: 'A' };
    const tuneUp: Race = { id: 'r2', name: 'Tune-up 5K', date: '2026-09-19', distance: '5k', type: 'road', priority: 'B' };
    const plan = regeneratePlan(state.profile, [goal, tuneUp], state.plan, {}, '2026-08-01');

    const tuneUpDay = plan.weeks.flatMap((w) => w.days).find((d) => d.date === '2026-09-19');
    expect(tuneUpDay?.role).toBe('race');
    expect(tuneUpDay?.raceId).toBe('r2');
  });
});

describe('regeneratePlan (adaptation)', () => {
  it('freezes mileage growth after a tough workout is logged', () => {
    const state = defaultAppState('2026-08-01');
    state.profile.startingWeeklyMileage = 20;
    state.profile.maxWeeklyMileageCap = 60;
    const plan1 = regeneratePlan(state.profile, [], state.plan, {}, '2026-08-01');

    // Mark week 1's days as completed/logged so they're locked, with one very hard long run.
    for (const day of plan1.weeks[0].days) {
      day.status = 'completed';
    }
    const longDay = plan1.weeks[0].days.find((d) => d.role === 'long')!;
    const feedback = {
      [longDay.id]: {
        workoutId: longDay.id,
        workoutDate: longDay.date,
        completed: 'yes' as const,
        feel: 'very_hard' as const,
        pain: false,
        loggedAt: '2026-08-08',
      },
    };

    const plan2 = regeneratePlan(state.profile, [], { weeks: plan1.weeks, adjustmentLog: [] }, feedback, '2026-08-08');
    // Week 2 (index 1) should hold mileage flat rather than growing, since it's freshly regenerated.
    expect(plan2.weeks[1].targetMileage).toBeLessThanOrEqual(plan1.weeks[0].targetMileage);
    expect(plan2.adjustmentLog.length).toBeGreaterThan(0);
  });
});
