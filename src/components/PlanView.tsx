import { useEffect, useMemo, useRef, useState } from 'react';
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
  const selectedChipRef = useRef<HTMLButtonElement | null>(null);

  const currentWeekIdx = useMemo(() => {
    const idx = state.plan.weeks.findIndex((w) => {
      const lastDay = w.days[w.days.length - 1]?.date;
      return lastDay >= today;
    });
    return idx === -1 ? 0 : idx;
  }, [state.plan.weeks, today]);

  const [selectedWeekIdx, setSelectedWeekIdx] = useState(currentWeekIdx);

  useEffect(() => {
    setSelectedWeekIdx(currentWeekIdx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.plan.weeks.length]);

  useEffect(() => {
    selectedChipRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedWeekIdx]);

  if (state.plan.weeks.length === 0) {
    return <p className="muted">No plan generated yet.</p>;
  }

  const week = state.plan.weeks[selectedWeekIdx] ?? state.plan.weeks[0];

  return (
    <div>
      <div className="week-strip" role="tablist" aria-label="Select a week">
        {state.plan.weeks.map((w, idx) => {
          const isSelected = idx === selectedWeekIdx;
          const isCurrent = idx === currentWeekIdx;
          return (
            <button
              key={w.weekNumber}
              ref={isSelected ? selectedChipRef : undefined}
              role="tab"
              aria-selected={isSelected}
              className={`week-chip ${isSelected ? 'week-chip-selected' : ''}`}
              onClick={() => setSelectedWeekIdx(idx)}
            >
              {isCurrent && <span className="week-chip-current-dot" title="Current week" />}
              <span className="wk-num">Week {w.weekNumber}</span>
              <span className="wk-phase">{PHASE_LABEL[w.phase]}{w.isDownWeek ? ' · Down' : ''}</span>
              <span className="wk-miles">{w.targetMileage} mi</span>
            </button>
          );
        })}
      </div>

      <div className="card week-card">
        <div className="week-header">
          <h3>
            Week {week.weekNumber} · {PHASE_LABEL[week.phase]}
            {week.isDownWeek ? <span className="badge role-rest"> Down week</span> : null}
          </h3>
          <span className="muted">{week.targetMileage} mi target</span>
        </div>
        <div className="day-row">
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
