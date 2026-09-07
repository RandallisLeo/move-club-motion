import assert from 'node:assert/strict';
import test from 'node:test';
import { TRAVEL, joinedConnections, stepConnections } from '../components/demos/liquid-swipe-physics.ts';

function pair(side) {
  const cx = side === 1 ? 298 : 62;
  return {
    outer: { cx, side, push: 34, attachment: 'droplet' },
    inner: { cx, side, push: 96, attachment: 'capsule' },
  };
}

function simulate(side) {
  const { outer, inner } = pair(side);
  let outerState = joinedConnections();
  let innerState = joinedConnections();
  return (progress) => {
    const x = -side * TRAVEL * progress;
    const outerStep = stepConnections(x, outer, inner, outerState);
    const innerStep = stepConnections(x, inner, outer, innerState);
    outerState = outerStep.connections;
    innerState = innerStep.connections;
    return { outer: outerStep, inner: innerStep };
  };
}

test('clearing the capsule cannot fire a pulse while the outer bead still touches its neighbor', () => {
  for (const side of [-1, 1]) {
    const at = simulate(side);
    const halfOpen = at(0.55);
    assert.equal(halfOpen.outer.connections.capsule, false);
    assert.equal(halfOpen.outer.connections.neighbor, true);
    assert.equal(halfOpen.outer.release, null, 'the previous implementation incorrectly bounced here');
    const firstSplit = at(0.76);
    assert.equal(firstSplit.outer.release, 'droplet');
    assert.equal(firstSplit.inner.release, null);
    assert.equal(firstSplit.inner.connections.capsule, true);
    const secondSplit = at(0.9);
    assert.equal(secondSplit.outer.release, null);
    assert.equal(secondSplit.inner.release, 'capsule');
  }
});

test('both directions produce exactly two ordered releases; pausing and closing add none', () => {
  for (const side of [-1, 1]) {
    const at = simulate(side);
    const releases = [];
    for (let i = 0; i <= 1000; i++) {
      const step = at(i / 1000);
      if (step.outer.release) releases.push('outer');
      if (step.inner.release) releases.push('inner');
    }
    assert.deepEqual(releases, ['outer', 'inner']);
    for (let i = 1000; i >= 0; i--) {
      const step = at(i / 1000);
      assert.equal(step.outer.release, null);
      assert.equal(step.inner.release, null);
    }
    const reopen = at(1);
    assert.equal(reopen.outer.release, 'droplet');
    assert.equal(reopen.inner.release, 'capsule');
    for (let i = 0; i < 20; i++) {
      const held = at(1);
      assert.equal(held.outer.release, null);
      assert.equal(held.inner.release, null);
    }
  }
});

test('small pointer reversals at the first split cannot repeatedly pulse the outer bead', () => {
  const at = simulate(1);
  assert.equal(at(0.73).outer.release, 'droplet');
  for (let i = 0; i < 10; i++) {
    assert.equal(at(0.72).outer.release, null);
    assert.equal(at(0.73).outer.release, null);
  }
  assert.equal(at(0.70).outer.rejoined, true);
  assert.equal(at(0.74).outer.release, 'droplet');
});

test('a single fast sample crossing both seams preserves the outer-first recoil order', () => {
  for (const side of [-1, 1]) {
    const step = simulate(side)(1);
    assert.equal(step.outer.delayMs, 0);
    assert.equal(step.inner.delayMs, 60);
    assert.equal(step.outer.release, 'droplet');
    assert.equal(step.inner.release, 'capsule');
  }
});

test('the hidden pair remains joined when swiping in the opposite direction', () => {
  for (const side of [-1, 1]) {
    const step = simulate(side)(-1);
    assert.deepEqual(step.outer.connections, joinedConnections());
    assert.deepEqual(step.inner.connections, joinedConnections());
    assert.equal(step.outer.release, null);
    assert.equal(step.inner.release, null);
  }
});
