export const LIGHT_STRAND_COUNT = 3;
// Mean carrier cadence; the phase offsets breathe over several cycles.
export const LIGHT_CYCLE_SECONDS = 1.0;
export const LIGHT_WAVE_NUMBER = 3.0;
// A near half-turn makes two sine paths meet around y=0. A smaller,
// changing lead makes their crossings alternate near the upper/lower lobes.
// The quiet contour occupies the remaining phase so all three stay distinct.
export const LIGHT_STRAND_OFFSETS = [0, .30, .66] as const;

const tau = Math.PI * 2;
function smootherstep(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** The paths stay repeatable but their timing relationships gradually change.
 * Bounded drift cannot reverse a wave or bunch all three into a resting pose. */
export function lightStrandPhase(time: number, strand: number) {
  const carrier = tau * time / LIGHT_CYCLE_SECONDS;
  const drift = strand === 0 ? .13 * Math.sin(time * .47)
    : strand === 1 ? .42 * Math.sin(time * .63 + .8) + .12 * Math.sin(time * 1.17)
      : .19 * Math.sin(time * .51 + 2.1);
  const phase = carrier + tau * LIGHT_STRAND_OFFSETS[strand] + drift;
  // Each band eases through its own turn. Analytic velocity never stops and
  // has no lap seam or shared scheduled kick. The leading crest rolls onward.
  return phase - .24 * Math.sin(phase - .8) - .10 * Math.sin(2 * phase - .4);
}

/** Waves travel along x; the whole band does not orbit its endpoints. */
export function lightStrandPoint(u: number, phase: number, fold: number) {
  const envelope = Math.max(0, 1 - u * u) ** 1.3;
  const wave = LIGHT_WAVE_NUMBER * u - phase;
  // Keep the established default pose; the upper slider range opens farther.
  // This changes path excursion only, never the bright ridge's thickness.
  const amplitude = .105 + .095 * fold + .10 * smootherstep((fold - .65) / .35);
  const y = envelope * (amplitude * Math.sin(wave)
    + .012 * Math.sin(wave * 2 - .65));
  // Shallow depth describes the rolling light; the visible choreography
  // remains a traveling wave rather than an orbit around its endpoints.
  const z = envelope * ((.045 + .035 * fold) * Math.sin(wave + .8)
    + .025 * Math.cos(phase));
  return [u, y, z] as const;
}

export function createLightMembraneFrame(time: number, fold: number) {
  const phases = LIGHT_STRAND_OFFSETS.map((_, strand) => lightStrandPhase(time, strand));
  // Two leading bands trade strength; the third is always a quieter contour.
  const energy = phases.map((phase, index) => {
    const pulse = ((1 + Math.cos(phase - .65)) * .5) ** 2;
    return index === 2 ? .14 + .10 * pulse : .35 + .65 * pulse;
  });
  return { phases, energy, fold };
}

/** A section is attached to the exact same sampled ribbon surfaces used to
 * draw the ridges. The finite optical surface keeps volume at a crossing. */
export function lightAttachedSection(x: number, a: number, b: number, bond: number, lag: number, shear: number) {
  const envelope = Math.max(0, 1 - x * x) ** 1.3;
  const surface = (.003 + .009 * envelope) * 2.1;
  const lower = Math.min(a, b) - surface;
  const upper = Math.max(a, b) + surface;
  // This changes only interior material coordinates; both boundaries are fixed.
  const warp = Math.max(-.18, Math.min(.18, lag / (upper - lower) * .25 + shear * .10));
  const contact = bond * (1 - smootherstep((Math.abs(a - b) - .055) / .135));
  return [lower, upper, warp, contact] as const;
}

/** Stateful contact along the wave. Capture and release have different gap
 * thresholds; a damped separation retains a neck after the raw paths move on.
 * RGBA stores the two deformed paths, the quiet third path, and bond strength. */
export function createLightAdhesionField(count = 193) {
  const data = new Float32Array(count * 4);
  const softened = new Float32Array(count * 4);
  const membrane = new Float32Array(count * 4);
  const spans = new Float32Array(count * 4);
  // Shape memory: lag of the shared light, transverse shear, stretch, spread.
  const shape = new Float32Array(count * 4);
  const shapeState = new Float32Array(count * 4);
  const shapeSoftened = new Float32Array(count * 4);
  const flowCenters = new Float64Array(count);
  const previousBonds = new Float64Array(count);
  const gaps = new Float64Array(count);
  const velocities = new Float64Array(count);
  const centers = new Float64Array(count);
  const bonds = new Float64Array(count);
  const held = new Uint8Array(count);
  let previousTime: number | undefined;
  let previousFold: number | undefined;
  let previousAmplitude: number | undefined;
  return {
    count, data, shape, membrane, spans,
    update(time: number, fold: number, amplitude = 1) {
      const point = (x: number, phase: number, lift: number) => {
        const [u, y, z] = lightStrandPoint(x, phase, lift);
        return [u, y * amplitude, z] as const;
      };
      const reset = previousTime === undefined || time < previousTime || previousFold !== fold
        || (time === previousTime && amplitude !== previousAmplitude);
      const dt = reset ? 0 : Math.min(.05, Math.max(0, time - previousTime!));
      const { phases } = createLightMembraneFrame(time, fold);
      const before = createLightMembraneFrame(time - .002, fold).phases;
      const after = createLightMembraneFrame(time + .002, fold).phases;
      previousBonds.set(bonds);
      for (let i = 0; i < count; i++) {
        const x = i * 2 / (count - 1) - 1;
        const a = point(x, phases[0], fold)[1];
        const b = point(x, phases[1], fold)[1];
        const rawGap = a - b;
        const va = (point(x, after[0], fold)[1] - point(x, before[0], fold)[1]) / .004;
        const vb = (point(x, after[1], fold)[1] - point(x, before[1], fold)[1]) / .004;
        const slopeA = (point(x + .003, phases[0], fold)[1] - point(x - .003, phases[0], fold)[1]) / .006;
        const slopeB = (point(x + .003, phases[1], fold)[1] - point(x - .003, phases[1], fold)[1]) / .006;
        const relativeSpeed = va - vb;
        const closing = Math.tanh(-rawGap * relativeSpeed * 16);
        const shear = Math.tanh((slopeA + slopeB) * 1.8 + (va + vb) * .38);
        const stretch = Math.tanh(Math.abs(relativeSpeed) * .7);
        const spread = .82 + .20 * closing - .13 * stretch;
        const center = (a + b) * .5;
        // Very quiet tips stay tethered and do not form persistent bright knots.
        const local = Math.max(0, 1 - x * x) ** 1.3;
        // Capture a longer run along each approaching contour. The wider
        // contact interval lengthens the join without widening isolated ridges.
        if (reset) {
          held[i] = Math.abs(rawGap) < .072 ? 1 : 0;
          bonds[i] = held[i] * local;
          gaps[i] = rawGap * (1 - .92 * bonds[i] * (1 - smootherstep((Math.abs(rawGap) - .13) / .14)));
          centers[i] = center;
          velocities[i] = 0;
          flowCenters[i] = center;
          shapeState.set([0, shear, stretch, spread], i * 4);
        } else if (dt > 0) {
          if (Math.abs(rawGap) < .072) held[i] = 1;
          else if (Math.abs(rawGap) > .215) held[i] = 0;
          // Carry contact along the moving crossing instead of latching every
          // column in place. A regularized slope avoids singular transport at
          // parallel tangents. Contact retains a short downstream wake.
          const slopeGap = slopeA - slopeB;
          const travel = Math.max(-1.8, Math.min(1.8, -relativeSpeed * slopeGap / (slopeGap * slopeGap + .06)));
          const source = Math.max(0, Math.min(count - 1, i - travel * dt * (count - 1) * .5));
          const left = Math.floor(source);
          const carried = previousBonds[left] * (1 - source + left)
            + previousBonds[Math.min(count - 1, left + 1)] * (source - left);
          bonds[i] = bonds[i] * .25 + carried * .75;
          const targetBond = held[i] * local;
          bonds[i] += (targetBond - bonds[i]) * (1 - Math.exp(-dt / (held[i] ? .035 : .17)));
          // Release the pull progressively before the latch releases; a hard
          // on/off force makes a wave catch and snap instead of flowing onward.
          const pull = bonds[i] * (1 - smootherstep((Math.abs(rawGap) - .13) / .14));
          const targetGap = rawGap * (1 - .92 * pull);
          const error = gaps[i] - targetGap;
          const step = (velocities[i] + 38 * error) * dt;
          const decay = Math.exp(-38 * dt);
          gaps[i] = targetGap + (error + step) * decay;
          velocities[i] = (velocities[i] - 38 * step) * decay;
          // Unequal velocities move the shared waist toward the leading wave.
          const targetCenter = center + rawGap * shear * bonds[i] * .16;
          centers[i] += (targetCenter - centers[i]) * (1 - Math.exp(-dt / .025));
          flowCenters[i] += (center - flowCenters[i]) * (1 - Math.exp(-dt / .075));
          const targets = [Math.max(-.022, Math.min(.022, flowCenters[i] - center)), shear, stretch, spread];
          for (let channel = 0; channel < 4; channel++) {
            shapeState[i * 4 + channel] += (targets[channel] - shapeState[i * 4 + channel]) * (1 - Math.exp(-dt / .055));
          }
        }
        data[i * 4] = centers[i] + gaps[i] * .5;
        data[i * 4 + 1] = centers[i] - gaps[i] * .5;
        data[i * 4 + 2] = point(x, phases[2], fold)[1];
        data[i * 4 + 3] = bonds[i];
      }
      shape.set(shapeState);
      previousTime = time;
      previousFold = fold;
      previousAmplitude = amplitude;
      // Spread tension between nearby columns. Independently latched columns
      // otherwise make a hard shoulder where a bond begins or ends along x.
      const radius = Math.max(1, Math.round(count * .025));
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 1; i < count - 1; i++) {
          for (let channel = 0; channel < 4; channel++) {
            let sum = 0, shapeSum = 0, weight = 0;
            for (let offset = -radius; offset <= radius; offset++) {
              const strength = radius + 1 - Math.abs(offset);
              const neighbor = Math.max(0, Math.min(count - 1, i + offset));
              sum += data[neighbor * 4 + channel] * strength;
              shapeSum += shape[neighbor * 4 + channel] * strength;
              weight += strength;
            }
            softened[i * 4 + channel] = sum / weight;
            shapeSoftened[i * 4 + channel] = shapeSum / weight;
          }
        }
        data.set(softened);
        shape.set(shapeSoftened);
      }
      // Bind after spatial smoothing, so the film and visible ridges consume
      // exactly the same boundary samples. No separate drifting center exists.
      const reach = Math.max(1, Math.round(count * .05));
      for (let i = 0; i < count; i++) {
        const slot = i * 4;
        // Extend only the attached material along the ribbons. The rendered
        // path samples and their motion remain untouched.
        let extendedBond = data[slot + 3];
        for (let offset = -reach; offset <= reach; offset++) {
          const neighbor = Math.max(0, Math.min(count - 1, i + offset));
          const falloff = Math.exp(-2.5 * (offset / reach) ** 2);
          extendedBond = Math.max(extendedBond, data[neighbor * 4 + 3] * falloff);
        }
        membrane.set(lightAttachedSection(i * 2 / (count - 1) - 1,
          data[slot], data[slot + 1], extendedBond, shape[slot], shape[slot + 1]), slot);
      }
      // Explicit longitudinal boundaries of each connected film region. These
      // drive actual side silhouettes, rather than a brightness-threshold hint.
      spans.fill(0);
      const threshold = .14;
      let start = -1;
      for (let i = 0; i <= count; i++) {
        const active = i < count && membrane[i * 4 + 3] > threshold;
        if (active && start < 0) start = i;
        if (!active && start >= 0) {
          const end = i - 1;
          const before = start > 0 ? membrane[(start - 1) * 4 + 3] : 0;
          const first = membrane[start * 4 + 3];
          const last = membrane[end * 4 + 3];
          const after = i < count ? membrane[i * 4 + 3] : 0;
          const left = Math.max(-1, -1 + (start - (first - threshold) / Math.max(first - before, .0001)) * 2 / (count - 1));
          const right = Math.min(1, -1 + (end + (last - threshold) / Math.max(last - after, .0001)) * 2 / (count - 1));
          for (let column = start; column <= end; column++) {
            const skew = shape[column * 4 + 1] * .08;
            spans.set([left, right, .27 + skew, .27 - skew], column * 4);
          }
          start = -1;
        }
      }
      return data;
    },
  };
}
