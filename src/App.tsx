import { useState, useCallback } from 'react';
import { ModeSelectScreen } from './screens/ModeSelectScreen';
import { BasicsLesson } from './screens/BasicsLesson';
import { PracticeScreen } from './screens/PracticeScreen';
import { ChallengeScreen } from './screens/ChallengeScreen';
import { ProgressDashboard } from './screens/ProgressDashboard';
import { ArithmeticScreen } from './screens/ArithmeticScreen';
import { useAbacusStore } from './store/useAbacusStore';
import './index.css';

export type AppScreen = 'home' | 'basics' | 'practice' | 'challenge' | 'progress' | 'arithmetic';

function App() {
  const [screen, setScreen] = useState<AppScreen>('home');
  const reset = useAbacusStore((s) => s.reset);

  const handleNavigate = useCallback(
    (target: AppScreen) => {
      reset();
      setScreen(target);
    },
    [reset],
  );

  if (screen === 'home') {
    return <ModeSelectScreen onNavigate={handleNavigate} />;
  }

  if (screen === 'basics') {
    return (
      <main className="app-root">
        <BasicsLesson onNavigate={handleNavigate} />
      </main>
    );
  }

  if (screen === 'practice') {
    return (
      <main className="app-root">
        <PracticeScreen onNavigate={handleNavigate} />
      </main>
    );
  }

  if (screen === 'challenge') {
    return (
      <main className="app-root">
        <ChallengeScreen onNavigate={handleNavigate} />
      </main>
    );
  }

  if (screen === 'arithmetic') {
    return (
      <main className="app-root">
        <ArithmeticScreen onNavigate={handleNavigate} />
      </main>
    );
  }

  // progress
  return (
    <main className="app-root">
      <ProgressDashboard onNavigate={handleNavigate} />
    </main>
  );
}

export default App;
