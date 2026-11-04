import { Canvas } from '@react-three/fiber';
import {
  Environment,
  ContactShadows,
  OrbitControls,
  useProgress,
} from '@react-three/drei';
import { Suspense, useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { ACESFilmicToneMapping } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { AbacusFrame, getRodXPositions } from './AbacusFrame';
import { AbacusRod } from './AbacusRod';
import { StudioEnvironment } from './StudioEnvironment';
import { ResponsiveCamera } from './ResponsiveCamera';
import { useAbacusStore } from '../store/useAbacusStore';
import { DragContext } from '../hooks/useDragContext';
import { BeadColour } from '../types/abacus';

// Earth bead colours — one per rod (Ten-Thousands → Ones)
const BEAD_PALETTE: BeadColour[] = [
  { colour: '#b83232', roughness: 0.30, metalness: 0.0 },  // red
  { colour: '#c07828', roughness: 0.32, metalness: 0.0 },  // orange
  { colour: '#3a7d44', roughness: 0.30, metalness: 0.0 },  // green
  { colour: '#2e6fa0', roughness: 0.30, metalness: 0.0 },  // blue
  { colour: '#7b3fa0', roughness: 0.30, metalness: 0.0 },  // purple
];

// Heaven bead — creamy white/ivory across all rods
const HEAVEN_COLOUR: BeadColour = {
  colour: '#e8dcc8',
  roughness: 0.28,
  metalness: 0.0,
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface AbacusSceneProps {
  /** Rod indices to highlight (lesson mode) */
  highlightRods?: number[];
  /**
   * When false the canvas wrapper is hidden via CSS (visibility:hidden,
   * pointer-events:none) but is NOT unmounted. This keeps the WebGL context
   * alive so the warm-up Canvas in App.tsx can pre-load the HDR environment
   * without creating a visible scene. The Canvas is unmounted naturally when
   * the parent view is replaced (never two Canvases alive simultaneously).
   */
  visible?: boolean;
}

// ─── SceneReadyReporter ───────────────────────────────────────────────────────
// Mounted inside the Canvas so it has access to R3F context.
// Uses drei's useProgress (module-level singleton across all Canvases) to
// report load completion back to the outer React tree via a callback.

interface SceneReadyReporterProps {
  onReady: () => void;
}

function SceneReadyReporter({ onReady }: SceneReadyReporterProps) {
  const { active } = useProgress();

  useEffect(() => {
    // active=false means all items registered with THREE.DefaultLoadingManager
    // have completed (or there were none — cache hit path).
    // Call onReady on the first frame where active is false.
    if (!active) {
      onReady();
    }
  }, [active, onReady]);

  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AbacusScene({ highlightRods = [], visible = true }: AbacusSceneProps) {
  const rods = useAbacusStore((s) => s.rods);
  const rodXPositions = getRodXPositions();
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const [anyDragging, setAnyDragging] = useState(false);

  // sceneReady: true once all drei/Three.js assets have finished loading.
  // Initialises to false so the loading overlay is shown immediately on mount.
  const [sceneReady, setSceneReady] = useState(false);

  const handleSceneReady = useCallback(() => {
    setSceneReady(true);
  }, []);

  const setDragging = useCallback((v: boolean) => {
    setAnyDragging(v);
    if (orbitRef.current) orbitRef.current.enabled = !v;
  }, []);

  const dragContextValue = useMemo(() => ({ setDragging }), [setDragging]);

  // Show the loading overlay only when this instance is the visible one and
  // assets haven't finished yet. The hidden warm-up Canvas never shows it.
  const showLoader = visible && !sceneReady;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        // CSS-hide without unmounting to preserve the WebGL context.
        // The warm-up Canvas in App.tsx uses visible=false; the LevelScreen
        // Canvas always uses visible=true (the default).
        visibility: visible ? 'visible' : 'hidden',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <DragContext.Provider value={dragContextValue}>
        <Canvas
          shadows="soft"
          camera={{ position: [0, 0.5, 11.5], fov: 34, near: 0.1, far: 120 }}
          gl={{
            antialias: true,
            toneMapping: ACESFilmicToneMapping,
            toneMappingExposure: 0.95,
          }}
          style={{ background: '#e8ddd0' }}
          onCreated={({ gl }) => {
            gl.domElement.style.touchAction = 'none';
          }}
        >
          {/* Reports load completion to outer React tree */}
          <SceneReadyReporter onReady={handleSceneReady} />

          <ResponsiveCamera />

          <Suspense fallback={null}>
            <Environment preset="apartment" background={false} />

            <directionalLight
              position={[-5, 9, 6]} intensity={2.8} color="#fff3e0" castShadow
              shadow-mapSize={[1024, 1024]}
              shadow-camera-near={1} shadow-camera-far={50}
              shadow-camera-left={-14} shadow-camera-right={14}
              shadow-camera-top={12} shadow-camera-bottom={-12}
              shadow-bias={-0.0003} shadow-normalBias={0.02}
            />
            <directionalLight position={[8, 4, 3]} intensity={0.55} color="#e8f0ff" />
            <pointLight position={[4, 6, -7]} intensity={1.1} color="#ffe8c0" distance={22} decay={2} />
            <pointLight position={[0, -2, 4]} intensity={0.28} color="#f5e8d0" distance={12} decay={2} />
            <ambientLight intensity={0.18} color="#fdf6ee" />

            <StudioEnvironment />

            <group position={[0, 0.1, 0]} rotation={[-0.04, 0.02, 0]}>
              <AbacusFrame />
              {rods.map((rod, i) => (
                <AbacusRod
                  key={rod.rodIndex}
                  rodIndex={rod.rodIndex}
                  positionX={rodXPositions[i] ?? 0}
                  heavenActive={rod.heavenActive}
                  earthActive={rod.earthActive}
                  beadColour={BEAD_PALETTE[i % BEAD_PALETTE.length] ?? BEAD_PALETTE[0]!}
                  heavenColour={HEAVEN_COLOUR}
                  highlighted={highlightRods.includes(i)}
                />
              ))}
            </group>

            <ContactShadows position={[0, -3.5, 0]} opacity={0.62} scale={22} blur={1.8} far={4} color="#3a2510" />
            <ContactShadows position={[0, -3.5, 0]} opacity={0.22} scale={30} blur={5.5} far={6} color="#2a1a08" />
          </Suspense>

          <OrbitControls
            ref={orbitRef}
            enabled={!anyDragging}
            enablePan={false}
            enableZoom={true}
            enableDamping={true}
            dampingFactor={0.07}
            minDistance={6}
            maxDistance={20}
            minPolarAngle={Math.PI / 8}
            maxPolarAngle={Math.PI / 2.1}
            minAzimuthAngle={-Math.PI / 2.5}
            maxAzimuthAngle={Math.PI / 2.5}
            target={[0, 0, 0]}
            makeDefault
          />
        </Canvas>
      </DragContext.Provider>

      {/* ── Loading overlay ──────────────────────────────────────────────────
          Shown only while this Canvas is the visible one (i.e. LevelScreen's
          Canvas) AND assets are still loading.
          Disappears the moment useProgress reports active=false.
          Never shown for the hidden warm-up Canvas in App.tsx.          ── */}
      {showLoader && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#e8ddd0',
            zIndex: 10,
            gap: '1rem',
          }}
          aria-live="polite"
          aria-label="Loading 3D Soroban scene"
        >
          <div style={{ fontSize: '2.5rem' }}>🧮</div>
          <div style={{
            width: '160px',
            height: '6px',
            background: 'rgba(160,120,60,0.18)',
            borderRadius: '3px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #8a3a14, #c07828)',
              borderRadius: '3px',
              animation: 'ls-loading-shimmer 1.4s ease-in-out infinite',
            }} />
          </div>
          <p style={{
            fontSize: '0.82rem',
            color: '#7a5c38',
            textAlign: 'center',
            lineHeight: 1.5,
            margin: 0,
          }}>
            சோரோபன் தயாராகிறது…<br />
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Loading Soroban…</span>
          </p>
        </div>
      )}
    </div>
  );
}
