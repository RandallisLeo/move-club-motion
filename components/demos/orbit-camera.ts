export type OrbitShot = {
  azimuth: number;
  elevation: number;
  distance: number;
  fov: number;
  aimX: number;
  aimY: number;
  aimZ: number;
  roll: number;
};

export const ORBIT_SHOTS = {
  // Each shot is composed around a feature, including its own subject distance.
  // Close-ups intentionally crop the silhouette to give the detail room to read.
  form: { azimuth: 0.62, elevation: 0.28, distance: 6.8, fov: 34, aimX: 0, aimY: -0.02, aimZ: 0, roll: -0.04 },
  weave: { azimuth: 0.12, elevation: 0.18, distance: 2.68, fov: 30, aimX: 0.15, aimY: -0.075, aimZ: 0.495, roll: -0.025 },
  surface: { azimuth: 0.85, elevation: 0.44, distance: 2, fov: 27, aimX: 0.7, aimY: 0.352, aimZ: 0.476, roll: 0.045 },
  profile: { azimuth: Math.PI / 2, elevation: 0.12, distance: 5.8, fov: 34, aimX: 0, aimY: 0.02, aimZ: -0.08, roll: 0 },
  structure: { azimuth: -0.4, elevation: 1.3, distance: 7, fov: 32, aimX: 0, aimY: 0, aimZ: 0, roll: -0.04 },
} satisfies Record<string, OrbitShot>;

// Compose to the right of the feature rail while allowing close-up imagery to
// extend across the whole stage instead of clipping at an invisible inner box.
export const ORBIT_FRAME_OFFSET = { x: 0.1, y: 0.035 };

const axes = ['azimuth', 'elevation', 'distance', 'fov', 'aimX', 'aimY', 'aimZ', 'roll'] as const;
const shortestAngle = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

export type OrbitCameraRig = {
  current: OrbitShot;
  velocity: OrbitShot;
  target: OrbitShot;
};

export function createOrbitCameraRig(shot: OrbitShot): OrbitCameraRig {
  return {
    current: { ...shot },
    velocity: { azimuth: 0, elevation: 0, distance: 0, fov: 0, aimX: 0, aimY: 0, aimZ: 0, roll: 0 },
    target: { ...shot },
  };
}

/** Replanning a shot preserves both the actual camera position and its velocity. */
export function retargetOrbitCamera(rig: OrbitCameraRig, shot: OrbitShot) {
  if (axes.every((axis) => shot[axis] === rig.target[axis])) return;
  rig.target = { ...shot };
}

export function stepOrbitCamera(rig: OrbitCameraRig, elapsed: number, reduced: boolean) {
  if (reduced) {
    rig.current = { ...rig.target };
    for (const axis of axes) rig.velocity[axis] = 0;
    return false;
  }
  const dt = Math.min(Math.max(elapsed, 0), 0.032);
  // Travel directly to the selected composition. Distance, aim and orbit share
  // the same response, with no generic pull-back added between two shots.
  let moving = false;
  for (const axis of axes) {
    let goal = rig.target[axis];
    if (axis === 'azimuth' || axis === 'roll') goal = rig.current[axis] + shortestAngle(goal - rig.current[axis]);
    const stiffness = 56;
    const damping = 2 * Math.sqrt(stiffness);
    for (let substep = 0; substep < 4; substep++) {
      rig.velocity[axis] += ((goal - rig.current[axis]) * stiffness - damping * rig.velocity[axis]) * dt / 4;
      rig.current[axis] += rig.velocity[axis] * dt / 4;
    }
    if (Math.abs(goal - rig.current[axis]) + Math.abs(rig.velocity[axis]) > 0.0002) moving = true;
    else { rig.current[axis] = goal; rig.velocity[axis] = 0; }
  }
  return moving;
}

export function orbitCameraPosition(shot: OrbitShot, aspect: number) {
  // Preserve the shot's relative push/pull on narrow canvases, rather than
  // clamping all close shots to the same distance and erasing the camera motion.
  const distance = shot.distance * Math.max(1, 1 / Math.max(aspect, 0.35));
  const horizontal = Math.cos(shot.elevation) * distance;
  return {
    x: shot.aimX + Math.sin(shot.azimuth) * horizontal,
    y: shot.aimY + Math.sin(shot.elevation) * distance,
    z: shot.aimZ + Math.cos(shot.azimuth) * horizontal,
  };
}
