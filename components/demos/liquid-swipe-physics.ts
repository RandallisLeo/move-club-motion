export const TRAVEL = 154;
export const RADIUS = 22;
const CAPSULE_RELEASE_GAP = 4.5;
// Each circle is filtered with the capsule separately. Its softened edge adds
// about 0.45px; two neighboring circles visibly separate at a 0.9px gap.
const DROPLET_RELEASE_GAP = 0.9;

export const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export type Attachment = 'capsule' | 'droplet';
export type DropletGeometry = { cx: number; push: number; side: -1 | 1; attachment: Attachment };
export type Connections = { capsule: boolean; neighbor: boolean };
export const joinedConnections = (): Connections => ({ capsule: true, neighbor: true });

// Preserve the current capsule expansion and pushed-button trajectories.
export function bodyWidthAt(x: number) { return 280 - Math.abs(x) * 0.86; }
export function bodyLeftAt(x: number) { return 40 + x + (x < 0 ? -x * 0.86 : 0); }
export function edgeAt(x: number, side: -1 | 1) { return bodyLeftAt(x) + (side === 1 ? bodyWidthAt(x) : 0); }
export function centerAt(x: number, drop: DropletGeometry) {
  return drop.cx - drop.side * drop.push * clamp(-drop.side * x / TRAVEL);
}
export function gapAt(x: number, drop: DropletGeometry) { return drop.side * (centerAt(x, drop) - edgeAt(x, drop.side)) - RADIUS; }

/** Release only after the droplet loses its LAST connection to the cluster. */
export function stepConnections(x: number, drop: DropletGeometry, neighbor: DropletGeometry, previous: Connections) {
  const capsuleGap = gapAt(x, drop);
  const neighborGap = Math.abs(centerAt(x, drop) - centerAt(x, neighbor)) - 2 * RADIUS;
  const connections: Connections = {
    capsule: previous.capsule ? capsuleGap <= CAPSULE_RELEASE_GAP : capsuleGap < 0,
    neighbor: previous.neighbor ? neighborGap <= DROPLET_RELEASE_GAP : neighborGap < 0,
  };
  const wasJoined = previous.capsule || previous.neighbor;
  const isJoined = connections.capsule || connections.neighbor;
  const release = wasJoined && !isJoined ? drop.attachment : null;
  return {
    connections,
    release,
    rejoined: !wasJoined && isJoined,
    // A fast pointer sample may cross both seams at once. Let the outer bead
    // register first; normal, continuous drags follow the actual seam crossings.
    delayMs: release === 'capsule' && previous.neighbor ? 60 : 0,
  };
}
