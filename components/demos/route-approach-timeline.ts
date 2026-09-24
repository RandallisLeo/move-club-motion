export const ROUTE_LEGS = [
  { street: 'Alexandre st', meters: 60, turn: 'right' },
  { street: 'Willow avenue', meters: 45, turn: 'left' },
  { street: 'Move Club', meters: 30, turn: 'straight' },
] as const;

// Demo pace: the last 10 meters take two seconds, rather than starting the
// warning tens of meters before the turn. This is not a real-world safety threshold.
const MS_PER_METER = 200;
export const TURN_WARNING_MS = 2000;
export const TURN_WARNING_METERS = 10;
const SIGNAL_PULSE_MS = TURN_WARNING_MS / 2;

function turnSignalOpacity(elapsed: number) {
  // Two complete pulses, driven by route time so pause/resume cannot restart them.
  const phase =
    Math.max(0, Math.min(TURN_WARNING_MS, elapsed)) / SIGNAL_PULSE_MS;
  return 0.25 + 0.75 * ((1 + Math.cos(phase * Math.PI * 2)) / 2);
}
export const TURN_TRANSITION_MS = 700;
// One simulation tick exposes 0m at the turn; the new distance doesn't wait
// for the arrow's longer visual rotation to finish.
export const TURN_CROSSING_MS = 100;
export const TOTAL_ROUTE_METERS = ROUTE_LEGS.reduce(
  (sum, leg) => sum + leg.meters,
  0,
);
export const JOURNEY_DURATION_MS =
  TOTAL_ROUTE_METERS * MS_PER_METER +
  (ROUTE_LEGS.length - 1) * TURN_CROSSING_MS;

export function readRouteTimeline(elapsedMs: number) {
  const elapsed = Math.max(0, Math.min(JOURNEY_DURATION_MS, elapsedMs));
  let start = 0;
  for (let index = 0; index < ROUTE_LEGS.length; index++) {
    const leg = ROUTE_LEGS[index];
    const end = start + leg.meters * MS_PER_METER;
    const final = index === ROUTE_LEGS.length - 1;
    if (elapsed < end + TURN_CROSSING_MS || final) {
      const phase = elapsed < end ? 'driving' : final ? 'arrived' : 'turning';
      const legRemaining = Math.max(0, (end - elapsed) / MS_PER_METER);
      const approaching =
        !final &&
        ROUTE_LEGS[index + 1].turn !== leg.turn &&
        elapsed < end &&
        end - elapsed <= TURN_WARNING_MS &&
        legRemaining <= TURN_WARNING_METERS;
      const remainingMeters =
        legRemaining +
        ROUTE_LEGS.slice(index + 1).reduce(
          (sum, upcoming) => sum + upcoming.meters,
          0,
        );
      return {
        leg,
        index,
        phase,
        // At zero, start rotating immediately; refresh the distance on the next tick.
        turn: phase === 'turning' ? ROUTE_LEGS[index + 1].turn : leg.turn,
        meters: Math.max(
          0,
          Math.ceil((end - elapsed) / (5 * MS_PER_METER)) * 5,
        ),
        legEndMs: end,
        approaching,
        signalOpacity: approaching
          ? turnSignalOpacity(elapsed - (end - TURN_WARNING_MS))
          : 1,
        // Only distance traveled advances the overall rail, never turn-animation time.
        remainingMeters,
        remaining: remainingMeters / TOTAL_ROUTE_METERS,
      };
    }
    start = end + TURN_CROSSING_MS;
  }
  throw new Error('A route must contain at least one leg.');
}

export function advanceRouteTimeline(elapsedMs: number) {
  const route = readRouteTimeline(elapsedMs);
  // Stop at the next boundary so manual stepping cannot skip a route leg.
  return route.phase === 'driving'
    ? Math.min(route.legEndMs, elapsedMs + 25 * MS_PER_METER)
    : elapsedMs;
}
