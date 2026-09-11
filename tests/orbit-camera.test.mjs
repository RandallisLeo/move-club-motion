import assert from 'node:assert/strict';
import test from 'node:test';
import { PerspectiveCamera, TorusKnotGeometry, Vector3 } from 'three';
import { createOrbitCameraRig, ORBIT_FRAME_OFFSET, orbitCameraPosition, ORBIT_SHOTS, retargetOrbitCamera, stepOrbitCamera } from '../components/demos/orbit-camera.ts';

function cameraFor(shot, aspect) {
  const camera = new PerspectiveCamera(shot.fov, aspect, 0.1, 40);
  camera.setViewOffset(aspect, 1, -aspect * ORBIT_FRAME_OFFSET.x, ORBIT_FRAME_OFFSET.y, aspect, 1);
  const position = orbitCameraPosition(shot, aspect);
  camera.position.set(position.x, position.y, position.z);
  camera.lookAt(shot.aimX, shot.aimY, shot.aimZ);
  camera.rotateZ(shot.roll);
  camera.updateMatrixWorld();
  return camera;
}

function sculpturePoints() {
  const geometry = new TorusKnotGeometry(0.79, 0.25, 120, 18, 2, 3);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

test('settled shots travel directly toward their new distance without a pull-back detour', () => {
  for (const from of Object.values(ORBIT_SHOTS)) for (const to of Object.values(ORBIT_SHOTS)) {
    const rig = createOrbitCameraRig(from);
    retargetOrbitCamera(rig, to);
    const direction = Math.sign(to.distance - from.distance);
    let previous = from.distance;
    for (let frame = 0; frame < 300; frame++) {
      stepOrbitCamera(rig, 1 / 60, false);
      const distance = rig.current.distance;
      assert.ok((distance - previous) * direction >= -1e-10, 'distance must not first move away from the target');
      assert.ok(distance >= Math.min(from.distance, to.distance) - 1e-10 && distance <= Math.max(from.distance, to.distance) + 1e-10);
      previous = distance;
    }
    assert.ok(Math.abs(rig.current.distance - to.distance) < 1e-5);
  }
});

test('changing an angle at the same subject distance does not invent any zoom', () => {
  const rig = createOrbitCameraRig(ORBIT_SHOTS.form);
  retargetOrbitCamera(rig, { ...ORBIT_SHOTS.form, azimuth: 1.6, elevation: 0.8 });
  for (let frame = 0; frame < 180; frame++) {
    stepOrbitCamera(rig, 1 / 60, false);
    assert.equal(rig.current.distance, ORBIT_SHOTS.form.distance);
    assert.equal(rig.current.fov, ORBIT_SHOTS.form.fov);
  }
});

test('feature views have distinct close-up framing and stay aimed at the sculpture', () => {
  const geometry = sculpturePoints();
  const points = geometry.attributes.position;
  const magnification = (shot) => 1 / (shot.distance * Math.tan(shot.fov * Math.PI / 360));
  assert.ok(magnification(ORBIT_SHOTS.weave) > magnification(ORBIT_SHOTS.form) * 2);
  assert.ok(magnification(ORBIT_SHOTS.surface) > magnification(ORBIT_SHOTS.weave) * 1.4);
  for (const aspect of [1.8, 0.65]) for (const name of ['weave', 'surface']) {
    const camera = cameraFor(ORBIT_SHOTS[name], aspect);
    let nearestFeature = Infinity, cropped = false;
    for (let i = 0; i < points.count; i++) {
      const vertex = new Vector3().fromBufferAttribute(points, i).project(camera);
      nearestFeature = Math.min(nearestFeature, Math.hypot(vertex.x - ORBIT_FRAME_OFFSET.x * 2, vertex.y - ORBIT_FRAME_OFFSET.y * 2));
      if (Math.abs(vertex.x) > 1 || Math.abs(vertex.y) > 1) cropped = true;
    }
    assert.ok(nearestFeature < 0.12, `${name}: a physical surface must be visible at the focal point`);
    assert.ok(cropped, `${name}: close-ups should show a detail rather than fit the whole sculpture`);
  }
  geometry.dispose();
});

test('rapidly retargeting a travelling camera preserves position and momentum', () => {
  const rig = createOrbitCameraRig(ORBIT_SHOTS.form);
  retargetOrbitCamera(rig, ORBIT_SHOTS.surface);
  for (let i = 0; i < 18; i++) stepOrbitCamera(rig, 1 / 60, false);
  const before = structuredClone(rig);
  retargetOrbitCamera(rig, ORBIT_SHOTS.structure);
  assert.deepEqual(rig.current, before.current);
  assert.deepEqual(rig.velocity, before.velocity);
  const position = orbitCameraPosition(rig.current, 1.8);
  stepOrbitCamera(rig, 1 / 60, false);
  const next = orbitCameraPosition(rig.current, 1.8);
  assert.ok(Math.hypot(next.x - position.x, next.y - position.y, next.z - position.z) < 0.45);
  for (let i = 0; i < 360; i++) stepOrbitCamera(rig, i % 19 === 0 ? 0.18 : 1 / 60, false);
  assert.ok(Math.abs(rig.current.distance - ORBIT_SHOTS.structure.distance) < 1e-5);
});

test('a camera travelling across the angular seam takes the short arc', () => {
  const rig = createOrbitCameraRig({ ...ORBIT_SHOTS.form, azimuth: 3.1 });
  retargetOrbitCamera(rig, { ...ORBIT_SHOTS.form, azimuth: -3.1 });
  for (let i = 0; i < 300; i++) {
    stepOrbitCamera(rig, 1 / 60, false);
    assert.ok(rig.current.azimuth > 3, 'must not take an unnecessary full revolution');
  }
});

test('full-form shots retain their silhouette, and close-up transitions never enter the mesh', () => {
  const geometry = sculpturePoints();
  const points = geometry.attributes.position;
  const vertex = new Vector3();
  const fullViews = new Set(['form', 'profile', 'structure']);
  for (const aspect of [1.8, 0.65]) {
    for (const [fromName, from] of Object.entries(ORBIT_SHOTS)) {
      for (const [toName, to] of Object.entries(ORBIT_SHOTS)) {
        const rig = createOrbitCameraRig(from);
        retargetOrbitCamera(rig, to);
        for (let frame = 0; frame <= 180; frame++) {
          stepOrbitCamera(rig, 1 / 60, false);
          if (frame % 12) continue;
          const camera = cameraFor(rig.current, aspect);
          for (let i = 0; i < points.count; i++) {
            vertex.fromBufferAttribute(points, i).project(camera);
            assert.ok(vertex.z > -1 && vertex.z < 1, `${fromName} → ${toName}: crossed the camera clipping plane`);
            if (fullViews.has(toName) && (fullViews.has(fromName) || frame === 180)) {
              assert.ok(Math.abs(vertex.x) < 0.98 && Math.abs(vertex.y) < 0.98,
                `${fromName} → ${toName}, aspect ${aspect}, frame ${frame}: silhouette clipped at ${vertex.x}, ${vertex.y}`);
            }
          }
        }
      }
    }
  }
  geometry.dispose();
});

test('reduced motion goes straight to the chosen feature without residual momentum', () => {
  const rig = createOrbitCameraRig(ORBIT_SHOTS.form);
  retargetOrbitCamera(rig, ORBIT_SHOTS.surface);
  stepOrbitCamera(rig, 1 / 60, false);
  assert.equal(stepOrbitCamera(rig, 1 / 60, true), false);
  assert.deepEqual(rig.current, ORBIT_SHOTS.surface);
  assert.ok(Object.values(rig.velocity).every((value) => value === 0));
});
