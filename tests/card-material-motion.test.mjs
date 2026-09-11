import assert from 'node:assert/strict';
import test from 'node:test';
import { Euler, PerspectiveCamera, Vector3 } from 'three';
import { cardCameraSpan, cardDamp, cardFanAdvance, cardFanPose, cardFanRadius, cardFanTarget, cardShadow, cardTurn, CARD_CAMERA_FOV, CARD_FAN_RADIUS, CARD_FAN_STEP } from '../components/demos/card-material-motion.ts';
import { CARD_MATERIALS } from '../components/demos/card-material-options.ts';
import { liquidLens, plushPile, roundedRect, PLUSH_PILE_DEPTH } from '../components/demos/card-material-surfaces.ts';

const count = CARD_MATERIALS.length;

test('a turn anticipates rotation and returns exactly to a stable resting pose', () => {
  assert.deepEqual(cardTurn(0), { turn: 0, lift: 0, scale: 1, bank: -0, pitch: 0 });
  assert.equal(cardTurn(0.06).turn, 0);
  assert.ok(cardTurn(0.06).scale > 1, 'expansion should precede rotation');
  assert.equal(cardTurn(1).turn, 1);
  assert.equal(cardTurn(1).scale, 1);
  assert.ok(Math.abs(cardTurn(1).lift) < 1e-12);
  for (let i = 0; i <= 1000; i++) {
    const pose = cardTurn(i / 1000);
    assert.ok(pose.scale <= 1.065 && pose.scale >= 1, 'expansion must remain subtle');
    assert.ok(pose.turn >= 0 && pose.turn < 1.065, 'overshoot must not become an extra flip');
  }
});

test('pointer damping produces the same result at 30, 60, and 120 Hz', () => {
  const sample = (fps) => {
    let value = 0;
    for (let i = 0; i < fps; i++) value = cardDamp(value, 0.2, 1 / fps);
    return value;
  };
  assert.ok(Math.abs(sample(30) - sample(120)) < 1e-12);
  assert.ok(Math.abs(sample(60) - sample(120)) < 1e-12);
});

test('fan cards keep one common center and constant angular spacing throughout travel', () => {
  for (const position of [-7.4, 0, 0.45, 2.7, 5.1, 6, 7.4, 14.2]) {
    const poses = CARD_MATERIALS.map((_, index) => cardFanPose(index, position, count)).sort((a, b) => a.roll - b.roll);
    for (let index = 0; index < count; index++) {
      const pose = poses[index];
      assert.ok(Math.abs(Math.hypot(pose.x + CARD_FAN_RADIUS, pose.y) - CARD_FAN_RADIUS) < 1e-12);
      if (index > 0) assert.ok(Math.abs(pose.roll - poses[index - 1].roll - CARD_FAN_STEP) < 1e-12);
    }
  }
});

test('each chosen card arrives at the same full-size display position and unfolds about its center', () => {
  for (let index = 0; index < count; index++) {
    const settled = cardFanPose(index, index, count);
    assert.equal(settled.x, 0); assert.equal(settled.y, 0);
    assert.equal(settled.pitch, 0); assert.equal(settled.focus, 1);
    const incoming = cardFanPose(index, index - 0.6, count), outgoing = cardFanPose(index, index + 0.6, count);
    assert.ok(incoming.pitch < -0.8 && outgoing.pitch > 0.8);
    assert.ok(Math.abs(incoming.pitch + outgoing.pitch) < 1e-12);
    assert.ok(Math.abs(incoming.x - outgoing.x) < 1e-12);
    assert.ok(Math.abs(incoming.y + outgoing.y) < 1e-12);
    assert.ok(incoming.x < 0 && incoming.y < 0 && outgoing.y > 0, 'forward selection brings cards from below and sends them upward');
  }
});

test('forward and backward selections cross the last/first seam in one step for repeated loops', () => {
  for (const direction of [1, -1]) {
    let target = 0;
    for (let step = 1; step <= count * 4; step++) {
      const index = ((direction * step) % count + count) % count;
      const next = cardFanTarget(index, target, count);
      assert.equal(next - target, direction, 'crossing the seam must not reverse or traverse the entire fan');
      const previousIndex = ((target % count) + count) % count;
      const midpoint = (target + next) / 2;
      const incoming = cardFanPose(index, midpoint, count);
      const outgoing = cardFanPose(previousIndex, midpoint, count);
      assert.ok(incoming.y * direction < 0 && outgoing.y * direction > 0);
      assert.deepEqual(cardFanPose(index, next, count), cardFanPose(index, index, count));
      target = next;
    }
    assert.equal(cardFanTarget(3, target, count) - target, 3);
    assert.equal(cardFanTarget(count - 2, target, count) - target, -2);
  }
});

test('only the selected card is visible at rest across wide and narrow stages', () => {
  // A conservative box encloses the glass, fur, chip, and both printed faces.
  const corners = [];
  for (const x of [-1.8, 1.8]) for (const y of [-1.17, 1.17]) for (const z of [-0.3, 0.3]) corners.push(new Vector3(x, y, z));
  for (const aspect of [0.3, 0.42, 0.6, 0.95, 1.2, 1.9, 2.5, 3.5]) {
    const span = cardCameraSpan(aspect), radius = cardFanRadius(span);
    const camera = new PerspectiveCamera(CARD_CAMERA_FOV, aspect, 0.1, 50);
    camera.position.z = span / (2 * Math.tan(CARD_CAMERA_FOV / 2 * Math.PI / 180));
    camera.updateMatrixWorld();
    for (let selected = -count; selected < count * 2; selected++) for (let index = 0; index < count; index++) {
      const pose = cardFanPose(index, selected, count, radius);
      for (const side of [0, Math.PI]) {
        const rotation = new Euler(pose.pitch - 0.13, side - 0.16, -0.025 * pose.focus, 'YXZ');
        const orbit = new Euler(0, 0, pose.roll);
        const projected = corners.map(point => point.clone().applyEuler(rotation).applyEuler(orbit)
          .add(new Vector3(pose.x, pose.y - 0.04, 0)).project(camera));
        if (index === ((selected % count) + count) % count) {
          assert.ok(projected.every(point => Math.abs(point.x) < 1 && Math.abs(point.y) < 1), `selected card clipped at aspect ${aspect}`);
        } else {
          const outside = ['x', 'y'].some(axis => projected.every(point => point[axis] < -1) || projected.every(point => point[axis] > 1));
          assert.ok(outside, `parked card ${index} visible beside ${selected}, aspect ${aspect}`);
          assert.equal(pose.focus, 0, 'parked cards must not cast a shadow or show the glass backdrop');
        }
      }
    }
  }
});

test('fan spring is frame-rate independent, settles, and retargets without resetting position or momentum', () => {
  const sample = (fps) => {
    let state = { position: 0, velocity: 0 };
    for (let i = 0; i < fps / 2; i++) state = cardFanAdvance(state, 6, 1 / fps, 7);
    return state;
  };
  const low = sample(30), high = sample(120);
  assert.ok(Math.abs(low.position - high.position) < 1e-12);
  assert.ok(Math.abs(low.velocity - high.velocity) < 1e-12);
  assert.deepEqual(cardFanAdvance(low, 1, 0, 9), low);
  const redirected = cardFanAdvance(low, 1, 0.00001, 9);
  assert.ok(Math.abs(redirected.position - low.position) < 0.001);
  assert.ok(Math.abs(redirected.velocity - low.velocity) < 0.01);
  let state = low;
  for (let i = 0; i < 360; i++) state = cardFanAdvance(state, 1, 1 / 120, 9);
  assert.deepEqual(state, { position: 1, velocity: 0 });
});

test('shadow spreads and fades as the card rises, and follows lateral movement', () => {
  const rest = cardShadow(0, -0.04, 0, 0, 0, 1);
  const raised = cardShadow(0, 0.21, 0, 0, 0, 1);
  assert.ok(raised.width > rest.width && raised.depth > rest.depth);
  assert.ok(raised.opacity < rest.opacity && raised.softness > rest.softness);
  assert.ok(Math.abs(raised.y - rest.y) < 0.03, 'the footprint should stay on the ground');
  assert.equal(cardShadow(0.3, -0.04, 0, 0, 0, 1).x - rest.x, 0.3);
});

test('shadow narrows edge-on and returns to the same footprint on either face', () => {
  const front = cardShadow(0, -0.04, 0, 0, 0, 1);
  const edge = cardShadow(0, -0.04, Math.PI / 2, 0, 0, 1);
  const back = cardShadow(0, -0.04, Math.PI, 0, 0, 1);
  assert.ok(edge.width < front.width * 0.6);
  for (const key of Object.keys(front)) assert.ok(Math.abs(front[key] - back[key]) < 1e-12);
});

test('full card and soft pile envelope fit throughout a flip, including pointer extremes', () => {
  const surface = liquidLens(roundedRect(3.4, 2.14, 0.22));
  const pile = plushPile(surface), attributes = pile.geometry.attributes, points = [];
  // The outer shell encloses every intermediate layer. Project its actual
  // rounded surface, including the soft extension beyond the card silhouette.
  for (let i = 0; i < attributes.position.count; i++) {
    const point = new Vector3().fromBufferAttribute(attributes.position, i);
    const normal = new Vector3().fromBufferAttribute(attributes.normal, i);
    points.push(point.addScaledVector(normal, PLUSH_PILE_DEPTH));
  }
  surface.dispose(); pile.geometry.dispose(); pile.material.dispose();
  // This also encloses the thick glass body and every thinner material.
  for (const x of [-1.7, 1.7]) for (const y of [-1.07, 1.07]) for (const z of [-0.24, 0.24]) points.push(new Vector3(x, y, z));
  const point = new Vector3();
  for (const aspect of [0.95, 1.2, 1.5, 1.9, 2.5, 3.2]) {
    const camera = new PerspectiveCamera(CARD_CAMERA_FOV, aspect, 0.1, 50);
    camera.position.z = cardCameraSpan(aspect) / (2 * Math.tan(CARD_CAMERA_FOV / 2 * Math.PI / 180));
    camera.updateMatrixWorld();
    for (let i = 0; i <= 100; i++) for (const dx of [-1, 1]) for (const dy of [-1, 1]) {
      const pose = cardTurn(i / 100);
      const rotation = new Euler(-0.13 + dy * 0.14 + pose.pitch, Math.PI * pose.turn - 0.16 + dx * 0.245, -0.025 + pose.bank + 0.008, 'YXZ');
      for (const sample of points) {
        point.copy(sample).multiplyScalar(pose.scale).applyEuler(rotation);
        point.y += -0.04 + pose.lift + 0.025;
        point.project(camera);
        assert.ok(Math.abs(point.x) < 0.995 && Math.abs(point.y) < 0.995, `card clipped at aspect ${aspect}, progress ${i / 100}`);
      }
    }
  }
});
