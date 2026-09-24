import assert from 'node:assert/strict';
import test from 'node:test';
import { createLightSoundFeedback } from '../components/demos/light-drift-sound.ts';

test('each accent rises quickly then contracts monotonically with a quiet interval', () => {
  for (const mode of ['input', 'output']) {
    const feedback = createLightSoundFeedback();
    feedback.select(mode);
    const samples = Array.from({ length: 180 }, () => feedback.step(1 / 60));
    const peak = Math.max(...samples.map(s => s.scale));
    const peakFrame = samples.findIndex(s => s.scale === peak);
    assert.ok(peakFrame >= 8 && peakFrame <= 11, 'accent should reach its peak near 160 ms');
    assert.ok(peak >= 1.45);
    for (let i = peakFrame + 1; i < samples.length; i++) {
      assert.ok(samples[i].scale <= samples[i - 1].scale, 'no oscillations on release');
    }
    assert.ok(samples[30].scale > 1.40, 'release should retain volume well after the quick attack');
    assert.equal(samples.at(-1).scale, 1, 'rest between accents');
    for (const sample of samples) {
      assert.equal(sample.x, 0); assert.equal(sample.y, 0);
      assert.ok(sample.scale <= 1.60);
    }
  }
});

test('stopping preserves continuity then settles, and reduced motion is neutral', () => {
  const feedback = createLightSoundFeedback();
  assert.deepEqual(feedback.step(.016), { scale: 1, x: 0, y: 0 });
  feedback.select('output');
  for (let i = 0; i < 8; i++) feedback.step(1 / 60);
  const before = feedback.step(0);
  feedback.select(null);
  assert.deepEqual(feedback.step(0), before);
  let after;
  for (let i = 0; i < 180; i++) after = feedback.step(1 / 60);
  assert.ok(after.scale - 1 < .00001);
  feedback.select('input');
  assert.deepEqual(feedback.step(.016, true), { scale: 1, x: 0, y: 0 });
});

test('one click produces one accent and never restarts it automatically', () => {
  const feedback = createLightSoundFeedback();
  feedback.select('output');
  for (let i = 0; i < 180; i++) feedback.step(1 / 60);
  assert.equal(feedback.mode, null);
  for (let i = 0; i < 1200; i++) {
    assert.deepEqual(feedback.step(1 / 60), { scale: 1, x: 0, y: 0 });
  }
  feedback.select('input');
  assert.ok(feedback.step(.05).scale > 1, 'only another click triggers another accent');
});
