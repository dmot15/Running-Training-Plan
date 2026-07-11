import { useState } from 'react';
import type { Feel, FeedbackEntry } from '../domain/types';

interface Props {
  existing?: FeedbackEntry;
  onSave: (entry: { completed: 'yes' | 'partial' | 'no'; feel?: Feel; pain: boolean; notes?: string }) => void;
}

const FEEL_OPTIONS: { value: Feel; label: string }[] = [
  { value: 'great', label: 'Great' },
  { value: 'good', label: 'Good' },
  { value: 'ok', label: 'OK' },
  { value: 'hard', label: 'Hard' },
  { value: 'very_hard', label: 'Very Hard' },
];

export default function FeedbackForm({ existing, onSave }: Props) {
  const [completed, setCompleted] = useState<'yes' | 'partial' | 'no'>(existing?.completed ?? 'yes');
  const [feel, setFeel] = useState<Feel | undefined>(existing?.feel);
  const [pain, setPain] = useState(existing?.pain ?? false);
  const [notes, setNotes] = useState(existing?.notes ?? '');

  return (
    <div className="feedback-form">
      <h4>How did it go?</h4>
      <div className="segmented">
        {(['yes', 'partial', 'no'] as const).map((v) => (
          <button key={v} type="button" className={completed === v ? 'chip chip-selected' : 'chip'} onClick={() => setCompleted(v)}>
            {v === 'yes' ? 'Completed' : v === 'partial' ? 'Partial' : 'Skipped'}
          </button>
        ))}
      </div>

      {completed !== 'no' && (
        <>
          <p className="field-label">How did it feel?</p>
          <div className="segmented">
            {FEEL_OPTIONS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={feel === f.value ? 'chip chip-selected' : 'chip'}
                onClick={() => setFeel(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </>
      )}

      <label className="checkbox-label">
        <input type="checkbox" checked={pain} onChange={(e) => setPain(e.target.checked)} />
        Pain / injury during or after
      </label>

      <label>
        Notes (optional)
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Sore calves, slept poorly, felt strong late..." />
      </label>

      <button
        type="button"
        className="primary"
        onClick={() => onSave({ completed, feel: completed === 'no' ? undefined : feel, pain, notes: notes || undefined })}
      >
        Save & update plan
      </button>
    </div>
  );
}
