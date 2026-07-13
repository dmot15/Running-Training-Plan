import { describe, expect, it } from 'vitest';
import { roundToHalf } from './format';
import { computePaces, formatPace } from './paces';
import { regeneratePlan } from './planGenerator';
import { defaultAppState } from './storage';
import type { Race } from './types';

function isHalfOrWhole(n: number): boolean {
  return Number.isInteger(n * 2);
}

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

  it('round-trips a 10K time trial back to the same 10K pace via Riegel', () => {
    // 50:00 10K -> pace/mi = 3000 / 6.21371
    const paces = computePaces([{ type: '10k', timeSeconds: 3000, date: '2026-07-01' }]);
    expect(paces?.tenKPace).toBeCloseTo(3000 / 6.21371, 3);
  });

  it('round-trips a half-marathon time trial back to the same half-marathon pace via Riegel', () => {
    // 1:45:00 half marathon -> pace/mi = 6300 / 13.10938
    const paces = computePaces([{ type: 'half-marathon', timeSeconds: 6300, date: '2026-07-01' }]);
    expect(paces?.halfMarathonPace).toBeCloseTo(6300 / 13.10938, 3);
  });

  it('predicts progressively slower per-mile pace at longer race distances', () => {
    const paces = computePaces([{ type: '5k', timeSeconds: 1200, date: '2026-07-01' }]);
    expect(paces).toBeDefined();
    expect(paces!.milePace).toBeLessThan(paces!.fiveKPace);
    expect(paces!.fiveKPace).toBeLessThan(paces!.tenKPace);
    expect(paces!.tenKPace).toBeLessThan(paces!.halfMarathonPace);
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
    // Every non-down week grows by exactly 10% over the previous non-down week, rounded to
    // the nearest half mile.
    expect(plan.weeks[1].targetMileage).toBe(22); // roundToHalf(20 * 1.10)
    expect(plan.weeks[2].targetMileage).toBe(24); // roundToHalf(22 * 1.10) = roundToHalf(24.2)
    for (let i = 1; i < plan.weeks.length; i++) {
      if (plan.weeks[i].isDownWeek) continue;
      if (plan.weeks[i - 1].isDownWeek) continue;
      expect(plan.weeks[i].targetMileage).toBe(roundToHalf(plan.weeks[i - 1].targetMileage * 1.1));
    }
  });

  it('rounds every weekly and daily mileage figure to the nearest half mile', () => {
    const state = defaultAppState('2026-08-01');
    state.profile.startingWeeklyMileage = 21.3; // a non-half starting value, to confirm it gets rounded too
    state.profile.maxWeeklyMileageCap = 47.2;
    const plan = regeneratePlan(state.profile, [], state.plan, {}, '2026-08-01');
    for (const week of plan.weeks) {
      expect(isHalfOrWhole(week.targetMileage)).toBe(true);
      for (const day of week.days) {
        if (day.targetMiles !== undefined) expect(isHalfOrWhole(day.targetMiles)).toBe(true);
      }
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

  it('keeps build growing at 10%/week (no step-down into build) and holds peak flat at the highest build week until a 2-week taper', () => {
    const state = defaultAppState('2026-08-01');
    state.profile.startingWeeklyMileage = 20;
    state.profile.maxWeeklyMileageCap = 50;
    const race: Race = { id: 'r1', name: 'Fall Race', date: '2026-11-21', distance: '10k', type: 'road', priority: 'A' };
    const plan = regeneratePlan(state.profile, [race], state.plan, {}, '2026-08-01');

    const baseWeeks = plan.weeks.filter((w) => w.phase === 'base');
    const buildWeeks = plan.weeks.filter((w) => w.phase === 'build');
    const peakWeeks = plan.weeks.filter((w) => w.phase === 'peak');
    expect(buildWeeks.length).toBeGreaterThan(0);
    expect(peakWeeks.length).toBeGreaterThan(2);

    // The build phase's first week should be a straight 10% continuation from the base phase's
    // last week (no 15%-style step-down at the base->build boundary).
    const lastBase = baseWeeks[baseWeeks.length - 1];
    const firstBuild = buildWeeks[0];
    if (!lastBase.isDownWeek && !firstBuild.isDownWeek) {
      expect(firstBuild.targetMileage).toBe(roundToHalf(lastBase.targetMileage * 1.1));
    }

    const highestBuildMileage = Math.max(...buildWeeks.map((w) => w.targetMileage));
    const nonTaperPeakWeeks = peakWeeks.slice(0, -2);
    for (const w of nonTaperPeakWeeks) {
      if (w.isDownWeek) continue; // an adaptation-triggered cut, not the normal case
      expect(w.targetMileage).toBe(highestBuildMileage);
    }

    // The final 2 weeks (taper into the race) should be lower than the flat peak mileage.
    const [taperWeek, raceWeek] = peakWeeks.slice(-2);
    expect(taperWeek.targetMileage).toBeLessThan(highestBuildMileage);
    expect(raceWeek.targetMileage).toBeLessThan(taperWeek.targetMileage);
  });
});

describe('regeneratePlan (B.A.A.-style workouts, always)', () => {
  it('uses B.A.A. workout menus in every phase, and for any race type (or no race at all)', () => {
    const state = defaultAppState('2026-08-01');
    const race: Race = { id: 'r1', name: 'Conference Meet', date: '2026-12-05', distance: '1600m/mile', type: 'track', priority: 'A' };
    const plan = regeneratePlan(state.profile, [race], state.plan, {}, '2026-08-01');

    const allDays = plan.weeks.flatMap((w) => w.days);
    const baseHardTitles = allDays.filter((d) => d.phase === 'base' && d.role === 'hard').map((d) => d.title);
    const buildHardTitles = allDays.filter((d) => d.phase === 'build' && d.role === 'hard').map((d) => d.title);
    const peakHardTitles = allDays.filter((d) => d.phase === 'peak' && d.role === 'hard').map((d) => d.title);

    // Base and build both use progression runs / goal-pace tempo intervals — there's no
    // separate "base style" any more, and no track-specific content anywhere, regardless of
    // this race being a track race.
    const baaHardTitles = new Set(['Hard: Progression Run', 'Hard: Goal-Pace Tempo Intervals']);
    expect(baseHardTitles.length).toBeGreaterThan(0);
    expect(baseHardTitles.every((t) => baaHardTitles.has(t))).toBe(true);
    expect(buildHardTitles.every((t) => baaHardTitles.has(t))).toBe(true);
    expect(peakHardTitles.some((t) => t === 'Hard: Progression Run' || t === 'Hard: Race-Pace Ladder')).toBe(true);

    // At least one periodic "simulation" long run appears in the peak phase, and its scheduled
    // mileage matches the segment actually described in the workout text (e.g. "6 mi easy, 6 mi
    // at goal pace, 2 mi easy" must total the same number shown on the day card).
    const simulationRuns = allDays.filter((d) => d.title === 'Long Run: Race Simulation');
    expect(simulationRuns.length).toBeGreaterThan(0);
    for (const run of simulationRuns) {
      const match = run.description.match(/(\d+) mi easy, (\d+) mi at goal pace.*?, (\d+) mi easy/);
      expect(match).not.toBeNull();
      const [, before, atGoal, after] = match!.map(Number);
      expect(run.targetMiles).toBe(before + atGoal + after);
    }

    // The taper's hard "sharpener" day (4 days before the race). Looked up by date rather than
    // week-block, since it may land in the final week or the one before it depending on where
    // the race date falls relative to the fixed weekly cadence.
    const dayByDate = new Map(allDays.map((d) => [d.date, d]));
    expect(dayByDate.get('2026-12-01')?.title).toBe('Hard: Race-Week Sharpener');
  });

  it('gives the long run roughly 30% of weekly mileage, not the old ~20% share', () => {
    const state = defaultAppState('2026-08-01');
    state.profile.startingWeeklyMileage = 30;
    state.profile.maxWeeklyMileageCap = 50;
    const plan = regeneratePlan(state.profile, [], state.plan, {}, '2026-08-01');
    for (const week of plan.weeks) {
      if (week.isDownWeek) continue;
      const longDay = week.days.find((d) => d.role === 'long');
      expect(longDay?.targetMiles).toBeDefined();
      const share = longDay!.targetMiles! / week.targetMileage;
      expect(share).toBeGreaterThan(0.25);
    }
  });

  it('drives goal pace for road workouts from the race\'s goal time when set', () => {
    const state = defaultAppState('2026-08-01');
    const race: Race = {
      id: 'r1',
      name: 'Fall Half',
      date: '2026-12-05',
      distance: 'half-marathon',
      type: 'road',
      priority: 'A',
      goalTimeSeconds: 6300, // 1:45:00 -> goal pace = 6300/13 ≈ 484.6 s/mi = 8:05/mi
    };
    const plan = regeneratePlan(state.profile, [race], state.plan, {}, '2026-08-01');
    const tempoDay = plan.weeks.flatMap((w) => w.days).find((d) => d.phase === 'build' && d.title === 'Hard: Goal-Pace Tempo Intervals');
    expect(tempoDay?.description).toContain('Goal pace: 8:0');
  });

  it('builds the full taper window correctly even when the race date falls on the first day of its week-block', () => {
    // 2026-08-01 is a Saturday, so week-blocks run Sat-Fri; 2026-12-05 is also a Saturday and
    // lands exactly 18*7 days later, i.e., precisely on a block boundary, so the 6 taper days
    // before it fall entirely in the *previous* block. Regression test for that alignment bug.
    const state = defaultAppState('2026-08-01');
    const race: Race = { id: 'r1', name: 'Fall Half', date: '2026-12-05', distance: 'half-marathon', type: 'road', priority: 'A' };
    const plan = regeneratePlan(state.profile, [race], state.plan, {}, '2026-08-01');

    const raceDay = plan.weeks.flatMap((w) => w.days).find((d) => d.role === 'race');
    expect(raceDay?.date).toBe('2026-12-05');

    // All 6 days before the race, across whichever week-blocks they fall in, should carry the
    // taper's day-by-day roles (easy/medium/hard-taper), not the normal template.
    const dayByDate = new Map(plan.weeks.flatMap((w) => w.days).map((d) => [d.date, d]));
    expect(dayByDate.get('2026-12-04')?.role).toBe('easy'); // 1 day before: pre-race jog
    expect(dayByDate.get('2026-12-01')?.title).toBe('Hard: Race-Week Sharpener'); // 4 days before: sharpener
    expect(dayByDate.get('2026-11-28')?.role).not.toBe('rest'); // 7 days before: outside the taper window, normal training
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
