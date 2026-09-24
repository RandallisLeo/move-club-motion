export type GenerateStyle = 'flow' | 'sweep' | 'glass' | 'matrix';
type Color = readonly [number, number, number];
type GenerateFieldOptions = { sweepColor?: Color };
type Pigment = {
  x: number; y: number; inverseRadius: number; color: Color;
};
const paper: Color = [252, 252, 252];
const flowPigments = [
  { color: [196, 196, 196], x: .28, y: .34, driftX: .17, driftY: .19, radius: .24, expansion: .66, rate: 1.02, phase: .4, seed: 11 },
  { color: [196, 196, 196], x: .73, y: .35, driftX: .14, driftY: .20, radius: .21, expansion: .56, rate: .86, phase: 2.7, seed: 37 },
  { color: [196, 196, 196], x: .52, y: .75, driftX: .23, driftY: .15, radius: .20, expansion: .55, rate: 1.14, phase: 4.6, seed: 73 },
] as const;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => { const n = clamp(value); return n * n * (3 - 2 * n); };

function driftNoise(time: number, seed: number) {
  const cell = Math.floor(time), t = time - cell;
  const value = (index: number) => {
    let hash = Math.imul(index, 374761393) + Math.imul(seed, 668265263);
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
    return ((hash ^ (hash >>> 16)) >>> 0) / 4294967295 * 2 - 1;
  };
  const a = value(cell - 1), b = value(cell), c = value(cell + 1), d = value(cell + 2);
  // Cubic noise keeps velocity continuous between samples, without a closed orbit or reset.
  return .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
}

function pigmentPositions(time: number, width: number, height: number): Pigment[] {
  const size = Math.min(width, height);
  return flowPigments.map((pigment) => {
    const { seed, phase } = pigment;
    const drift = time * (.21 + seed * .0003) + phase;
    const x = pigment.x + pigment.driftX * (driftNoise(drift, seed) * .8 + driftNoise(drift * 1.7, seed + 3) * .2);
    const y = pigment.y + pigment.driftY * (driftNoise(drift * .83, seed + 9) * .8 + driftNoise(drift * 1.4, seed + 15) * .2);
    // Breathing and translation are independent: every region stays present, even when contracted.
    const breath = .5 - .5 * Math.cos(time * pigment.rate + phase + driftNoise(time * .18, seed + 21) * .8);
    const radius = (pigment.radius + pigment.expansion * breath) * size;
    return {
      x: x * width, y: y * height,
      inverseRadius: 1 / radius,
      color: pigment.color,
    };
  });
}

function samplePigments(x: number, y: number, blobs: Pigment[]) {
  let red = 0, green = 0, blue = 0, weight = 0, density = 0;
  for (const blob of blobs) {
    // Both axes use CSS pixels and one radius, preserving circles at every frame size.
    const dx = (x - blob.x) * blob.inverseRadius, dy = (y - blob.y) * blob.inverseRadius;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared >= 1) continue;
    const distance = Math.sqrt(distanceSquared);
    // Compact support: beyond a dot region's radius, color, opacity and size stay exactly at rest.
    const envelope = 1 - smooth(distance);
    const influence = envelope ** 3;
    red += blob.color[0] * influence;
    green += blob.color[1] * influence;
    blue += blob.color[2] * influence;
    weight += influence;
    density = Math.max(density, envelope);
  }
  // Blend by local influence so overlapping regions remain independent of drawing order.
  const tint = density * .9;
  const r = weight ? paper[0] + (red / weight - paper[0]) * tint : paper[0];
  const g = weight ? paper[1] + (green / weight - paper[1]) * tint : paper[1];
  const b = weight ? paper[2] + (blue / weight - paper[2]) * tint : paper[2];
  return { r, g, b, density };
}

export function createGenerateField(canvas: HTMLCanvasElement, options: GenerateFieldOptions = {}) {
  const context = canvas.getContext('2d');
  if (!context) return null;
  const sweepColor = options.sweepColor ?? [131, 145, 167];
  let width = 0, height = 0, dpr = 1;
  let sweepDots: HTMLCanvasElement | null = null;
  let sweepDotsContext: CanvasRenderingContext2D | null = null;
  let sweepPattern: CanvasPattern | null = null;
  let glassDots: { x: number; y: number; distance: number; edgeFade: number }[] = [];

  function prepareSweepDots() {
    if (!sweepDots) {
      sweepDots = document.createElement('canvas');
      sweepDotsContext = sweepDots.getContext('2d');
    }
    if (!sweepDotsContext) return null;
    if (sweepDots.width !== canvas.width || sweepDots.height !== canvas.height) {
      sweepDots.width = canvas.width;
      sweepDots.height = canvas.height;
    }
    if (sweepPattern) return sweepDotsContext;
    const tile = document.createElement('canvas');
    tile.width = tile.height = 32;
    const tileContext = tile.getContext('2d');
    if (!tileContext) return null;
    let seed = 27;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    tileContext.fillStyle = '#ffffff';
    for (let row = 0; row < 8; row++) for (let column = 0; column < 8; column++) {
      const x = 2 + column * 4 + (row % 2) * .8 + (random() - .5) * .5;
      const y = 2 + row * 4 + (random() - .5) * .5;
      tileContext.beginPath();
      tileContext.arc(x, y, .72 + random() * .16, 0, Math.PI * 2);
      tileContext.fill();
    }
    sweepPattern = sweepDotsContext.createPattern(tile, 'repeat');
    return sweepPattern ? sweepDotsContext : null;
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    // Fixed positions and circular distances in CSS pixels; each wave controls its own decay.
    const pitch = 5.6;
    const columns = Math.ceil(width / pitch), rows = Math.ceil(height / pitch);
    const offsetX = (width - (columns - 1) * pitch) / 2;
    const offsetY = (height - (rows - 1) * pitch) / 2;
    glassDots = [];
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      const x = offsetX + column * pitch, y = offsetY + row * pitch;
      const distance = Math.hypot(x - width / 2, y - height / 2);
      const edgeFade = smooth(Math.min(x, width - x, y, height - y) / Math.min(28, height * .1));
      glassDots.push({ x, y, distance, edgeFade });
    }
  }

  function render(time: number, style: GenerateStyle) {
    if (!context || !width || !height) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = 'rgb(251, 252, 254)';
    context.fillRect(0, 0, width, height);

    if (style === 'matrix') {
      // Smaller fixed cells light independently, with continuous random brightness.
      const diameter = Math.min(4.5, Math.max(3.2, Math.min(width, height) * .018));
      const pitch = diameter * 1.8;
      const columns = Math.ceil(width / pitch), rows = Math.ceil(height / pitch);
      const offsetX = (width - (columns - 1) * pitch) / 2;
      const offsetY = (height - (rows - 1) * pitch) / 2;
      const fadeWidth = Math.min(width, height) * .2;
      for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
        const x = offsetX + column * pitch, y = offsetY + row * pitch;
        // Fill the entire preview, easing to paper on all four edges and corners.
        const edgeFade = smooth(Math.min(x, width - x) / fadeWidth)
          * smooth(Math.min(y, height - y) / fadeWidth);
        const seed = Math.imul(row + 1, 73856093) ^ Math.imul(column + 1, 19349663);
        const pulse = smooth(driftNoise(time * .85 + 13.7, seed) + .25) ** 1.5;
        context.fillStyle = `rgba(125,133,147,${(.09 + .62 * pulse) * edgeFade})`;
        context.beginPath();
        context.arc(x, y, diameter / 2, 0, Math.PI * 2);
        context.fill();
      }
      return;
    }

    if (style === 'glass') {
      const size = Math.min(width, height);
      const initialWidth = Math.min(100, size * .65);
      // Leave a small opening inside the thicker band so its initial silhouette still reads as a ripple.
      const startRadius = Math.max(size * .08, initialWidth * .45);
      // Cross the whole rectangle, including its farthest corners, before the wave expires.
      const endRadius = Math.hypot(width, height) * .54;
      const interval = 3.5, lifetime = 5, elapsed = time + .45;
      const waves: { radius: number; halfWidth: number; dotRadius: number; opacity: number }[] = [];
      for (let index = Math.max(0, Math.ceil((elapsed - lifetime) / interval)); index <= Math.floor(elapsed / interval); index++) {
        const age = elapsed - index * interval;
        const progress = clamp(age / lifetime);
        const decay = clamp((age - .45) / (lifetime - .45));
        const travel = 1 - (1 - progress) ** 1.5;
        // Keep a broad footprint with fine dots and a continuous, soft cross-section.
        // A quicker release settles gradually while each wave loses weight.
        waves.push({
          radius: startRadius + (endRadius - startRadius) * travel,
          halfWidth: (initialWidth * (1 - decay) ** 1.05 + size * .024 * decay) / 2,
          dotRadius: 1.65 - 1.05 * progress,
          opacity: .48 * (1 - .2 * progress) * smooth(age / .55) * (1 - smooth((progress - .2) / .7)),
        });
      }
      for (const dot of glassDots) {
        let radius = 0, opacity = 0;
        for (const wave of waves) {
          const distance = Math.abs(dot.distance - wave.radius) / wave.halfWidth;
          if (distance >= 1) continue;
          const band = (1 - distance * distance) ** 2;
          radius = Math.max(radius, (.35 + .65 * Math.sqrt(band)) * wave.dotRadius);
          opacity = Math.max(opacity, band * wave.opacity * dot.edgeFade);
        }
        if (radius < .12 || opacity < .004) continue;
        context.fillStyle = `rgba(155,159,166,${opacity})`;
        context.beginPath();
        context.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        context.fill();
      }
      return;
    }

    if (style === 'sweep') {
      const surface = context.createLinearGradient(0, 0, width * .18, height);
      surface.addColorStop(0, '#fafbfc');
      surface.addColorStop(.55, '#f8f9fb');
      surface.addColorStop(1, '#f6f7f9');
      context.fillStyle = surface;
      context.fillRect(0, 0, width, height);

      // A distant origin bends the broad sweep into a shallow, wind-like arc.
      // The full envelope leaves the frame at both ends, keeping the repeat seamless.
      const position = -.66 + (time % 3.4) / 3.4 * 2.32;
      const originX = -width * 1.6, originY = originX * .72;
      const near = Math.hypot(originX, originY);
      const far = Math.hypot(width - originX, height - originY);
      const gradient = context.createRadialGradient(originX, originY, near, originX, originY, far);
      const dotsContext = prepareSweepDots();
      dotsContext?.setTransform(dpr, 0, 0, dpr, 0, 0);
      const dotReveal = dotsContext?.createRadialGradient(originX, originY, near, originX, originY, far);
      for (let step = 0; step <= 100; step++) {
        const at = step / 100;
        const body = 1 - smooth(Math.abs(at - position) / .48);
        const trail = 1 - smooth(Math.abs(at - position + .07) / .57);
        const opacity = body * .044 + trail * .016;
        gradient.addColorStop(at, `rgba(${sweepColor[0]}, ${sweepColor[1]}, ${sweepColor[2]}, ${opacity})`);
        // A faint resting texture keeps the surface present between passes.
        // The moving dots carry the contrast, while the broad wash stays soft.
        dotReveal?.addColorStop(at, `rgba(${sweepColor[0]}, ${sweepColor[1]}, ${sweepColor[2]}, ${.04 + (body * .8 + trail * .2) * .46})`);
      }
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      // Cache the dot pattern; animate only its broad opacity mask so the dots never jitter.
      if (dotsContext && sweepDots && sweepPattern && dotReveal) {
        dotsContext.clearRect(0, 0, width, height);
        dotsContext.fillStyle = sweepPattern;
        dotsContext.fillRect(0, 0, width, height);
        dotsContext.globalCompositeOperation = 'source-in';
        dotsContext.fillStyle = dotReveal;
        dotsContext.fillRect(0, 0, width, height);
        dotsContext.globalCompositeOperation = 'source-over';
        context.drawImage(sweepDots, 0, 0, width, height);
      }
      return;
    }

    const blobs = pigmentPositions(time, width, height);
    const pitch = 5.4;
    const columns = Math.ceil(width / pitch), rows = Math.ceil(height / pitch);
    const offsetX = (width - (columns - 1) * pitch) / 2;
    const offsetY = (height - (rows - 1) * pitch) / 2;
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      const x = column * pitch + offsetX, y = row * pitch + offsetY;
      const sample = samplePigments(x, y, blobs);
      const edge = smooth(Math.min(x, width - x, y, height - y) / 18);
      const density = sample.density;
      // The center grows from a 2.04px resting diameter to 4.8px; its neighbors taper radially.
      const red = 220 + (sample.r - 220) * density;
      const green = 220 + (sample.g - 220) * density;
      const blue = 220 + (sample.b - 220) * density;
      context.fillStyle = `rgba(${Math.round(red)},${Math.round(green)},${Math.round(blue)},${edge * (.3 + .68 * density)})`;
      context.beginPath();
      context.arc(x, y, 1.02 + 1.38 * density, 0, Math.PI * 2);
      context.fill();
    }
  }
  resize();
  return { resize, render };
}
