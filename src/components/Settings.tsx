import { useState, type FormEvent } from 'react';
import { computePaces, formatPace, formatSeconds, parseTimeToSeconds } from '../domain/paces';
import { todayISO } from '../domain/dates';
import type { ExperienceLevel, TimeTrial, UserProfile } from '../domain/types';

interface Props {
  profile: UserProfile;
  onUpdate: (profile: Partial<UserProfile>) => void;
  onReset: () => void;
}

const TRIAL_LABEL: Record<TimeTrial['type'], string> = {
  mile: '1 mile',
  '5k': '5K',
  '10k': '10K',
  'half-marathon': 'Half Marathon',
};

export default function Settings({ profile, onUpdate, onReset }: Props) {
  const [trialType, setTrialType] = useState<TimeTrial['type']>('mile');
  const [trialTime, setTrialTime] = useState('');
  const paces = computePaces(profile.timeTrials);

  function addTrial(e: FormEvent) {
    e.preventDefault();
    const seconds = parseTimeToSeconds(trialTime);
    if (!seconds) return;
    const trial: TimeTrial = { type: trialType, timeSeconds: seconds, date: todayISO() };
    onUpdate({ timeTrials: [...profile.timeTrials, trial] });
    setTrialTime('');
  }

  return (
    <div>
      <div className="card">
        <h3>Profile</h3>
        <label>
          Plan start date
          <input type="date" value={profile.planStartDate} onChange={(e) => onUpdate({ planStartDate: e.target.value })} />
        </label>
        <label>
          Experience level
          <select value={profile.experienceLevel} onChange={(e) => onUpdate({ experienceLevel: e.target.value as ExperienceLevel })}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <div className="row">
          <label>
            Starting weekly mileage
            <input
              type="number"
              step={0.5}
              value={profile.startingWeeklyMileage}
              onChange={(e) => onUpdate({ startingWeeklyMileage: Number(e.target.value) })}
            />
          </label>
          <label>
            Max weekly mileage cap
            <input
              type="number"
              step={0.5}
              value={profile.maxWeeklyMileageCap}
              onChange={(e) => onUpdate({ maxWeeklyMileageCap: Number(e.target.value) })}
            />
          </label>
        </div>
      </div>

      <div className="card">
        <h3>Your paces</h3>
        {paces ? (
          <p>
            5K: <strong>{formatPace(paces.fiveKPace)}</strong> · Mile: <strong>{formatPace(paces.milePace)}</strong> · Tempo:{' '}
            <strong>{formatPace(paces.tempoPace)}</strong> · 10K: <strong>{formatPace(paces.tenKPace)}</strong> · Half Marathon:{' '}
            <strong>{formatPace(paces.halfMarathonPace)}</strong>
          </p>
        ) : (
          <p className="muted">Add a time trial below to compute your paces.</p>
        )}
        <p className="muted">10K and half-marathon paces are predicted from your most recent trial (Riegel formula) unless you enter one directly.</p>
        <form onSubmit={addTrial}>
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
              <input value={trialTime} onChange={(e) => setTrialTime(e.target.value)} placeholder="6:45" />
            </label>
          </div>
          <button type="submit" className="secondary">
            Add time trial
          </button>
        </form>
        {profile.timeTrials.length > 0 && (
          <ul className="trial-list">
            {[...profile.timeTrials]
              .reverse()
              .map((t, i) => (
                <li key={i}>
                  {t.date}: {TRIAL_LABEL[t.type]} in {formatSeconds(t.timeSeconds)}
                </li>
              ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h3>Danger zone</h3>
        <button
          className="danger"
          onClick={() => {
            if (confirm('Reset all data (profile, races, plan, logged feedback)? This cannot be undone.')) onReset();
          }}
        >
          Reset all data
        </button>
      </div>
    </div>
  );
}
