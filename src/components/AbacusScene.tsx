import { Canvas } from '@react-three/fiber';
import {
  Environment,
  ContactShadows,
  OrbitControls,
} from '@react-three/drei';
import { Suspense, useRef, useState, useCallback, useMemo } from 'react';
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

interface AbacusSceneProps {
  /** Rod indices to highlight (lesson mode) */
  highlightRods?: number[];
}

export function AbacusScene({ highlightRods = [] }: AbacusSceneProps) {
  const rods = useAbacusStore((s) => s.rods);
  const rodXPositions = getRodXPositions();
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const [anyDragging, setAnyDragging] = useState(false);

  const setDragging = useCallback((v: boolean) => {
    setAnyDragging(v);
    if (orbitRef.current) orbitRef.current.enabled = !v;
  }, []);

  const dragContextValue = useMemo(() => ({ setDragging }), [setDragging]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
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
          <ResponsiveCamera />

          <Suspense fallback={null}>
            <Environment preset="apartment" background={false} />

            <directionalLight
              position={[-5, 9, 6]} intensity={2.8} color="#fff3e0" castShadow
              shadow-mapSize={[2048, 2048]}
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
    </div>
  );
}
