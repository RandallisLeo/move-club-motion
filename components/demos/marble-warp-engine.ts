import type { FlowPalette, FlowRenderer } from './color-flow-engine';

// Paper Warp, Apache-2.0. Preserve the source shader, noise image, clock and sizing.
// Shape defaults follow the reference; colors use our Mint palette.
export async function createMarbleWarp(
  surface: HTMLElement,
): Promise<FlowRenderer | null> {
  const {
    ShaderMount,
    warpFragmentShader,
    getShaderColorFromString,
    getShaderNoiseTexture,
    WarpPatterns,
    ShaderFitOptions,
  } = await import('@paper-design/shaders');
  const noise = getShaderNoiseTexture();
  if (!noise) return null;
  if (!noise.complete)
    await new Promise<void>((resolve, reject) => {
      noise.addEventListener('load', () => resolve(), { once: true });
      noise.addEventListener(
        'error',
        () => reject(new Error('Warp noise texture failed to load')),
        { once: true },
      );
    });
  if (!noise.naturalWidth) return null;
  let mount: InstanceType<typeof ShaderMount>;
  try {
    mount = new ShaderMount(
      surface,
      warpFragmentShader,
      {
        u_colors: ['#29899d', '#d6f5e9', '#29899d', '#75c8c7'].map(
          getShaderColorFromString,
        ),
        u_colorsCount: 4,
        u_proportion: 0.45,
        u_softness: 1,
        u_distortion: 0.25,
        u_swirl: 0.8,
        u_swirlIterations: 10,
        u_shape: WarpPatterns.checks,
        u_shapeScale: 0.1,
        u_noiseTexture: noise,
        u_scale: 1,
        u_rotation: 0,
        u_fit: ShaderFitOptions.none,
        u_offsetX: 0,
        u_offsetY: 0,
        u_originX: 0.5,
        u_originY: 0.5,
        u_worldWidth: 0,
        u_worldHeight: 0,
      },
      undefined,
      0,
      0,
      2,
    );
  } catch (error) {
    surface.replaceChildren();
    console.error(error);
    return null;
  }
  const canvas = surface.querySelector('canvas')!;
  let lastPalette: FlowPalette | null = null,
    lastDetail = -1;
  return {
    canvas,
    // ShaderMount observes the untransformed host's layout dimensions itself.
    resize() {},
    draw(_time, _grain, detail, palette) {
      if (palette === lastPalette && detail === lastDetail) return;
      lastPalette = palette;
      lastDetail = detail;
      mount.setUniforms({
        u_colors: [palette.ink, palette.paper, palette.ink, palette.accent].map(
          getShaderColorFromString,
        ),
        u_colorsCount: 4,
        u_swirl: detail,
      });
    },
    setPlayback(speed) {
      mount.setSpeed(speed);
    },
    restart() {
      mount.setFrame(0);
    },
    dispose() {
      mount.dispose();
    },
  };
}
