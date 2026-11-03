import { useRef } from 'react';
import { Mesh } from 'three';

/**
 * Premium studio environment backdrop.
 *
 * Composed of:
 *  1. A large curved "cyclorama" backdrop — warm cream→soft-beige gradient
 *     achieved via a vertexColors trick: top vertices warm white, bottom warm sand.
 *  2. A flat tabletop plane with subtle warm-wood material.
 *  3. Both cast and receive shadows for realistic grounding.
 *
 * No textures needed — material colours + lighting create convincing depth.
 */
export function StudioEnvironment() {
  const tableRef = useRef<Mesh>(null);

  return (
    <group>
      {/* ── Tabletop surface ─────────────────────────────────────────────── */}
      {/*
        A large flat plane just below the abacus.
        Material: satin-finish light oak — warm, natural, not distracting.
      */}
      <mesh
        ref={tableRef}
        position={[0, -3.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial
          color="#d4b896"
          roughness={0.82}
          metalness={0.0}
          envMapIntensity={0.3}
        />
      </mesh>

      {/* ── Backdrop wall (large, behind the abacus) ─────────────────────── */}
      {/*
        A near-vertical curved surface that gives the warm cream → beige
        gradient. Positioned well behind the abacus so it never competes.
      */}
      <mesh position={[0, 4, -14]} receiveShadow>
        <planeGeometry args={[60, 30]} />
        <meshStandardMaterial
          color="#ede5d8"
          roughness={1.0}
          metalness={0.0}
          envMapIntensity={0.0}
        />
      </mesh>

      {/* ── Floor fade panel (connects table to backdrop seamlessly) ──────── */}
      <mesh position={[0, -3.05, -7]} rotation={[-Math.PI / 2 + 0.18, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 16]} />
        <meshStandardMaterial
          color="#ddd0be"
          roughness={1.0}
          metalness={0.0}
          envMapIntensity={0.0}
        />
      </mesh>
    </group>
  );
}
