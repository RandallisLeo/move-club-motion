/** A single continuous turn: anticipation, lift, overshoot, then settle. */
export const CARD_TURN_SECONDS = 1.48;
export const CARD_CAMERA_FOV = 22;
export function cardCameraSpan(aspect: number) { return Math.max(3.8, 4.7 / aspect); }

export function cardTurn(progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  // Delay rotation until the card has begun to open toward the viewer.
  const p = Math.max(0, (t - 0.075) / 0.925);
  const turn = p === 1 ? 1 : 1 - Math.exp(-6.8 * p) * (Math.cos(7.3 * p) + 6.8 / 7.3 * Math.sin(7.3 * p));
  const lift = Math.sin(Math.PI * t) ** 2;
  const anticipation = Math.sin(Math.PI * Math.min(t / 0.42, 1)) ** 2;
  return { turn, lift: lift * 0.25, scale: 1 + anticipation * 0.046 + lift * 0.018, bank: -0.075 * Math.sin(Math.PI * t), pitch: 0.16 * Math.sin(Math.PI * t) };
}

/** Time-based damping keeps pointer inertia consistent across refresh rates. */
export function cardDamp(current: number, target: number, dt: number, rate = 8) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export const CARD_FAN_RADIUS = 8.6;
export const CARD_FAN_STEP = Math.PI / 7;
export type CardFanMotion = { position: number; velocity: number };

/** Park adjacent cards above/below the viewport, even in a narrow layout. */
export function cardFanRadius(verticalSpan: number) {
  return Math.max(CARD_FAN_RADIUS, (verticalSpan / 2 + 2.5) / Math.sin(CARD_FAN_STEP));
}

/** The nearest occurrence on an unbounded loop, preserving direction at the seam. */
export function cardFanTarget(index: number, previousTarget: number, count: number) {
  return index + Math.round((previousTarget - index) / count) * count;
}

/** One angular spring drives every card, including when a new choice interrupts it. */
export function cardFanAdvance(state: CardFanMotion, target: number, dt: number, frequency = 9) {
  if (dt <= 0) return { ...state };
  const damping = 0.84, decay = damping * frequency;
  const oscillation = frequency * Math.sqrt(1 - damping * damping);
  const offset = state.position - target;
  const amplitude = (state.velocity + decay * offset) / oscillation;
  const cosine = Math.cos(oscillation * dt), sine = Math.sin(oscillation * dt);
  const envelope = Math.exp(-decay * dt);
  const displacement = offset * cosine + amplitude * sine;
  const position = target + envelope * displacement;
  const velocity = envelope * ((amplitude * oscillation - decay * offset) * cosine
    - (offset * oscillation + decay * amplitude) * sine);
  return Math.abs(position - target) < 0.0003 && Math.abs(velocity) < 0.002
    ? { position: target, velocity: 0 }
    : { position, velocity };
}

/** The fan pivots to the left; each card also folds about its own horizontal axis. */
export function cardFanPose(index: number, position: number, count: number, radius = CARD_FAN_RADIUS) {
  // Recycle the farthest card outside the viewport, keeping the visible arc
  // unchanged. Increasing the selection lifts the next card in from below.
  const offset = position - cardFanTarget(index, position, count), theta = offset * CARD_FAN_STEP;
  const fold = Math.sin(Math.max(-1, Math.min(1, offset)) * Math.PI / 2);
  const distance = Math.min(1, Math.abs(offset));
  const focus = 1 - distance ** 3 * (distance * (distance * 6 - 15) + 10);
  return {
    x: (Math.cos(theta) - 1) * radius,
    y: Math.sin(theta) * radius,
    roll: theta,
    pitch: fold * 1.18,
    // No shadow or colored glass backdrop from cards parked outside the stage.
    focus,
  };
}

/** A soft ground footprint derived from the rendered card, including idle tilt. */
export function cardShadow(x: number, y: number, yaw: number, pitch: number, roll: number, scale: number) {
  const height = Math.max(-0.03, y + 0.04);
  // Retain a little width edge-on for the area light; keep both faces symmetric.
  const facing = Math.sqrt(Math.cos(yaw) ** 2 + 0.08 * Math.sin(yaw) ** 2);
  return {
    x: x + 0.12 + height * 0.55 + Math.sin(yaw * 2) * 0.12,
    y: -1.43 + height * 0.04 + Math.sin(pitch) * 0.06,
    width: (1.25 + 2.85 * facing) * (1 + height * 0.65) * scale,
    depth: 0.62 + height * 0.65 + Math.abs(Math.sin(pitch)) * 0.16 + (1 - facing) * 0.1,
    rotation: -roll * 0.2 + Math.sin(yaw * 2) * 0.035,
    opacity: 0.21 * (0.75 + 0.25 * facing) / (1 + Math.max(0, height) * 2.8),
    softness: Math.min(1, Math.max(0, height) * 2.4),
  };
}
