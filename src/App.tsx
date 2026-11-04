import { useState, useCallback } from 'react';
import { LevelMapScreen } from './screens/LevelMapScreen';
import { LevelScreen } from './screens/LevelScreen';
import { useAbacusStore } from './store/useAbacusStore';
import './index.css';

type AppView = 'map' | 'level';

function App() {
  const [view,         setView]         = useState<AppView>('map');
  const [activeLevelIdx, setActiveLevelIdx] = useState(0);
  const reset = useAbacusStore((s) => s.reset);

  const handleSelectLevel = useCallback((idx: number) => {
    reset();
    setActiveLevelIdx(idx);
    setView('level');
  }, [reset]);

  const handleBackToMap = useCallback(() => {
    reset();
    setView('map');
  }, [reset]);

  if (view === 'level') {
    return (
      <main className="app-root">
        <LevelScreen levelIndex={activeLevelIdx} onBack={handleBackToMap} />
      </main>
    );
  }

  return <LevelMapScreen onSelectLevel={handleSelectLevel} />;
}

export default App;
