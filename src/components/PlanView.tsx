import { useMemo, useState } from 'react';
import { todayISO } from '../domain/dates';
import type { AppState, Feel, Workout } from '../domain/types';
import DayDetail from './DayDetail';
import { ROLE_CLASS, ROLE_LABEL } from './roleMeta';

interface Props {
  state: AppState;
  onSaveFeedback: (workout: Workout, entry: { completed: 'yes' | 'partial' | 'no'; feel?: Feel; pain: boolean; notes?: string }) => void;
}

const PHASE_LABEL: Record<string, string> = { base: 'Base', build: 'Build', peak: 'Peak' };

export default function PlanView({ state, onSaveFeedback }: Props) {
  const today = todayISO();
  const [selected, setSelected] = useState<Workout | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);

  const currentWeekIdx = useMemo(() => {
    const idx = state.plan.weeks.findIndex((w) => {
      const lastDay = w.days[w.days.length - 1]?.date;
      return lastDay >= today;
    });
    return idx === -1 ? 0 : idx;
  }, [state.plan.weeks, today]);

  const startIdx = Math.max(0, currentWeekIdx);
  const weeksToShow = state.plan.weeks.slice(startIdx, startIdx + visibleCount);

  if (state.plan.weeks.length === 0) {
    return <p className="muted">No plan generated yet.</p>;
  }

  return (
    <div>
      {state.plan.adjustmentLog.length > 0 && (
        <details className="card adjustment-log">
          <summary>Adjustment log ({state.plan.adjustmentLog.length})</summary>
          <ul>
            {[...state.plan.adjustmentLog]
              .reverse()
              .slice(0, 20)
              .map((a) => (
                <li key={a.id}>
                  <strong>Week {a.weekNumber}:</strong> {a.reason} — {a.action}
                </li>
              ))}
          </ul>
        </details>
      )}

      {weeksToShow.map((week) => (
        <div key={week.weekNumber} className="card week-card">
          <div className="week-header">
            <h3>
              Week {week.weekNumber} · {PHASE_LABEL[week.phase]}
              {week.isDownWeek ? <span className="badge role-rest"> Down week</span> : null}
            </h3>
            <span className="muted">{week.targetMileage} mi target</span>
          </div>
          <div className="day-grid">
            {week.days.map((day) => {
              const isToday = day.date === today;
              const feedback = state.feedback[day.id];
              return (
                <button
                  key={day.id}
                  className={`day-card ${isToday ? 'day-today' : ''} status-${day.status}`}
                  onClick={() => setSelected(day)}
                >
                  <div className="day-card-top">
                    <span className="day-date">
                      {new Date(day.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className={`badge ${ROLE_CLASS[day.role]}`}>{ROLE_LABEL[day.role]}</span>
                  </div>
                  <div className="day-title">{day.title}</div>
                  {day.targetMiles ? <div className="day-miles">{day.targetMiles} mi</div> : null}
                  {day.status !== 'planned' && <div className="day-status">{day.status}{feedback?.pain ? ' · pain flagged' : ''}</div>}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {startIdx + visibleCount < state.plan.weeks.length && (
        <button className="secondary" onClick={() => setVisibleCount((v) => v + 6)}>
          Show more weeks
        </button>
      )}

      {selected && (
        <DayDetail
          workout={selected}
          feedback={state.feedback[selected.id]}
          onClose={() => setSelected(null)}
          onSave={(entry) => onSaveFeedback(selected, entry)}
        />
      )}
    </div>
  );
}
