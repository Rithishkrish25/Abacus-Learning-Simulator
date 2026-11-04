import {
  useRef,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { useSpring, animated } from '@react-spring/three';
import { useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Mesh, Plane, Vector3, Raycaster, Vector2, Color } from 'three';
import { BeadColour } from '../types/abacus';
import { useDragContext } from '../hooks/useDragContext';

// Soroban beads move vertically (Y-axis) on a rod that lies in the XY plane.
const DRAG_PLANE = new Plane(new Vector3(0, 0, 1), 0);
const _raycaster = new Raycaster();
const _ndc = new Vector2();
const _hit = new Vector3();

interface SorobanBeadProps {
  targetY: number;
  isActive: boolean;
  beadColour: BeadColour;
  radius?: number;
  minY: number;
  maxY: number;
  isHeavenBead: boolean;
  onClick: () => void;
  /** Legacy — kept for compatibility, not used (use onDragReleaseExact) */
  onDragRelease: (releaseY: number) => void;
  /** Preferred: receives exact world-Y of pointer release */
  onDragReleaseExact: (releaseY: number) => void;
}

export function SorobanBead({
  targetY,
  isActive,
  beadColour,
  radius = 0.36,
  minY,
  maxY,
  isHeavenBead,
  onClick,
  onDragReleaseExact,
}: SorobanBeadProps) {
  const meshRef = useRef<Mesh>(null);
  const { camera, gl } = useThree();
  const { setDragging } = useDragContext();

  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const drag = useRef({
    active: false,
    startClientY: 0,
    hasMoved: false,
    currentY: 0,
  });

  // ─── Spring ───────────────────────────────────────────────────────────────
  const [spring, api] = useSpring(() => ({
    posY: targetY,
    config: { tension: 380, friction: 32, mass: 0.7 },
  }));

  if (!drag.current.active) {
    api.start({ posY: targetY, config: { tension: 380, friction: 32, mass: 0.7 } });
  }

  // ─── Screen → world Y ─────────────────────────────────────────────────────
  const toWorldY = useCallback(
    (clientX: number, clientY: number): number => {
      const rect = gl.domElement.getBoundingClientRect();
      _ndc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      _raycaster.setFromCamera(_ndc, camera);
      _raycaster.ray.intersectPlane(DRAG_PLANE, _hit);
      return _hit.y;
    },
    [camera, gl.domElement],
  );

  // ─── Colours ──────────────────────────────────────────────────────────────
  const baseColour = useMemo(() => {
    const c = new Color(beadColour.colour);
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    const delta = (Math.random() - 0.5) * 0.04;
    c.setHSL(hsl.h, hsl.s, Math.max(0.05, Math.min(0.95, hsl.l + delta)));
    return c;
  }, [beadColour.colour]);

  const emissiveColour = useMemo(() => {
    const c = new Color(beadColour.colour);
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    if (hovered || isDragging) {
      c.setHSL(hsl.h, hsl.s * 0.6, Math.min(0.95, hsl.l + 0.18));
    } else if (isActive) {
      c.setHSL(hsl.h, hsl.s * 0.4, Math.min(0.95, hsl.l + 0.08));
    } else {
      c.setHSL(hsl.h, 0, 0);
    }
    return c;
  }, [beadColour.colour, hovered, isDragging, isActive]);

  const emissiveIntensity = hovered || isDragging ? 0.32 : isActive ? 0.08 : 0;

  // ─── Pointer handlers ─────────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      gl.domElement.setPointerCapture(e.pointerId);

      drag.current = {
        active: true,
        startClientY: e.nativeEvent.clientY,
        hasMoved: false,
        currentY: spring.posY.get() as number,
      };

      setIsDragging(true);
      setDragging(true);
      document.body.style.cursor = 'grabbing';

      const wy = toWorldY(e.nativeEvent.clientX, e.nativeEvent.clientY);
      api.start({ posY: Math.max(minY, Math.min(maxY, wy)), immediate: true });
    },
    [gl.domElement, spring.posY, toWorldY, minY, maxY, api, setDragging],
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!drag.current.active) return;
      e.stopPropagation();

      const dy = Math.abs(e.nativeEvent.clientY - drag.current.startClientY);
      if (dy > 4) drag.current.hasMoved = true;

      const wy = toWorldY(e.nativeEvent.clientX, e.nativeEvent.clientY);
      const clamped = Math.max(minY, Math.min(maxY, wy));
      drag.current.currentY = clamped;

      api.start({ posY: clamped, immediate: true });
    },
    [toWorldY, minY, maxY, api],
  );

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!drag.current.active) return;
      e.stopPropagation();
      gl.domElement.releasePointerCapture(e.pointerId);

      const { hasMoved, currentY } = drag.current;
      drag.current.active = false;

      setIsDragging(false);
      setDragging(false);
      document.body.style.cursor = hovered ? 'grab' : 'auto';

      if (hasMoved) {
        onDragReleaseExact(currentY);
      } else {
        onClick();
      }
    },
    [gl.domElement, hovered, onDragReleaseExact, onClick, setDragging],
  );

  const handlePointerEnter = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(true);
      if (!drag.current.active) document.body.style.cursor = 'grab';
    },
    [],
  );

  const handlePointerLeave = useCallback(
    (_e: ThreeEvent<PointerEvent>) => {
      setHovered(false);
      if (!drag.current.active) document.body.style.cursor = 'auto';
    },
    [],
  );

  // Heaven beads: flattened diamond shape (wider along rod axis)
  // Earth beads: classic lenticular (flattened along Z)
  const scaleZ = isHeavenBead ? 0.70 : 0.72;
  const scaleX = isHeavenBead ? 1.18 : 1.0;

  return (
    <animated.mesh
      ref={meshRef}
      position-x={0}
      position-y={spring.posY}
      position-z={0}
      scale={[scaleX, 1, scaleZ]}
      castShadow
      receiveShadow
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <sphereGeometry args={[radius, 32, 20]} />
      <meshStandardMaterial
        color={baseColour}
        roughness={beadColour.roughness}
        metalness={beadColour.metalness}
        envMapIntensity={1.0}
        emissive={emissiveColour}
        emissiveIntensity={emissiveIntensity}
      />
    </animated.mesh>
  );
}
