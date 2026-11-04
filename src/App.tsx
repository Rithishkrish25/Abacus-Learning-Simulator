import { useState, useCallback } from 'react';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { LevelScreen } from './screens/LevelScreen';
import { LevelMapScreen } from './screens/LevelMapScreen';
import { AbacusScene } from './components/AbacusScene';
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
      <>
        <LevelMapScreen
          onSelectLevel={(idx) => {
            reset();
            setActiveLevelIdx(idx);
            setLevelKey((k) => k + 1);
            setView('level');
          }}
          onBack={handleBackFromMap}
        />
        {/* Keep a hidden AbacusScene mounted so the WebGL context and HDR
            environment asset stay warm while the user browses the level map.
            When LevelScreen mounts it will reuse the already-compiled shaders
            and cached environment texture. */}
        <div style={{ position: 'fixed', width: 1, height: 1, opacity: 0, pointerEvents: 'none', overflow: 'hidden', top: 0, left: 0 }} aria-hidden="true">
          <AbacusScene visible={false} />
        </div>
      </>
    );
  }

  // default: welcome — render a tiny hidden AbacusScene so WebGL + HDR
  // environment initialises while the user reads the welcome screen.
  // By the time they click START, most of the 5-second cost is already paid.
  return (
    <>
      <WelcomeScreen
        onStart={handleStart}
        onReviewProgress={handleReviewProgress}
      />
      {/* Warm-up canvas: 1×1 px, invisible, no pointer events.
          Starts WebGL context + loads Environment preset in the background. */}
      <div
        style={{ position: 'fixed', width: 1, height: 1, opacity: 0, pointerEvents: 'none', overflow: 'hidden', top: 0, left: 0 }}
        aria-hidden="true"
      >
        <AbacusScene visible={false} />
      </div>
    </>
  );
}

export default App;
