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

// ─── Drag plane ───────────────────────────────────────────────────────────────
// Beads travel in the Z=0 world plane (rod plane).
// The abacus group has a tiny tilt (−0.06 rad X, +0.04 rad Y) that we ignore
// since the error is < 0.5% — imperceptible in practice.
const DRAG_PLANE = new Plane(new Vector3(0, 0, 1), 0);
const _raycaster = new Raycaster();
const _ndc = new Vector2();
const _hit = new Vector3();

interface InteractiveBeadProps {
  /** Resting target X (rod-local world units) */
  targetX: number;
  /** Y in rod-local space — always 0, bead sits on rod centreline */
  rodY: number;
  isActive: boolean;
  beadColour: BeadColour;
  radius?: number;
  /** Left rod wall — minimum drag X */
  minX: number;
  /** Right rod wall — maximum drag X */
  maxX: number;
  /** Short tap without significant movement */
  onClick: () => void;
  /** Fired on pointer-up after a real drag; arg is the clamped release X */
  onDragRelease: (releaseX: number) => void;
}

export function InteractiveBead({
  targetX,
  rodY,
  isActive,
  beadColour,
  radius = 0.38,
  minX,
  maxX,
  onClick,
  onDragRelease,
}: InteractiveBeadProps) {
  const meshRef = useRef<Mesh>(null);
  const { camera, gl } = useThree();
  const { setDragging } = useDragContext();

  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Mutable drag state — no re-render needed while finger is moving
  const drag = useRef({
    active: false,
    startClientX: 0,
    hasMoved: false,
    currentX: 0,
  });

  // ─── Spring ───────────────────────────────────────────────────────────────
  const [spring, api] = useSpring(() => ({
    posX: targetX,
    config: { tension: 380, friction: 32, mass: 0.7 },
  }));

  // Keep spring in sync with targetX whenever we are NOT actively dragging
  if (!drag.current.active) {
    api.start({ posX: targetX, config: { tension: 380, friction: 32, mass: 0.7 } });
  }

  // ─── Screen → world X ────────────────────────────────────────────────────
  const toWorldX = useCallback(
    (clientX: number, clientY: number): number => {
      const rect = gl.domElement.getBoundingClientRect();
      _ndc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      _raycaster.setFromCamera(_ndc, camera);
      _raycaster.ray.intersectPlane(DRAG_PLANE, _hit);
      return _hit.x;
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
      c.setHSL(hsl.h, hsl.s * 0.4, Math.min(0.95, hsl.l + 0.06));
    } else {
      c.setHSL(hsl.h, 0, 0);
    }
    return c;
  }, [beadColour.colour, hovered, isDragging, isActive]);

  const emissiveIntensity = hovered || isDragging ? 0.32 : isActive ? 0.06 : 0;

  // ─── Pointer handlers ─────────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      // Capture pointer on the underlying DOM element so we receive
      // move / up events even when the cursor leaves the mesh hitbox.
      gl.domElement.setPointerCapture(e.pointerId);

      drag.current = {
        active: true,
        startClientX: e.nativeEvent.clientX,
        hasMoved: false,
        currentX: spring.posX.get() as number,
      };

      setIsDragging(true);
      setDragging(true);
      document.body.style.cursor = 'grabbing';

      // Snap spring to pointer immediately
      const wx = toWorldX(e.nativeEvent.clientX, e.nativeEvent.clientY);
      api.start({ posX: Math.max(minX, Math.min(maxX, wx)), immediate: true });
    },
    [gl.domElement, spring.posX, toWorldX, minX, maxX, api, setDragging],
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!drag.current.active) return;
      e.stopPropagation();

      const dx = Math.abs(e.nativeEvent.clientX - drag.current.startClientX);
      if (dx > 4) drag.current.hasMoved = true;

      const wx = toWorldX(e.nativeEvent.clientX, e.nativeEvent.clientY);
      const clamped = Math.max(minX, Math.min(maxX, wx));
      drag.current.currentX = clamped;

      api.start({ posX: clamped, immediate: true });
    },
    [toWorldX, minX, maxX, api],
  );

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!drag.current.active) return;
      e.stopPropagation();
      gl.domElement.releasePointerCapture(e.pointerId);

      const { hasMoved, currentX } = drag.current;
      drag.current.active = false;

      setIsDragging(false);
      setDragging(false);
      document.body.style.cursor = hovered ? 'grab' : 'auto';

      if (hasMoved) {
        onDragRelease(currentX);
        // Spring snaps to new targetX via the prop-update path at top of component
      } else {
        onClick();
      }
    },
    [gl.domElement, hovered, onDragRelease, onClick, setDragging],
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

  return (
    <animated.mesh
      ref={meshRef}
      position-x={spring.posX}
      position-y={rodY}
      position-z={0}
      scale={[1, 1, 0.78]}
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
