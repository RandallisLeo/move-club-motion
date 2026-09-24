import type { FlowPalette, FlowRenderer } from './color-flow-engine';

type RGB = [number, number, number];
type Track = {
  x: number; y: number; width: number; length: number;
  strength: number; phase: number; pace: number; color: number;
  rank: number; shadow: number; kind: 'hair' | 'thread' | 'light';
};

function randomSequence(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
const rgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const mix = (a: RGB, b: RGB, weight: number): RGB => a.map((v, i) => v + (b[i] - v) * weight) as RGB;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
function noise(x: number, y: number, z: number) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = smooth(x - ix), fy = smooth(y - iy), fz = smooth(z - iz);
  const cell = (a: number, b: number, c: number) => {
    let n = Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 1442695041);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const plane = (k: number) => lerp(
    lerp(cell(ix, iy, k), cell(ix + 1, iy, k), fx),
    lerp(cell(ix, iy + 1, k), cell(ix + 1, iy + 1, k), fx), fy);
  return lerp(plane(iz), plane(iz + 1), fz);
}

// Interfering surface slopes create many separate specular regions. Sampling
// this light field never changes the positions or directions of the tracks.
function reflectionAt(x: number, y: number, time: number) {
  const variation = noise(x * 7 + 13, y * 3 + 9, time * .19);
  const slopeX = .7 * Math.sin(x * 12 + y * 4.7 + time * .53 + variation * 2.7)
    + .3 * Math.sin(x * 25 - y * 8.1 - time * .41);
  const slopeY = .64 * Math.cos(y * 7.3 - x * 6.2 - time * .47 - variation * 2)
    + .36 * Math.sin(x * 18 + y * 12.4 + time * .37);
  return Math.exp(-(slopeX * slopeX + slopeY * slopeY) * 4.6);
}

// A soft optical streak, with a fine core and a much dimmer colored halo.
// Its longitudinal falloff is baked once, not synthesized as running particles.
function makeStreak(color: RGB, seed: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 512;
  const context = canvas.getContext('2d')!;
  const pixels = context.createImageData(canvas.width, canvas.height);
  const random = randomSequence(seed);
  const phase = random() * 20;
  for (let y = 0; y < canvas.height; y++) {
    const v = y / (canvas.height - 1);
    const end = Math.exp(-Math.pow((v - .5) / .345, 4));
    const roughness = noise(v * 22, phase, 3);
    const texture = .55 + roughness * .3 + random() * .15;
    const coreWidth = .14 + roughness * .09;
    const split = .025 * Math.sin(v * 19 + phase);
    for (let x = 0; x < canvas.width; x++) {
      const u = (x / (canvas.width - 1) - .5) * 2;
      const core = Math.exp(-Math.pow((u - split) / coreWidth, 2));
      const halo = Math.exp(-Math.pow(u / .62, 2)) * .15;
      const white = core * .1;
      const pixel = (y * canvas.width + x) * 4;
      pixels.data[pixel] = color[0] + (255 - color[0]) * white;
      pixels.data[pixel + 1] = color[1] + (255 - color[1]) * white;
      pixels.data[pixel + 2] = color[2] + (248 - color[2]) * white;
      const grain = .65 + random() * .35;
      pixels.data[pixel + 3] = Math.min(1, (core + halo) * end * texture * grain) * 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

function makeTracks(): Track[] {
  let random = randomSequence(729134);
  const tracks: Track[] = [];
  const add = (kind: Track['kind'], count: number) => {
    for (let i = 0; i < count; i++) {
      // Uneven, clustered tracks leave real black gaps between light groups.
      const x = (random() + random() + random() - 1.5) * .43;
      tracks.push({
        kind, x, y: (random() - .5) * .85,
        width: kind === 'hair' ? .0025 + random() * .008 : .008 + Math.pow(random(), 2) * .035,
        length: kind === 'hair' ? 2.8 : 1.0 + random() * 1.5,
        strength: kind === 'hair' ? .14 + random() * .28 : .4 + random() * .45,
        phase: random() * Math.PI * 2, pace: .47 + random() * .48,
        color: Math.floor(random() * 12), rank: random(), shadow: 1,
      });
    }
  };
  add('hair', 320);
  add('thread', 105);
  const positions = [-.34, -.255, -.181, -.106, -.049, .024, .091, .157, .235, .316];
  positions.forEach((x, i) => tracks.push({
    kind: 'light', x, y: (random() - .5) * .8,
    width: .045 + random() * .048, length: .72 + random() * .7,
    strength: .73 + random() * .25, phase: random() * Math.PI * 2,
    pace: .48 + random() * .31, color: [3, 0, 4, 1, 0, 3, 1, 4, 0, 3][i], rank: 0, shadow: 1,
  }));
  // Preserve the seeded fine-fiber population and the established main tracks.
  tracks.forEach((track) => { track.rank *= .34; });
  const baseCount = tracks.length;
  random = randomSequence(918273);
  add('hair', 840);
  add('thread', 260);
  for (let i = baseCount; i < tracks.length; i++) {
    tracks[i].rank = .34 + tracks[i].rank * .66;
  }
  tracks.forEach((track) => {
    const channel = noise(track.x * 35 + 17, 4.7, 8.2);
    track.shadow = .26 + .74 * smooth(Math.max(0, Math.min(1, (channel - .28) / .36)));
  });
  return tracks;
}

export function createPrismStream(surface: HTMLElement): FlowRenderer | null {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return null;
  surface.appendChild(canvas);
  const material = document.createElement('canvas');
  const materialContext = material.getContext('2d', { willReadFrequently: true })!;
  const tracks = makeTracks();
  let paletteKey = '';
  let sprites: HTMLCanvasElement[] = [];
  let width = 1, height = 1, dpr = 1;
  let bakedWidth = -1;
  let source: Uint8ClampedArray | null = null;
  let frame: ImageData | null = null;
  let grain = new Float32Array(0);
  let sampleX = new Float32Array(0), sampleY = new Float32Array(0);
  const columns = 80, rows = 112;
  const field = new Float32Array(columns * rows);
  const tone = new Uint8Array(4096);
  for (let i = 0; i < tone.length; i++) tone[i] = 255 * (1 - Math.exp(-i / 512 * 1.5));
  const cosine = Math.cos(.595), sine = Math.sin(.595);

  function bake(detail: number, palette: FlowPalette) {
    const key = `${palette.ink}${palette.paper}${palette.accent}`;
    if (key !== paletteKey) {
      paletteKey = key;
      const cool = rgb(palette.ink), warm = rgb(palette.accent), white = rgb(palette.paper);
      const colors: RGB[] = [
        mix(cool, white, .42), mix(cool, [34, 89, 192], .7),
        mix(cool, [84, 175, 142], .52), mix(warm, white, .36),
        mix(warm, [219, 126, 55], .48), mix(white, [160, 171, 211], .28),
        mix(cool, [145, 108, 177], .68), mix(warm, [192, 92, 77], .58),
        mix(cool, [39, 191, 223], .7), mix(warm, [240, 191, 91], .73),
        mix(cool, [86, 192, 141], .65), mix(warm, [219, 143, 91], .64),
      ];
      sprites = colors.map((color, i) => makeStreak(color, 711 + i));
      bakedWidth = -1;
    }
    if (bakedWidth === detail && source) return;
    bakedWidth = detail;
    const size = Math.min(width, height);
    // This control contracts the whole dense material across its direction.
    // Tracks are never randomly removed when the band is narrowed.
    const bandWidth = .23 + detail * .77;
    materialContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    materialContext.globalCompositeOperation = 'source-over';
    materialContext.globalAlpha = 1;
    materialContext.fillStyle = '#000';
    materialContext.fillRect(0, 0, width, height);
    materialContext.translate(width / 2, height / 2);
    materialContext.rotate(.595);
    materialContext.scale(bandWidth, 1);
    materialContext.globalCompositeOperation = 'screen';
    for (const track of tracks) {
      const breadth = track.width * size;
      const length = (track.kind === 'hair' ? 2.8 : track.length * 1.35) * size;
      const x = track.x * size, y = track.y * size;
      const strength = track.strength * (.5 + .5 * track.shadow);
      // Soft, colored scattering stays inside the material, beneath fine fibers.
      if (track.kind !== 'hair') {
        materialContext.globalAlpha = strength * .12;
        materialContext.drawImage(sprites[track.color], x - breadth * 1.6, y - length / 2, breadth * 3.2, length);
      }
      materialContext.globalAlpha = strength * (track.kind === 'hair' ? .19 : track.kind === 'light' ? .9 : .5);
      materialContext.drawImage(sprites[track.color], x - breadth / 2, y - length / 2, breadth, length);
    }
    source = materialContext.getImageData(0, 0, canvas.width, canvas.height).data;
    const count = canvas.width * canvas.height;
    grain = new Float32Array(count);
    sampleX = new Float32Array(count);
    sampleY = new Float32Array(count);
    const random = randomSequence(40217);
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = y * canvas.width + x;
        const px = (x / dpr - width / 2) / size;
        const py = (y / dpr - height / 2) / size;
        sampleX[i] = ((px * cosine + py * sine) / bandWidth + .9) / 1.8 * (columns - 1);
        sampleY[i] = (-px * sine + py * cosine + .9) / 1.8 * (rows - 1);
        // Fixed microscopic grain modulates the reflected material itself.
        grain[i] = .45 + random() * .92;
        const offset = i * 4;
        const mean = (source[offset] + source[offset + 1] + source[offset + 2]) / 3;
        for (let c = 0; c < 3; c++) {
          source[offset + c] = Math.max(0, Math.min(255, mean + (source[offset + c] - mean) * 1.7));
        }
      }
    }
  }

  return {
    canvas,
    resize() {
      width = Math.max(1, canvas.clientWidth);
      height = Math.max(1, canvas.clientHeight);
      dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = material.width = Math.round(width * dpr);
      canvas.height = material.height = Math.round(height * dpr);
      frame = context.createImageData(canvas.width, canvas.height);
      bakedWidth = -1;
    },
    draw(time, _grain, detail, palette) {
      bake(detail, palette);
      if (!source || !frame) return;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const x = col / (columns - 1) * 1.8 - .9;
          const y = row / (rows - 1) * 1.8 - .9;
          // Stretch illumination along the fibers; nearby fibers catch slightly
          // different facets. No thresholded regions or stamped highlight shapes.
          field[row * columns + col] = .27 + Math.pow(reflectionAt(x * 1.25, y * .58, time * .58), 1.55) * 3.8;
        }
      }
      const output = frame.data;
      for (let i = 0; i < grain.length; i++) {
        const gx = Math.max(0, Math.min(columns - 1.001, sampleX[i]));
        const gy = Math.max(0, Math.min(rows - 1.001, sampleY[i]));
        const cx = Math.floor(gx), cy = Math.floor(gy);
        const fx = gx - cx, fy = gy - cy, at = cy * columns + cx;
        const light = lerp(lerp(field[at], field[at + 1], fx),
          lerp(field[at + columns], field[at + columns + 1], fx), fy);
        const exposure = light * grain[i];
        const offset = i * 4;
        for (let c = 0; c < 3; c++) {
          const value = source[offset + c] / 255 * exposure;
          // A gradual shoulder retains colored detail in the brightest fibers.
          output[offset + c] = tone[Math.min(4095, Math.floor(value * 512))];
        }
        output[offset + 3] = 255;
      }
      context.putImageData(frame, 0, 0);
    },
    dispose() {
      canvas.remove();
      sprites = [];
      source = null;
      frame = null;
    },
  };
}
