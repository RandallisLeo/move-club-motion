export const RELAY_DURATION = 1.18;
export const RELAY_CARD_DURATION = .98;
export const RELAY_STAGGER = .016;
export const RELAY_TAU = Math.PI * 2;
export const RELAY_SPEEDS = [.55, .48, .22] as const;
export const relayClamp = (v: number) => Math.max(0, Math.min(1, v));
export const relayLerp = (a: number, b: number, p: number) => a + (b - a) * p;

// Integrate a continuous velocity curve: accelerate immediately, then take
// longer to slow down. Position, velocity and acceleration join continuously.
export function relayCadence(value: number) {
  const t = relayClamp(value), peak = .24;
  if (t === 0 || t === 1) return t;
  if (t <= peak) return t - peak / Math.PI * Math.sin(Math.PI * t / peak);
  return t + (1 - peak) / Math.PI * Math.sin(Math.PI * (t - peak) / (1 - peak));
}
export function relayNearestAngle(angle: number, reference: number) {
  return angle + Math.round((reference - angle) / RELAY_TAU) * RELAY_TAU;
}
export function relayCircle(radius: number, angle: number) {
  return { x: Math.sin(angle) * radius, z: Math.cos(angle) * radius };
}
export const RELAY_BURST_DURATION = 3.2;
const RELAY_BURST_PEAK = 2.7;
const RELAY_BURST_ACCELERATION = .4;
const RELAY_BURST_HOLD = .8;
const RELAY_BURST_AREA = (RELAY_BURST_DURATION + RELAY_BURST_HOLD) / 2;
export const RELAY_BURST_TURN = RELAY_BURST_PEAK * RELAY_BURST_AREA;

// Speed belongs to the shared orbit, independently of the formation morph.
// Arrive on the new route at speed, run along it, then coast down gradually.
export function relayBurstProgress(seconds: number, entryVelocity = 0) {
  const t = Math.max(0, Math.min(RELAY_BURST_DURATION, seconds));
  const rise = RELAY_BURST_ACCELERATION;
  const peak = 1 / RELAY_BURST_AREA;
  if (t <= rise) return entryVelocity * t + (peak - entryVelocity) * (t - rise / Math.PI * Math.sin(Math.PI * t / rise)) / 2;
  const entryTravel = rise * entryVelocity / 2;
  if (t <= rise + RELAY_BURST_HOLD) return entryTravel + (rise / 2 + t - rise) / RELAY_BURST_AREA;
  const tail = RELAY_BURST_DURATION - rise - RELAY_BURST_HOLD, s = t - rise - RELAY_BURST_HOLD;
  return entryTravel + (rise / 2 + RELAY_BURST_HOLD + (s + tail / Math.PI * Math.sin(Math.PI * s / tail)) / 2) / RELAY_BURST_AREA;
}
export function relayBurstVelocity(seconds: number, entryVelocity = 0) {
  if (seconds <= 0) return entryVelocity;
  if (seconds >= RELAY_BURST_DURATION) return 0;
  const rise = RELAY_BURST_ACCELERATION;
  if (seconds <= rise) return entryVelocity + (1 / RELAY_BURST_AREA - entryVelocity) * (1 - Math.cos(Math.PI * seconds / rise)) / 2;
  if (seconds <= rise + RELAY_BURST_HOLD) return 1 / RELAY_BURST_AREA;
  return (1 + Math.cos(Math.PI * (seconds - rise - RELAY_BURST_HOLD) / (RELAY_BURST_DURATION - rise - RELAY_BURST_HOLD))) / (2 * RELAY_BURST_AREA);
}

// The front rises on the left and dips on the right; the back is mirrored.
// They meet at the projected orbit's two endpoints. The route stays fixed
// while the sheets pass through it, with perspective compensated for depth.
export function relayWave(worldAngle: number, amount: number, perspective = 0) {
  if (amount === 0) return { y: 0, rx: 0, rz: 0 };
  const depth = Math.max(0, Math.min(.45, perspective));
  const distance = 1 - depth * Math.cos(worldAngle);
  const screenX = Math.sin(worldAngle) * Math.sqrt(1 - depth * depth) / distance;
  const phase = Math.PI * screenX;
  const branch = Math.cos(worldAngle) >= depth ? 1 : -1;
  return {
    y: amount * 46 * Math.sin(phase) * distance * branch,
    rx: 0,
    rz: amount * Math.cos(phase) * .018 * (Math.cos(worldAngle) - depth),
  };
}
