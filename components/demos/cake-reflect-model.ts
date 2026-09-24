export const MIRROR_COUNTS = [3, 6, 8] as const;
export type MirrorCount = (typeof MIRROR_COUNTS)[number];
export const DEFAULT_CAKE_ELEVATION = 0.73;
export const MIN_CAKE_ELEVATION = 0.28;
export const MAX_CAKE_ELEVATION = 1.56;

// Every cake has a separate geometry branch, as well as its own palette.
export const CAKES = [
  { name: 'Mint & wafer', body: '#32bdb7', icing: '#503022', height: 1.2 },
  { name: 'Blackberry & macaron', body: '#b29bda', icing: '#c8b3ec', height: 1.08 },
  {
    name: 'Lemon & blueberry',
    body: '#efce8c',
    icing: '#fff2c8',
    height: 1.16,
  },
  {
    name: 'Strawberry shortcake',
    body: '#ecc996',
    icing: '#fff1e1',
    height: 1.26,
  },
  { name: 'Chocolate opera', body: '#70412e', icing: '#38221d', height: 0.96 },
  {
    name: 'Matcha mille crêpe',
    body: '#91aa63',
    icing: '#739249',
    height: 1.06,
  },
  { name: 'Raspberry ribbon', body: '#c74261', icing: '#d84964', height: 1.14 },
  {
    name: 'Birthday confetti',
    body: '#f4c6cb',
    icing: '#fff4e8',
    height: 1.22,
  },
] as const;

export type CakeSceneState = {
  angle: number;
  angularVelocity: number;
  count: MirrorCount;
  present: boolean[];
  hovered: boolean;
  focused: boolean;
  dragging: boolean;
  inspecting: boolean;
  reducedMotion: boolean;
  elevation: number;
  mirrors: boolean;
};
export function createCakeState(): CakeSceneState {
  return {
    angle: 0.32,
    angularVelocity: 0,
    count: 3,
    present: Array(8).fill(true),
    hovered: false,
    focused: false,
    dragging: false,
    inspecting: false,
    reducedMotion: false,
    elevation: DEFAULT_CAKE_ELEVATION,
    mirrors: true,
  };
}
export function turnIsHeld(state: CakeSceneState) {
  return (
    state.hovered || state.focused || state.dragging || state.inspecting || state.reducedMotion
  );
}
export function wrapAngle(value: number) {
  return ((value % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}
export function advanceCakeTurn(state: CakeSceneState, dt: number) {
  if (turnIsHeld(state)) {
    state.angularVelocity = 0;
    return;
  }
  const step = Math.min(Math.max(dt, 0), 0.05);
  state.angularVelocity +=
    (0.18 - state.angularVelocity) * (1 - Math.exp(-4 * step));
  // Positive world rotation is clockwise when the platter is viewed from above.
  state.angle = wrapAngle(state.angle + state.angularVelocity * step);
}
export function dragCakeTurn(start: number, deltaX: number) {
  // The near edge follows the hand instead of moving against the pointer.
  return wrapAngle(start - deltaX * 0.009);
}
export function dragCakeView(start: number, deltaY: number) {
  return Math.min(
    MAX_CAKE_ELEVATION,
    Math.max(MIN_CAKE_ELEVATION, start + deltaY * 0.0055),
  );
}
export function populateCakes(state: CakeSceneState, count: MirrorCount) {
  state.count = count;
  state.present = Array(8).fill(true);
}
