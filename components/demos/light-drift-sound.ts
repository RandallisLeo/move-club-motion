export type LightSoundMode = 'input' | 'output' | null;

// One accent per click: a quick swell followed by a long, monotonic release.
// The independent clock never resets or speeds up the underlying waves.
export function createLightSoundFeedback() {
  let mode: LightSoundMode = null;
  let age = 0, strength = 0, start = 0;
  return {
    get mode() { return mode; },
    select(next: LightSoundMode) {
      mode = next;
      age = 0;
      start = strength;
    },
    step(delta: number, reduced = false) {
      if (reduced) {
        strength = 0; start = 0;
        return { scale: 1, x: 0, y: 0 };
      }
      const dt = Math.max(0, Math.min(.05, delta));
      if (dt > 0) {
        if (!mode) strength *= Math.exp(-dt / .25);
        else {
          age += dt;
          const peak = mode === 'input' ? .45 : .60;
          const attack = .16;
          const hold = .22;
          const release = mode === 'input' ? 1.60 : 1.85;
          if (age < attack) {
            const t = age / attack;
            const ease = t * t * (3 - 2 * t);
            strength = start + (peak - start) * ease;
          } else if (age < attack + hold) {
            strength = peak;
          } else {
            const t = Math.min(1, (age - attack - hold) / release);
            strength = peak * (1 + Math.cos(Math.PI * t)) * .5;
            if (t === 1) mode = null;
          }
        }
      }
      return { scale: 1 + strength, x: 0, y: 0 };
    },
  };
}
