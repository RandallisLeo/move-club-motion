import assert from 'node:assert/strict';
import test from 'node:test';
import { getWorkoutRelease } from '../components/demos/workout-reel-physics.ts';

test('throws use their speed and direction to settle on five-minute landmarks', () => {
  assert.equal(getWorkoutRelease(31, 15, 4).target, 35);
  assert.equal(getWorkoutRelease(31, 45, 4).target, 45);
  assert.equal(getWorkoutRelease(31, -25, -4).target, 25);
});

test('slow, held, and short precise gestures retain individual minutes', () => {
  assert.deepEqual(getWorkoutRelease(32.1, 3, 2.1), {
    target: 32,
    throwing: false,
  });
  assert.deepEqual(getWorkoutRelease(28.2, 0, 8), {
    target: 28,
    throwing: false,
  });
  assert.deepEqual(getWorkoutRelease(31.1, 25, 1.1), {
    target: 31,
    throwing: false,
  });
});

test('landmarks respect endpoints and never reverse the throw', () => {
  assert.equal(getWorkoutRelease(4, -25, -4).target, 1);
  assert.equal(getWorkoutRelease(58, 25, 4).target, 60);
  for (let position = 1; position <= 60; position += 0.1) {
    for (const velocity of [-65, -8, 8, 65]) {
      const { target } = getWorkoutRelease(position, velocity, 4);
      assert.ok(target >= 1 && target <= 60);
      assert.ok(target === 1 || target % 5 === 0);
      assert.ok(velocity > 0 ? target >= position : target <= position);
    }
  }
});
