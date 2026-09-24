import assert from 'node:assert/strict';
import test from 'node:test';
import {
  readRouteTimeline,
  advanceRouteTimeline,
  JOURNEY_DURATION_MS,
  TURN_WARNING_MS,
  TURN_WARNING_METERS,
  TURN_CROSSING_MS,
  TOTAL_ROUTE_METERS,
} from '../components/demos/route-approach-timeline.ts';

test('warning precedes zero, the arrow turns at zero, and the next distance refreshes on the next tick', () => {
  const end = readRouteTimeline(0).legEndMs;
  assert.equal(readRouteTimeline(end - TURN_WARNING_MS - 1).approaching, false);
  assert.equal(readRouteTimeline(end - TURN_WARNING_MS).approaching, true);
  assert.equal(
    readRouteTimeline(end - TURN_WARNING_MS).meters,
    TURN_WARNING_METERS,
  );
  assert.equal(readRouteTimeline(end - 1).meters, 5);
  for (const elapsed of [end - TURN_WARNING_MS, end - 1500, end - 1]) {
    const state = readRouteTimeline(elapsed);
    assert.ok(state.meters > 0);
    assert.equal(state.approaching, true);
    assert.equal(state.turn, 'right');
  }
  for (const elapsed of [end, end + 50, end + TURN_CROSSING_MS - 1]) {
    const turning = readRouteTimeline(elapsed);
    assert.equal(turning.meters, 0);
    assert.equal(turning.leg.street, 'Alexandre st');
    assert.equal(turning.phase, 'turning');
    assert.equal(turning.turn, 'left');
    assert.equal(turning.approaching, false);
    assert.equal(advanceRouteTimeline(elapsed), elapsed);
  }
  const next = readRouteTimeline(end + TURN_CROSSING_MS);
  assert.equal(next.meters, 45);
  assert.equal(next.leg.turn, 'left');
  assert.equal(next.phase, 'driving');
  assert.equal(next.approaching, false);
  const secondTurn = readRouteTimeline(next.legEndMs);
  assert.equal(secondTurn.meters, 0);
  assert.equal(secondTurn.turn, 'straight');
  const finalLeg = readRouteTimeline(next.legEndMs + TURN_CROSSING_MS);
  assert.equal(finalLeg.leg.turn, 'straight');
  assert.equal(finalLeg.meters, 30);
  assert.equal(finalLeg.approaching, false);
  assert.equal(readRouteTimeline(JOURNEY_DURATION_MS).approaching, false);
});

test('each upcoming direction change pulses exactly twice, then stays steady at zero', () => {
  let start = 0;
  for (let index = 0; index < 2; index++) {
    const end = readRouteTimeline(start).legEndMs;
    const warningStart = end - TURN_WARNING_MS;
    const pulse = (offset) =>
      readRouteTimeline(warningStart + offset).signalOpacity;
    assert.equal(pulse(-100), 1);
    assert.equal(pulse(0), 1);
    assert.equal(pulse(500), 0.25);
    assert.equal(pulse(1000), 1);
    assert.equal(pulse(1500), 0.25);
    assert.equal(pulse(2000), 1);
    const opacityFrames = Array.from({ length: 21 }, (_, frame) =>
      pulse(frame * 100),
    );
    assert.equal(
      opacityFrames.filter(
        (value, frame) =>
          frame > 0 &&
          frame < 20 &&
          value < opacityFrames[frame - 1] &&
          value < opacityFrames[frame + 1],
      ).length,
      2,
    );
    start = end + TURN_CROSSING_MS;
  }
});

test('the final approach stays steady because arrival is not a direction change', () => {
  assert.equal(
    readRouteTimeline(JOURNEY_DURATION_MS - TURN_WARNING_MS).meters,
    10,
  );
  for (
    let elapsed = JOURNEY_DURATION_MS - TURN_WARNING_MS;
    elapsed <= JOURNEY_DURATION_MS + 1000;
    elapsed += 100
  ) {
    const state = readRouteTimeline(elapsed);
    assert.equal(state.turn, 'straight');
    assert.equal(state.approaching, false);
    assert.equal(state.signalOpacity, 1);
  }
  assert.equal(readRouteTimeline(JOURNEY_DURATION_MS).meters, 0);
  assert.equal(readRouteTimeline(JOURNEY_DURATION_MS).phase, 'arrived');
});

test('whole-journey rail never resets or moves backward when the local distance resets', () => {
  let previous = 1;
  for (let elapsed = 0; elapsed <= JOURNEY_DURATION_MS; elapsed += 10) {
    const state = readRouteTimeline(elapsed);
    assert.ok(state.remaining <= previous);
    assert.ok(state.remaining >= 0);
    assert.ok(state.meters >= 0 && state.meters <= state.leg.meters);
    previous = state.remaining;
  }
  const end = readRouteTimeline(0).legEndMs;
  for (const boundary of [end, end + TURN_CROSSING_MS]) {
    const beforeTurn = readRouteTimeline(boundary - 1);
    const afterTurn = readRouteTimeline(boundary);
    assert.ok(Math.abs(afterTurn.remaining - beforeTurn.remaining) < 0.001);
  }
  assert.equal(readRouteTimeline(end).remainingMeters, 75);
  assert.equal(readRouteTimeline(end).remaining, 75 / TOTAL_ROUTE_METERS);
  assert.equal(readRouteTimeline(end + TURN_CROSSING_MS).remainingMeters, 75);
  const secondEnd = readRouteTimeline(end + TURN_CROSSING_MS).legEndMs;
  assert.equal(readRouteTimeline(secondEnd).remainingMeters, 30);
  assert.equal(readRouteTimeline(JOURNEY_DURATION_MS).remaining, 0);
  assert.equal(readRouteTimeline(JOURNEY_DURATION_MS + 5000).phase, 'arrived');
});

test('manual stepping cannot skip a turn, and final arrival remains stable', () => {
  const end = readRouteTimeline(0).legEndMs;
  assert.equal(advanceRouteTimeline(end - 500), end);
  assert.equal(advanceRouteTimeline(end), end);
  assert.ok(
    advanceRouteTimeline(end + TURN_CROSSING_MS) > end + TURN_CROSSING_MS,
  );
  assert.equal(advanceRouteTimeline(JOURNEY_DURATION_MS), JOURNEY_DURATION_MS);
  assert.equal(readRouteTimeline(-10).meters, 60);
});
