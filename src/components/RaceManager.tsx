import { useState, type FormEvent } from 'react';
import { parseTimeToSeconds, formatSeconds } from '../domain/paces';
import type { Race, RaceDistance, RaceType } from '../domain/types';

interface Props {
  races: Race[];
  onAdd: (race: Race) => void;
  onUpdate: (id: string, updates: Partial<Race>) => void;
  onDelete: (id: string) => void;
}

const DISTANCES: RaceDistance[] = ['800m', '1600m/mile', '3200m/2mile', '5k', '10k', 'half-marathon', 'marathon', 'other'];

export default function RaceManager({ races, onAdd, onUpdate, onDelete }: Props) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [distance, setDistance] = useState<RaceDistance>('5k');
  const [type, setType] = useState<RaceType>('road');
  const [priority, setPriority] = useState<'A' | 'B'>('A');
  const [goalTime, setGoalTime] = useState('');

  const sorted = [...races].sort((a, b) => a.date.localeCompare(b.date));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name || !date) return;
    const goalTimeSeconds = parseTimeToSeconds(goalTime);
    onAdd({
      id: crypto.randomUUID(),
      name,
      date,
      distance,
      type,
      priority,
      goalTimeSeconds,
    });
    setName('');
    setDate('');
    setGoalTime('');
  }

  return (
    <div>
      <div className="card">
        <h3>Add a race</h3>
        <p className="muted">
          Adding an <strong>A</strong> race rebuilds the plan from today toward it: base → speed-endurance build → peak,
          with a taper in the final week. <strong>B</strong> races just get inserted as that week&apos;s hard day.
        </p>
        <form onSubmit={handleSubmit}>
          <label>
            Race name
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="City Half Marathon" />
          </label>
          <div className="row">
            <label>
              Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <label>
              Distance
              <select value={distance} onChange={(e) => setDistance(e.target.value as RaceDistance)}>
                {DISTANCES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="row">
            <label>
              Type
              <select value={type} onChange={(e) => setType(e.target.value as RaceType)}>
                <option value="road">Road</option>
                <option value="track">Track</option>
                <option value="xc">Cross Country / Trail</option>
              </select>
            </label>
            <label>
              Priority
              <select value={priority} onChange={(e) => setPriority(e.target.value as 'A' | 'B')}>
                <option value="A">A (goal race — full taper)</option>
                <option value="B">B (tune-up)</option>
              </select>
            </label>
          </div>
          <label>
            Goal time (optional, mm:ss or h:mm:ss)
            <input value={goalTime} onChange={(e) => setGoalTime(e.target.value)} placeholder="19:30" />
          </label>
          <button type="submit" className="primary">
            Add race
          </button>
        </form>
      </div>

      {sorted.length > 0 && (
        <div className="card">
          <h3>Your races</h3>
          <ul className="race-list">
            {sorted.map((r) => (
              <li key={r.id}>
                <div>
                  <strong>{r.name}</strong> <span className="badge">{r.priority}</span>
                  <div className="muted">
                    {new Date(r.date + 'T00:00:00').toLocaleDateString(undefined, { dateStyle: 'medium' })} · {r.distance} · {r.type}
                    {r.goalTimeSeconds ? ` · goal ${formatSeconds(r.goalTimeSeconds)}` : ''}
                  </div>
                </div>
                <div className="race-actions">
                  <button
                    className="secondary"
                    onClick={() => onUpdate(r.id, { priority: r.priority === 'A' ? 'B' : 'A' })}
                  >
                    Make {r.priority === 'A' ? 'B' : 'A'}
                  </button>
                  <button className="danger" onClick={() => onDelete(r.id)}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
