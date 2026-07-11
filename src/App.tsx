import { useState } from 'react';
import Onboarding from './components/Onboarding';
import PlanView from './components/PlanView';
import RaceManager from './components/RaceManager';
import Settings from './components/Settings';
import { todayISO } from './domain/dates';
import { useAppState } from './state/useAppState';

type Tab = 'plan' | 'races' | 'settings';

export default function App() {
  const { state, allWorkoutsByDate, completeOnboarding, updateProfile, addRace, updateRace, deleteRace, logFeedback, resetAll } =
    useAppState();
  const [tab, setTab] = useState<Tab>('plan');

  if (!state.profile.onboarded) {
    return (
      <div className="app-shell">
        <Onboarding onComplete={completeOnboarding} />
      </div>
    );
  }

  const todayWorkout = allWorkoutsByDate.get(todayISO());

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Running Training Plan</h1>
        <nav className="tabs">
          <button className={tab === 'plan' ? 'tab tab-active' : 'tab'} onClick={() => setTab('plan')}>
            Plan
          </button>
          <button className={tab === 'races' ? 'tab tab-active' : 'tab'} onClick={() => setTab('races')}>
            Races
          </button>
          <button className={tab === 'settings' ? 'tab tab-active' : 'tab'} onClick={() => setTab('settings')}>
            Settings
          </button>
        </nav>
      </header>

      {tab === 'plan' && todayWorkout && (
        <TodayBanner workoutTitle={todayWorkout.title} role={todayWorkout.role} onOpen={() => setTab('plan')} />
      )}

      <main>
        {tab === 'plan' && <PlanView state={state} onSaveFeedback={logFeedback} />}
        {tab === 'races' && <RaceManager races={state.races} onAdd={addRace} onUpdate={updateRace} onDelete={deleteRace} />}
        {tab === 'settings' && <Settings profile={state.profile} onUpdate={updateProfile} onReset={resetAll} />}
      </main>
    </div>
  );
}

function TodayBanner({ workoutTitle, role, onOpen }: { workoutTitle: string; role: string; onOpen: () => void }) {
  return (
    <div className="today-banner" onClick={onOpen}>
      Today: <strong>{workoutTitle}</strong> <span className="muted">({role})</span>
    </div>
  );
}

