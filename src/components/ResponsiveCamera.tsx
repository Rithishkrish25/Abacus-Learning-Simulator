import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';

/**
 * Adjusts camera for the vertical Soroban layout.
 *
 * Soroban frame is ~7 wu tall × ~8 wu wide (5 rods × 1.65 spacing + margins).
 * We ensure the full frame is always visible regardless of screen aspect ratio.
 */

// Half-height of the soroban scene (world units) — the taller dimension
const SCENE_HALF_H = 3.8;
// Half-width
const SCENE_HALF_W = 4.4;

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
    const isLandscapeMobile = isMobile && aspect >= 1.2;

    const cameraZ = isMobile ? (isLandscapeMobile ? 11.0 : 13.0) : 11.5;
    const cameraY = isMobile ? (isLandscapeMobile ? 0.3 : 0.3) : 0.5;
    const cameraX = 0;

    const margin = isMobile ? 1.06 : 1.03;

    // We need to fit both height and width — pick the larger required FOV
    const requiredHalfFovV = Math.atan((SCENE_HALF_H * margin) / cameraZ);
    const requiredFovV = (2 * requiredHalfFovV * 180) / Math.PI;

    const requiredHalfFovH = Math.atan((SCENE_HALF_W * margin) / cameraZ);
    const requiredFovFromWidth = (2 * Math.atan(Math.tan(requiredHalfFovH) / aspect) * 180) / Math.PI;

    const targetFov = isMobile
      ? Math.max(requiredFovV, requiredFovFromWidth, isLandscapeMobile ? 38 : 36)
      : Math.max(requiredFovV, requiredFovFromWidth, 34);

    cam.fov = targetFov;
    cam.position.set(cameraX, cameraY, cameraZ);
    cam.updateProjectionMatrix();
  }, [size.width, size.height, camera]);

  return null;
}
