import assert from 'node:assert/strict';
import test from 'node:test';
import {
  lightStrandPoint, lightStrandPhase, createLightMembraneFrame, createLightAdhesionField, lightAttachedSection,
  LIGHT_STRAND_COUNT, LIGHT_CYCLE_SECONDS,
} from '../components/demos/light-drift-surface.ts';

const tau = Math.PI * 2;
test('phase relationships change while the three waves keep advancing and stay separated', () => {
  let minimumOffset = Infinity, maximumOffset = -Infinity;
  for (let time = 0; time < 20; time += .013) {
    const phases = createLightMembraneFrame(time, .65).phases;
    assert.equal(phases.length, LIGHT_STRAND_COUNT);
    const offset = phases[1] - phases[0];
    minimumOffset = Math.min(minimumOffset, offset);
    maximumOffset = Math.max(maximumOffset, offset);
    assert.ok(offset > .8 && offset < 3.2);
    assert.ok(phases[2] - phases[0] > 3.1 && phases[2] - phases[0] < 5.3);
    for (let strand = 0; strand < LIGHT_STRAND_COUNT; strand++) {
      const speed = (lightStrandPhase(time + .001, strand) - phases[strand]) / .001;
      const previousSpeed = (phases[strand] - lightStrandPhase(time - .001, strand)) / .001;
      assert.ok(Math.abs(speed - previousSpeed) < .05, 'easing must not introduce a catch or acceleration seam');
      assert.ok(speed > 3.2 && speed < 9.5, 'waves must keep advancing without a reset or dwell');
    }
  }
  assert.ok(maximumOffset - minimumOffset > .8, 'successive encounters should not repeat the same timing');
});

test('the repeatable wave has quiet endpoints and cannot collapse all three center heights together', () => {
  for (const fold of [.1, .65, 1]) {
    for (let time = 0; time < LIGHT_CYCLE_SECONDS; time += .031) {
      const phases = createLightMembraneFrame(time, fold).phases;
      const heights = phases.map(phase => lightStrandPoint(0, phase, fold)[1]);
      assert.ok(Math.max(...heights) - Math.min(...heights) > .065);
      for (let strand = 0; strand < LIGHT_STRAND_COUNT; strand++) {
        const phase = phases[strand];
        for (const u of [-1, -.99, -.5, 0, .5, .99, 1]) {
          const a = lightStrandPoint(u, phase, fold);
          const b = lightStrandPoint(u, phase + tau, fold);
          assert.ok(a.every(Number.isFinite));
          assert.ok(Math.abs(a[1]) < .32);
          assert.ok(Math.hypot(a[1] - b[1], a[2] - b[2]) < 1e-10);
          if (Math.abs(u) > .98) assert.ok(Math.hypot(a[1], a[2]) < .003);
        }
      }
    }
  }
});

test('the upper Fold range opens farther while the default pose stays unchanged', () => {
  let maxDefault = 0, maxOpen = 0;
  for (let phase = 0; phase < tau; phase += .01) {
    const baseline = (.105 + .095 * .65) * Math.sin(-phase) + .012 * Math.sin(-2 * phase - .65);
    assert.ok(Math.abs(lightStrandPoint(0, phase, .65)[1] - baseline) < 1e-12);
    maxDefault = Math.max(maxDefault, Math.abs(baseline));
    maxOpen = Math.max(maxOpen, Math.abs(lightStrandPoint(0, phase, 1)[1]));
  }
  assert.ok(maxOpen > maxDefault * 1.65);
});

test('the third contour remains weaker than both main bands', () => {
  for (let time = 0; time < LIGHT_CYCLE_SECONDS; time += .01) {
    const { energy } = createLightMembraneFrame(time, .65);
    assert.ok(energy[2] > 0 && energy[2] < energy[0] && energy[2] < energy[1]);
  }
});

test('motion is continuous through a lap boundary', () => {
  for (const time of [0, LIGHT_CYCLE_SECONDS, 2 * LIGHT_CYCLE_SECONDS]) {
    for (let strand = 0; strand < LIGHT_STRAND_COUNT; strand++) {
      const a = lightStrandPhase(time - .0001, strand);
      const b = lightStrandPhase(time + .0001, strand);
      assert.ok(b > a && b - a < .002);
    }
  }
});


test('contact holds a visible neck after raw wave paths begin separating, then releases', () => {
  const field = createLightAdhesionField(33);
  let retained = false, released = false;
  const middle = 16 * 4;
  for (let step = 0; step < 480; step++) {
    const time = step / 120;
    const paths = field.update(time, .65);
    const { phases } = createLightMembraneFrame(time, .65);
    const rawGap = Math.abs(lightStrandPoint(0, phases[0], .65)[1] - lightStrandPoint(0, phases[1], .65)[1]);
    const deformedGap = Math.abs(paths[middle] - paths[middle + 1]);
    if (rawGap > .09 && rawGap < .17 && paths[middle + 3] > .8 && deformedGap < rawGap * .4) retained = true;
    if (retained && paths[middle + 3] < .3 && deformedGap > .12) released = true;
    assert.ok(paths.every(Number.isFinite));
  }
  assert.ok(retained, 'separating waves must stay geometrically connected');
  assert.ok(released, 'a connection must eventually stretch apart');
});

test('pause keeps the material still and replay clears its contact history', () => {
  const field = createLightAdhesionField(33);
  const start = Array.from(field.update(0, .65));
  const startShape = Array.from(field.shape);
  const startMembrane = Array.from(field.membrane);
  const startSpans = Array.from(field.spans);
  for (let step = 1; step <= 120; step++) field.update(step / 60, .65);
  const held = Array.from(field.data);
  const heldShape = Array.from(field.shape);
  const heldMembrane = Array.from(field.membrane);
  const heldSpans = Array.from(field.spans);
  assert.deepEqual(Array.from(field.update(2, .65)), held);
  assert.deepEqual(Array.from(field.shape), heldShape);
  assert.deepEqual(Array.from(field.membrane), heldMembrane);
  assert.deepEqual(Array.from(field.spans), heldSpans);
  assert.deepEqual(Array.from(field.update(0, .65)), start);
  assert.deepEqual(Array.from(field.shape), startShape);
  assert.deepEqual(Array.from(field.membrane), startMembrane);
  assert.deepEqual(Array.from(field.spans), startSpans);
});


test('a similar contact gap can lean and stretch differently with its motion history', () => {
  const field = createLightAdhesionField(65);
  const shears = [], spreads = [], lags = [];
  for (let step = 0; step < 720; step++) {
    field.update(step / 120, .65);
    assert.ok(field.shape.every(Number.isFinite));
    for (let i = 20; i <= 44; i++) {
      const slot = i * 4;
      const gap = Math.abs(field.data[slot] - field.data[slot + 1]);
      if (field.data[slot + 3] > .65 && gap > .02 && gap < .04) {
        lags.push(field.shape[slot]);
        shears.push(field.shape[slot + 1]);
        spreads.push(field.shape[slot + 3]);
      }
    }
  }
  assert.ok(shears.length > 50);
  assert.ok(Math.min(...shears) < -.2 && Math.max(...shears) > .2, 'a join must lean in both directions');
  assert.ok(Math.max(...spreads) - Math.min(...spreads) > .08, 'similar gaps must not share one fixed silhouette');
  assert.ok(Math.min(...lags) < -.005 && Math.max(...lags) > .005, 'the shared light must trail its motion');
});


test('visible crossings travel above and below the center while endpoints stay tethered', () => {
  const field = createLightAdhesionField(97);
  const heights = [];
  let minX = Infinity, maxX = -Infinity;
  for (let step = 0; step < 1440; step++) {
    const data = field.update(step / 120, .65);
    assert.equal(data[0], 0);
    assert.equal(data[96 * 4], 0);
    for (let i = 18; i < 78; i++) {
      const j = i * 4, k = j + 4;
      const gap = data[j] - data[j + 1], next = data[k] - data[k + 1];
      if (gap * next < 0) {
        const fraction = gap / (gap - next);
        heights.push(data[j] * (1 - fraction) + data[k] * fraction);
        const x = -1 + (i + fraction) * 2 / 96;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      }
    }
  }
  heights.sort((a, b) => a - b);
  assert.ok(heights.length > 100);
  // Require sustained upper/lower meetings, not one accidental outlier.
  assert.ok(heights[Math.floor(heights.length * .1)] < -.08);
  assert.ok(heights[Math.floor(heights.length * .9)] > .07);
  assert.ok(maxX - minX > .9);
});


test('membrane boundaries stay attached to the rendered samples through contact and release', () => {
  const field = createLightAdhesionField(65);
  for (const fold of [.1, .65, 1]) {
    for (let frame = 0; frame < 360; frame++) {
      field.update(frame / 120, fold);
      for (let i = 1; i < 64; i++) {
        const slot = i * 4, x = i * 2 / 64 - 1;
        const a = field.data[slot], b = field.data[slot + 1];
        const surface = (.003 + .009 * Math.max(0, 1 - x * x) ** 1.3) * 2.1;
        const [lower, upper, warp] = field.membrane.slice(slot, slot + 3);
        assert.ok(Math.abs(lower - (Math.min(a, b) - surface)) < 1e-7);
        assert.ok(Math.abs(upper - (Math.max(a, b) + surface)) < 1e-7);
        assert.ok(lower < a && lower < b && upper > a && upper > b);
        for (const v of [0, .1, .5, .9, 1]) {
          const mapped = v + warp * 4 * v * (1 - v);
          assert.ok(mapped >= 0 && mapped <= 1, 'interior warp must stay inside the attachments');
          if (v === 0 || v === 1) assert.equal(mapped, v);
        }
      }
    }
  }
});

test('a crossing retains finite membrane volume without depending on a drifting center', () => {
  for (const y of [-.12, 0, .12]) {
    const original = lightAttachedSection(0, y, y, 1, -.02, -.8);
    const moved = lightAttachedSection(0, y, y, 1, .02, .8);
    assert.equal(original[0], moved[0]);
    assert.equal(original[1], moved[1]);
    assert.ok(original[1] - original[0] > .05, 'the crossing must not collapse into a scissor tip');
  }
});


test('each active membrane has bounded side arcs with a nonzero waist', () => {
  const field = createLightAdhesionField(97);
  let sections = 0;
  for (let step = 0; step < 360; step++) {
    field.update(step / 120, .65);
    assert.ok(field.spans.every(Number.isFinite));
    for (let i = 0; i < 97; i++) {
      if (field.membrane[i * 4 + 3] <= .14) continue;
      const [left, right, insetLeft, insetRight] = field.spans.slice(i * 4, i * 4 + 4);
      const x = -1 + i * 2 / 96;
      assert.ok(left <= x + 1e-6 && right >= x - 1e-6);
      assert.ok(left >= -1 && right <= 1 && right > left);
      assert.ok(insetLeft > .15 && insetRight > .15);
      assert.ok(insetLeft + insetRight < .65, 'side arcs must leave the middle connected');
      sections++;
    }
  }
  assert.ok(sections > 100);
});
