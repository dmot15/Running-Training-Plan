import type { Feel, FeedbackEntry, Workout } from '../domain/types';
import FeedbackForm from './FeedbackForm';
import { ROLE_CLASS, ROLE_LABEL } from './roleMeta';

interface Props {
  workout: Workout;
  feedback?: FeedbackEntry;
  onClose: () => void;
  onSave: (entry: { completed: 'yes' | 'partial' | 'no'; feel?: Feel; pain: boolean; notes?: string }) => void;
}

export default function DayDetail({ workout, feedback, onClose, onSave }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} aria-label="Close">
          ×
        </button>
        <span className={`badge ${ROLE_CLASS[workout.role]}`}>{ROLE_LABEL[workout.role]}</span>
        <h3>{workout.title}</h3>
        <p className="muted">
          {new Date(workout.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          {workout.targetMiles ? ` · ~${workout.targetMiles} mi` : ''}
          {workout.isDownWeek ? ' · Down week' : ''}
        </p>
        <p className="description">{workout.description}</p>
        {workout.adaptationNote && <p className="adaptation-note">Adjusted: {workout.adaptationNote}</p>}

        {workout.role !== 'rest' && <FeedbackForm existing={feedback} onSave={(entry) => { onSave(entry); onClose(); }} />}
      </div>
    </div>
  );
}
