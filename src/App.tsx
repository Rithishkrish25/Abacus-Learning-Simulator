import { useState, useCallback } from 'react';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { LevelScreen } from './screens/LevelScreen';
import { LevelMapScreen } from './screens/LevelMapScreen';
import { useAbacusStore } from './store/useAbacusStore';
import { useProgressStore } from './store/useProgressStore';
import { LEVEL_DEFINITIONS } from './levels/levelDefinitions';
import './index.css';

type AppView = 'welcome' | 'level' | 'map';

function App() {
  const [view,           setView]           = useState<AppView>('welcome');
  // Use a key to force full remount of LevelScreen when moving to a new level
  const [levelKey,       setLevelKey]       = useState(0);
  const [activeLevelIdx, setActiveLevelIdx] = useState(0);

  const reset       = useAbacusStore((s) => s.reset);
  const levelStatus = useProgressStore((s) => s.levelStatus);

  // ── Start / resume: jump to the first available (status=1) level ──
  const handleStart = useCallback(() => {
    const nextIdx = levelStatus.findIndex((s) => s === 1);
    const allDone = levelStatus.every((s) => s === 2);
    const idx = nextIdx >= 0 ? nextIdx : allDone ? 6 : 0;
    reset();
    setActiveLevelIdx(idx);
    setLevelKey((k) => k + 1);
    setView('level');
  }, [levelStatus, reset]);

  // ── Called by LevelScreen summary "NEXT LEVEL" button ──
  const handleLevelComplete = useCallback((completedIdx: number) => {
    reset();
    const nextIdx = completedIdx + 1;
    if (nextIdx < LEVEL_DEFINITIONS.length) {
      // Advance directly to next level — increment key to force remount
      setActiveLevelIdx(nextIdx);
      setLevelKey((k) => k + 1);
      setView('level');
    } else {
      // All 7 levels done → back to welcome
      setView('welcome');
    }
  }, [reset]);

  // ── Back button inside LevelScreen → welcome (not map) ──
  const handleBackFromLevel = useCallback(() => {
    reset();
    setView('welcome');
  }, [reset]);

  // ── "My Journey" opens the map as read-only review ──
  const handleReviewProgress = useCallback(() => {
    setView('map');
  }, []);

  const handleBackFromMap = useCallback(() => {
    setView('welcome');
  }, []);

  if (view === 'level') {
    return (
      <main className="app-root">
        <LevelScreen
          key={levelKey}
          levelIndex={activeLevelIdx}
          onBack={handleBackFromLevel}
          onLevelComplete={handleLevelComplete}
        />
      </main>
    );
  }

  if (view === 'map') {
    return (
      <LevelMapScreen
        onSelectLevel={(idx) => {
          reset();
          setActiveLevelIdx(idx);
          setLevelKey((k) => k + 1);
          setView('level');
        }}
        onBack={handleBackFromMap}
      />
    );
  }

  // default: welcome
  return (
    <WelcomeScreen
      onStart={handleStart}
      onReviewProgress={handleReviewProgress}
    />
  );
}

export default App;
