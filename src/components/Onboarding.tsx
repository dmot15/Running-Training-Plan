import { useState, type FormEvent } from 'react';
import { parseTimeToSeconds } from '../domain/paces';
import { MAX_MILEAGE_BY_EXPERIENCE, STARTING_MILEAGE_BY_EXPERIENCE } from '../domain/rules';
import { todayISO } from '../domain/dates';
import type { ExperienceLevel, TimeTrial, UserProfile } from '../domain/types';

interface Props {
  onComplete: (profile: Partial<UserProfile>) => void;
}

export default function Onboarding({ onComplete }: Props) {
  const [planStartDate, setPlanStartDate] = useState('2026-08-01');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('intermediate');
  const [startingWeeklyMileage, setStartingWeeklyMileage] = useState(STARTING_MILEAGE_BY_EXPERIENCE.intermediate);
  const [maxWeeklyMileageCap, setMaxWeeklyMileageCap] = useState(MAX_MILEAGE_BY_EXPERIENCE.intermediate);
  const [trialType, setTrialType] = useState<TimeTrial['type']>('mile');
  const [trialTime, setTrialTime] = useState('');

  function handleExperienceChange(level: ExperienceLevel) {
    setExperienceLevel(level);
    setStartingWeeklyMileage(STARTING_MILEAGE_BY_EXPERIENCE[level]);
    setMaxWeeklyMileageCap(MAX_MILEAGE_BY_EXPERIENCE[level]);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const timeTrials: TimeTrial[] = [];
    const seconds = parseTimeToSeconds(trialTime);
    if (seconds) timeTrials.push({ type: trialType, timeSeconds: seconds, date: todayISO() });

    onComplete({
      planStartDate,
      experienceLevel,
      startingWeeklyMileage,
      maxWeeklyMileageCap,
      timeTrials,
    });
  }

  return (
    <div className="card onboarding">
      <h1>Set up your plan</h1>
      <p className="muted">
        A base-building phase (10%/week mileage cap, a down week every 4th week) leads into build and peak/taper
        blocks as a race approaches, using B.A.A. Half Marathon-style workouts: progression runs, goal-pace tempo
        intervals, race-pace ladders, and periodic long-run &quot;simulations.&quot;
      </p>
      <form onSubmit={handleSubmit}>
        <label>
          Plan start date
          <input type="date" value={planStartDate} onChange={(e) => setPlanStartDate(e.target.value)} required />
        </label>

        <label>
          Experience level
          <select value={experienceLevel} onChange={(e) => handleExperienceChange(e.target.value as ExperienceLevel)}>
            <option value="beginner">Beginner (cap ~40 mi/wk)</option>
            <option value="intermediate">Intermediate (cap ~50 mi/wk)</option>
            <option value="advanced">Advanced (cap ~60 mi/wk)</option>
          </select>
        </label>

        <div className="row">
          <label>
            Starting weekly mileage
            <input
              type="number"
              min={5}
              max={100}
              step={0.5}
              value={startingWeeklyMileage}
              onChange={(e) => setStartingWeeklyMileage(Number(e.target.value))}
            />
          </label>
          <label>
            Max weekly mileage cap
            <input
              type="number"
              min={10}
              max={150}
              step={0.5}
              value={maxWeeklyMileageCap}
              onChange={(e) => setMaxWeeklyMileageCap(Number(e.target.value))}
            />
          </label>
        </div>

        <fieldset>
          <legend>Recent time trial (optional, for computing your paces)</legend>
          <div className="row">
            <label>
              Type
              <select value={trialType} onChange={(e) => setTrialType(e.target.value as TimeTrial['type'])}>
                <option value="mile">1 mile</option>
                <option value="5k">5K</option>
                <option value="10k">10K</option>
                <option value="half-marathon">Half Marathon</option>
              </select>
            </label>
            <label>
              Time (mm:ss or h:mm:ss)
              <input type="text" placeholder="6:45" value={trialTime} onChange={(e) => setTrialTime(e.target.value)} />
            </label>
          </div>
        </fieldset>

        <button type="submit" className="primary">
          Build my plan
        </button>
      </form>
    </div>
  );
}
