export type LightAgentState = 'listening' | 'thinking' | 'answering' | 'interrupted';
export type LightAgentMode = LightAgentState | 'custom';

/** User speech takes the floor, interrupting work or an active answer first. */
export function lightAgentInputState(current: LightAgentMode): LightAgentState {
  return current === 'thinking' || current === 'answering' ? 'interrupted' : 'listening';
}

export const lightAgentPresets = {
  listening: { speed: 1.30, lift: .73, width: .70 },
  thinking: { speed: 1.50, lift: .59, width: .95 },
  answering: { speed: 1.50, lift: .90, width: .90 },
  interrupted: { speed: 1.30, lift: .73, width: .70 },
} as const;

export const lightAgentStates = [
  { id: 'listening', label: 'Listening', caption: 'Listening' },
  { id: 'thinking', label: 'Thinking', caption: 'Thinking' },
  { id: 'answering', label: 'Answering', caption: 'Answering' },
  { id: 'interrupted', label: 'Interrupt', caption: 'Interrupted' },
] as const;

// This clock belongs to the conversation, independent of the wave phase.
// Switching states never resets the paths or their adhesion history.
export function createLightAgentMotion() {
  let state: LightAgentMode = 'listening';
  let elapsed = 0, speed = .30, amplitude = .62;
  let customStyle = [speed, amplitude];
  return {
    get state() { return state; },
    select(next: LightAgentState) { state = next; elapsed = 0; },
    customize() {
      // Keep the current material pose and cadence while handing control to
      // the sliders. Stop state choreography and any pending interrupt return.
      if (state !== 'custom') customStyle = [speed, amplitude];
      state = 'custom'; elapsed = 0;
    },
    step(delta: number, immediate = false) {
      const dt = Math.max(0, Math.min(delta, .05));
      elapsed += dt;
      if (state === 'interrupted' && elapsed >= .85) {
        state = 'listening'; elapsed = 0;
      }
      const phrase = (.5 + .5 * Math.sin(elapsed * 2.5 - .8)) ** 2;
      const targets = state === 'custom' ? customStyle : state === 'listening' ? [.30, .62]
        : state === 'thinking' ? [.72 + .16 * Math.sin(elapsed * 1.8) ** 2, .84]
          : state === 'answering' ? [.48 + .50 * phrase, .87 + .22 * phrase]
            : [.055, .34];
      const blend = immediate ? 1 : 1 - Math.exp(-dt / (state === 'interrupted' ? .12 : .42));
      speed += (targets[0] - speed) * blend;
      amplitude += (targets[1] - amplitude) * blend;
      return { state, speed, amplitude };
    },
  };
}
