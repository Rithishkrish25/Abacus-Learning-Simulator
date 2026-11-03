import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';

/**
 * Mounts inside the R3F Canvas and adjusts the camera FOV + position
 * every time the canvas size changes, so the full abacus always fits.
 *
 * The abacus frame is approximately 10.8 world units wide (ROD_USABLE_LENGTH
 * 9.28 + frame margins ~1.5) and 6.5 wu tall including the tilt group offset.
 *
 * We compute the minimum FOV needed to fit the width at the current aspect
 * ratio, then add a small margin so the frame never clips the viewport edge.
 *
 * Desktop (landscape, aspect ≥ 1):
 *   FOV stays close to the original 34° — wide enough to show depth.
 *
 * Mobile portrait (aspect < 0.7):
 *   We widen the FOV and pull the camera back along Z until the full
 *   abacus width fits comfortably.
 */

// Half-width of the abacus scene content (world units at Z=0)
const SCENE_HALF_W = 5.6;

export function ResponsiveCamera() {
  const { camera, size } = useThree();
  const camRef = useRef<PerspectiveCamera | null>(null);

  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    camRef.current = camera;
  }, [camera]);

  useEffect(() => {
    const cam = camRef.current;
    if (!cam) return;

    const aspect = size.width / size.height;
    const isMobile = size.width < 640;
    const isLandscapeMobile = isMobile && aspect >= 1;

    // ── Camera position ───────────────────────────────────────────────────
    // Portrait mobile: Z=12.0 (closer than before → ~12% larger abacus).
    // cameraY=-0.2 shifts the scene slightly downward in the frustum,
    // giving more breathing room at the top and keeping the abacus centred
    // in the usable space between HUD top-bar and bottom controls.
    const cameraZ = isMobile ? (isLandscapeMobile ? 10.5 : 12.0) : 9.5;
    const cameraY = isMobile ? (isLandscapeMobile ? 1.0 : -0.2) : 2.2;
    const cameraX = isMobile ? 0 : 1.5;

    // ── FOV ───────────────────────────────────────────────────────────────
    // Margin = 1.04 → 4% side padding; tighter than before so the abacus
    // appears larger while still fully visible at 375 px width.
    const margin = isMobile ? (isLandscapeMobile ? 1.06 : 1.04) : 1.0;
    const requiredHalfFovH = Math.atan((SCENE_HALF_W * margin) / cameraZ);
    const requiredFovV =
      (2 * Math.atan(Math.tan(requiredHalfFovH) / aspect) * 180) / Math.PI;

    // Desktop: fixed 34°; mobile: computed (floor 38° for landscape)
    const targetFov = isMobile
      ? Math.max(requiredFovV, isLandscapeMobile ? 38 : 36)
      : 34;

    cam.fov = targetFov;
    cam.position.set(cameraX, cameraY, cameraZ);
    cam.updateProjectionMatrix();
  }, [size.width, size.height, camera]);

  return null;
}
