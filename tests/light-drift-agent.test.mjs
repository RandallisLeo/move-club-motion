import assert from 'node:assert/strict';
import test from 'node:test';
import { createLightAgentMotion, lightAgentInputState } from '../components/demos/light-drift-agent.ts';
import { createLightAdhesionField } from '../components/demos/light-drift-surface.ts';

test('user speech interrupts thinking or answering and then gives the floor back to listening', () => {
  for (const state of ['thinking', 'answering']) {
    const agent = createLightAgentMotion();
    agent.select(state);
    agent.step(.05);
    agent.select(lightAgentInputState(agent.state));
    assert.equal(agent.state, 'interrupted');
    for (let frame = 0; frame < 60; frame++) agent.step(1 / 60);
    assert.equal(agent.state, 'listening');
  }
  for (const state of ['listening', 'interrupted', 'custom']) {
    const agent = createLightAgentMotion();
    if (state === 'custom') agent.customize(); else agent.select(state);
    agent.select(lightAgentInputState(agent.state));
    assert.equal(agent.state, 'listening');
  }
});

test('interrupt brakes an answer, then returns to listening without resetting the wave', () => {
  const agent = createLightAgentMotion();
  agent.select('answering');
  for (let i = 0; i < 100; i++) agent.step(.016);
  const before = agent.step(0);
  agent.select('interrupted');
  assert.equal(agent.step(0).speed, before.speed);
  for (let i = 0; i < 20; i++) agent.step(.016);
  assert.ok(agent.step(0).speed < before.speed * .25);
  assert.equal(agent.state, 'interrupted');
  for (let i = 0; i < 40; i++) agent.step(.016);
  assert.equal(agent.state, 'listening');
});

test('pause freezes transitions and selecting a new state cancels the interrupted return', () => {
  const agent = createLightAgentMotion();
  agent.select('interrupted');
  const frozen = agent.step(0);
  for (let i = 0; i < 100; i++) assert.deepEqual(agent.step(0), frozen);
  agent.select('thinking');
  for (let i = 0; i < 100; i++) agent.step(.016);
  assert.equal(agent.state, 'thinking');
});

test('manual tuning clears a preset without snapping the motion or returning to listening', () => {
  const agent = createLightAgentMotion();
  agent.select('interrupted');
  for (let i = 0; i < 10; i++) agent.step(.016);
  const before = agent.step(0);
  agent.customize();
  for (let i = 0; i < 100; i++) {
    const after = agent.step(.016);
    assert.equal(after.state, 'custom');
    assert.equal(after.speed, before.speed);
    assert.equal(after.amplitude, before.amplitude);
  }
  agent.select('thinking');
  assert.equal(agent.state, 'thinking');
});

test('state changes keep adhesion attached and preserve its fixed optical thickness', () => {
  const agent = createLightAgentMotion();
  const field = createLightAdhesionField();
  let time = 1.6;
  for (const state of ['listening', 'thinking', 'answering', 'interrupted']) {
    agent.select(state);
    for (let frame = 0; frame < 100; frame++) {
      const motion = agent.step(.016);
      time += .016 * motion.speed;
      field.update(time, .65, motion.amplitude);
      for (let i = 0; i < field.count; i++) {
        const x = i * 2 / (field.count - 1) - 1;
        const opticalWidth = (.003 + .009 * Math.max(0, 1 - x * x) ** 1.3) * 2.1;
        const a = field.data[i * 4], b = field.data[i * 4 + 1];
        assert.ok(Math.abs(field.membrane[i * 4] - (Math.min(a, b) - opticalWidth)) < 1e-6);
        assert.ok(Math.abs(field.membrane[i * 4 + 1] - (Math.max(a, b) + opticalWidth)) < 1e-6);
      }
    }
  }
});
