import assert from 'node:assert/strict';
import test from 'node:test';
import { Euler, PerspectiveCamera, Vector3 } from 'three';
import { foldCameraDistance, foldFocus, foldGeometry, foldLighting, foldPose, HINGE_Z, PANEL_DEPTH, PANEL_HEIGHT, PANEL_WIDTH, stepSpatialPose } from '../components/demos/spatial-motion.ts';

function focusDepths(openAngle) {
  const p = 1 - openAngle / 180;
  const fold = foldGeometry(p);
  const pose = foldPose(p);
  const rotation = new Euler(pose.rx, pose.ry, pose.rz, 'YXZ');
  const scale = pose.scale;
  const camera = new PerspectiveCamera(34, 1.6, 0.1, 40);
  camera.position.set(0, 0.02, foldCameraDistance(1.6));
  camera.lookAt(0, -0.02, 0);
  camera.updateMatrixWorld();
  function depth(point) {
    point.add(new Vector3(-fold.centerX, 0, -p * 0.03)).applyEuler(rotation).multiplyScalar(scale);
    return -point.applyMatrix4(camera.matrixWorldInverse).z;
  }
  const inner = depth(new Vector3(PANEL_WIDTH / 2, 0, PANEL_DEPTH / 2 + 0.001));
  const outer = depth(new Vector3(-PANEL_WIDTH / 2, 0, -PANEL_DEPTH / 2 - 0.001 - HINGE_Z)
    .applyAxisAngle(new Vector3(0, 1, 0), fold.angle).add(new Vector3(0, 0, HINGE_Z)));
  const state = foldFocus(p);
  const focus = inner + (outer - inner) * state.coverWeight;
  return { state, focus, inner, outer, depth };
}

test('the inner image stays sharp across the revealed range while the foreground is defocused', () => {
  // Sample neighborhoods, rather than snapping focus at a particular slider value.
  for (let angle = 42; angle <= 130; angle += 2) {
    const { state, focus, depth, outer } = focusDepths(angle);
    for (const x of [0, PANEL_WIDTH]) for (const y of [-PANEL_HEIGHT / 2, PANEL_HEIGHT / 2]) {
      const blur = Math.abs(depth(new Vector3(x, y, PANEL_DEPTH / 2 + 0.001)) - focus) * state.aperture;
      assert.ok(blur < 1.5, `right inner image should be in focus at ${angle}°`);
    }
    if (angle <= 70) assert.ok(Math.abs(outer - focus) * state.aperture > 10, `foreground should be soft at ${angle}°`);
  }
});

test('focus transfers continuously to the cover near closure and both endpoints are sharp', () => {
  const opened = focusDepths(180), closed = focusDepths(0);
  assert.equal(opened.state.aperture, 0);
  assert.equal(closed.focus, closed.outer);
  let previous = foldFocus(0).coverWeight;
  for (let step = 1; step <= 1000; step++) {
    const weight = foldFocus(step / 1000).coverWeight;
    assert.ok(weight >= previous && weight - previous < 0.008, 'focus must progress without a threshold jump');
    previous = weight;
  }
});

test('inner lighting emerges separately from focus and clears the crease when fully open', () => {
  const atAngle = (angle) => foldLighting(1 - angle / 180);
  assert.equal(atAngle(12).innerExposure, atAngle(0).innerExposure, 'the first small gap stays recessed in shade');
  assert.ok(atAngle(54).innerExposure > atAngle(24).innerExposure, 'the revealed inner image gradually lights up');
  assert.ok(atAngle(54).innerExposure < 0.65, 'being sharp does not mean being fully illuminated');
  assert.ok(atAngle(113).innerExposure > 0.97, 'the broad open view is already illuminated');
  assert.equal(atAngle(180).innerExposure, 1);
  assert.equal(atAngle(180).innerShadow, 0, 'the flat image has no artificial center seam');
  let previous = atAngle(0).innerExposure;
  for (let step = 1; step <= 1000; step++) {
    const exposure = atAngle(step * 0.18).innerExposure;
    assert.ok(exposure >= previous && exposure - previous < 0.003, 'lighting must brighten continuously');
    previous = exposure;
  }
});

test('the moving leaf travels toward the viewer and closes over the inner face', () => {
  for (const progress of [0.1, 0.25, 0.5, 0.75, 0.9]) {
    const fold = foldGeometry(progress);
    const center = new Vector3(-PANEL_WIDTH / 2, 0, -HINGE_Z)
      .applyAxisAngle(new Vector3(0, 1, 0), fold.angle).add(new Vector3(0, 0, HINGE_Z));
    assert.ok(center.z > 0, 'positive Z is in front of the stationary page');
    assert.ok(Math.abs(center.z - fold.movingCenterZ) < 1e-10);
  }
  const closed = foldGeometry(1);
  assert.equal(closed.innerNormalZ, -1, 'inner content faces inward when closed');
  assert.equal(closed.outerNormalZ, 1, 'the third, outer content surface faces the viewer');
  assert.ok(closed.movingCenterZ - PANEL_DEPTH / 2 > PANEL_DEPTH / 2, 'closed leaves have clearance');
  assert.ok(Math.abs(closed.movingCenterX - PANEL_WIDTH / 2) < 1e-10);
});

test('every fold angle stays inside a stable frame at wide and narrow stage sizes', () => {
  const pivot = new Vector3(0, 0, HINGE_Z), axis = new Vector3(0, 1, 0);
  for (const aspect of [0.5, 0.7, 1, 1.4, 2.1, 2.8]) {
    const camera = new PerspectiveCamera(34, aspect, 0.1, 40);
    camera.position.set(0, 0.02, foldCameraDistance(aspect));
    camera.lookAt(0, -0.02, 0); camera.updateMatrixWorld();
    let largestExtent = 0;
    // Different sample spacing from the framing calculation also checks
    // intermediate poses, using Three's actual projection and Euler transforms.
    for (let step = 0; step <= 240; step++) {
      const p = step / 240, pose = foldPose(p), fold = foldGeometry(p);
      const rotation = new Euler(pose.rx, pose.ry, pose.rz, 'YXZ');
      for (const moving of [false, true]) for (const outer of [false, true]) {
        for (const y of [-PANEL_HEIGHT / 2, PANEL_HEIGHT / 2]) for (const z of [-PANEL_DEPTH / 2 - 0.001, PANEL_DEPTH / 2 + 0.001]) {
          const point = new Vector3(outer ? (moving ? -PANEL_WIDTH : PANEL_WIDTH) : 0, y, z);
          if (moving) point.sub(pivot).applyAxisAngle(axis, fold.angle).add(pivot);
          point.add(new Vector3(-fold.centerX, 0, -p * 0.03)).applyEuler(rotation).multiplyScalar(pose.scale).project(camera);
          const extent = Math.max(Math.abs(point.x), Math.abs(point.y));
          assert.ok(extent < 0.91, `clipped fold at ${p}, aspect ${aspect}: ${point.toArray()}`);
          largestExtent = Math.max(largestExtent, extent);
        }
      }
    }
    assert.ok(largestExtent > 0.87, 'the model should use the available space rather than being needlessly reduced');
  }
});

test('interrupted orbit motion stays continuous, then settles at the newly selected angle', () => {
  const current = { progress: 0, rx: 0, ry: 0, rz: 0, scale: 1 };
  const velocity = { progress: 0, rx: 0, ry: 0, rz: 0, scale: 0 };
  const first = { ...current, ry: 1.5 };
  for (let frame = 0; frame < 12; frame++) stepSpatialPose(current, velocity, first, 1 / 60, false);
  const before = current.ry;
  const next = { ...first, ry: -1.1 };
  stepSpatialPose(current, velocity, next, 1 / 60, false);
  assert.ok(Math.abs(current.ry - before) < 0.15, 'retargeting must not jump to the new pose');
  for (let frame = 0; frame < 360; frame++) stepSpatialPose(current, velocity, next, frame % 17 === 0 ? 0.2 : 1 / 60, false);
  assert.ok(Math.abs(current.ry - next.ry) < 1e-6);
  assert.equal(velocity.ry, 0);
});

test('reduced motion immediately sets the requested pose without residual momentum', () => {
  const current = { progress: 0, rx: 0, ry: 0, rz: 0, scale: 1 };
  const velocity = { progress: 1, rx: 1, ry: 1, rz: 1, scale: 1 };
  const target = { progress: 1, rx: 0.2, ry: 0.5, rz: 0, scale: 1.18 };
  assert.equal(stepSpatialPose(current, velocity, target, 1 / 60, true), false);
  assert.deepEqual(current, target);
  assert.ok(Object.values(velocity).every((value) => value === 0));
});
