import type { OrbitShot } from './orbit-camera';

export type SpatialPose = { progress: number; rx: number; ry: number; rz: number; scale: number; camera?: OrbitShot; wallpaper?: number };

export const PANEL_WIDTH = 1.62;
export const PANEL_HEIGHT = 2.34;
export const PANEL_DEPTH = 0.045;
export const HINGE_Z = PANEL_DEPTH / 2 + 0.008;

export function smoothRange(start: number, end: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

export function foldFocus(progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  return {
    // Keep looking through the foreground leaf at the inner image. Transfer
    // focus only as the cover lies down over it, across a soft range of travel.
    coverWeight: smoothRange(0.78, 0.98, p),
    aperture: 18 * smoothRange(0, 0.2, p),
  };
}

export function foldLighting(progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  const open = 1 - p;
  // The inner image first appears in shade, then gradually lights up as the
  // opening widens. Its timing is independent of the focus handoff.
  const reveal = smoothRange(0.12, 0.66, open);
  const bend = Math.sin(p * Math.PI);
  return {
    innerExposure: 0.2 + 0.8 * reveal,
    innerShadow: 0.6 * smoothRange(0, 0.32, p),
    coverShadow: 0.26 * bend,
    shadowWidth: 0.055 + 0.27 * bend,
  };
}

export function foldGeometry(progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  // Looking toward -Z: a positive Y rotation brings the left panel toward us.
  const angle = Math.PI * p;
  return {
    angle,
    centerX: PANEL_WIDTH / 2 * smoothRange(0, 0.7, p),
    movingCenterX: -PANEL_WIDTH / 2 * Math.cos(angle) - HINGE_Z * Math.sin(angle),
    movingCenterZ: PANEL_WIDTH / 2 * Math.sin(angle) + HINGE_Z * (1 - Math.cos(angle)),
    innerNormalZ: Math.cos(angle),
    outerNormalZ: -Math.cos(angle),
  };
}

export function foldPose(progress: number): SpatialPose {
  return { progress, rx: -0.035, ry: -0.05 * Math.sin(progress * Math.PI), rz: 0, scale: 1 + progress * 0.18 };
}

export function foldCameraDistance(aspect: number, fov = 34) {
  const verticalSlope = Math.tan(fov * Math.PI / 360) * 0.9;
  const horizontalSlope = verticalSlope * Math.max(aspect, 0.1);
  let distance = 0;
  // Fit the whole swept volume once per resize. This leaves a stable camera
  // while the moving leaf approaches it, rather than clipping or zooming to fit.
  for (let step = 0; step <= 180; step++) {
    const p = step / 180, pose = foldPose(p), fold = foldGeometry(p);
    const sin = Math.sin(fold.angle), cos = Math.cos(fold.angle);
    for (const moving of [false, true]) for (const outer of [false, true]) {
      const x = outer ? (moving ? -PANEL_WIDTH : PANEL_WIDTH) : 0;
      for (const y of [-PANEL_HEIGHT / 2, PANEL_HEIGHT / 2]) for (const z of [-PANEL_DEPTH / 2 - 0.001, PANEL_DEPTH / 2 + 0.001]) {
        const leafX = moving ? x * cos + (z - HINGE_Z) * sin : x;
        const leafZ = moving ? -x * sin + (z - HINGE_Z) * cos + HINGE_Z : z;
        const localX = leafX - fold.centerX, localZ = leafZ - p * 0.03;
        const tiltedY = y * Math.cos(pose.rx) - localZ * Math.sin(pose.rx);
        const tiltedZ = y * Math.sin(pose.rx) + localZ * Math.cos(pose.rx);
        const worldX = (localX * Math.cos(pose.ry) + tiltedZ * Math.sin(pose.ry)) * pose.scale;
        const worldY = tiltedY * pose.scale;
        const worldZ = (-localX * Math.sin(pose.ry) + tiltedZ * Math.cos(pose.ry)) * pose.scale;
        distance = Math.max(distance, worldZ + Math.abs(worldX) / horizontalSlope, worldZ + Math.abs(worldY) / verticalSlope);
      }
    }
  }
  return distance + 0.04;
}

export function stepSpatialPose(current: SpatialPose, velocity: SpatialPose, target: SpatialPose, dt: number, reduced: boolean) {
  let moving = false;
  for (const key of ['progress', 'rx', 'ry', 'rz', 'scale'] as const) {
    const goal = key === 'ry' || key === 'rz'
      ? current[key] + Math.atan2(Math.sin(target[key] - current[key]), Math.cos(target[key] - current[key]))
      : target[key];
    if (reduced) { current[key] = goal; velocity[key] = 0; continue; }
    const stiffness = key === 'progress' ? 280 : key === 'scale' ? 150 : 84;
    const damping = 2 * Math.sqrt(stiffness) * (key === 'progress' ? 1 : 0.96);
    const step = Math.min(Math.max(dt, 0), 0.032) / 4;
    for (let i = 0; i < 4; i++) {
      velocity[key] += ((goal - current[key]) * stiffness - damping * velocity[key]) * step;
      current[key] += velocity[key] * step;
    }
    if (Math.abs(goal - current[key]) + Math.abs(velocity[key]) > 0.0002) moving = true;
    else { current[key] = goal; velocity[key] = 0; }
  }
  return moving;
}
