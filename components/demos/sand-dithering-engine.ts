import type { FlowPalette, FlowRenderer } from './color-flow-engine';

// Same unmodified Paper Dithering shader as the user-supplied Admit One source.
// Apache-2.0 notices are retained in public/licenses/paper-shaders/.
export async function createSandDithering(surface: HTMLElement): Promise<FlowRenderer | null> {
  const { ShaderMount, ditheringFragmentShader, DitheringShapes, DitheringTypes,
    getShaderColorFromString, ShaderFitOptions } = await import('@paper-design/shaders');
  let detail = .5;
  // The reference ticket is 741 CSS pixels wide. Preserve its horizontal
  // material framing on our smaller square without enlarging individual grains.
  const scale = () => Math.max(1, surface.clientWidth) / 741 * (.5 + detail);
  let mount: InstanceType<typeof ShaderMount>;
  try {
    mount = new ShaderMount(surface, ditheringFragmentShader, {
      u_colorBack: getShaderColorFromString('#f68b5c'),
      u_colorFront: getShaderColorFromString('#fff2af'),
      u_shape: DitheringShapes.warp,
      u_type: DitheringTypes.random,
      u_pxSize: .5,
      u_scale: scale(),
      u_rotation: 0, u_fit: ShaderFitOptions.none,
      u_offsetX: 0, u_offsetY: 0, u_originX: .5, u_originY: .5,
      u_worldWidth: 0, u_worldHeight: 0,
    }, undefined, 0, 0, 2);
  } catch (error) {
    surface.replaceChildren();
    console.error(error);
    return null;
  }
  let lastPalette: FlowPalette | null = null, lastGrain = -1, lastDetail = -1;
  return {
    canvas: surface.querySelector('canvas')!,
    resize() { mount.setUniforms({ u_scale: scale() }); },
    draw(_time, grain, nextDetail, palette) {
      if (palette === lastPalette && grain === lastGrain && nextDetail === lastDetail) return;
      lastPalette = palette; lastGrain = grain; lastDetail = nextDetail; detail = nextDetail;
      mount.setUniforms({
        u_colorBack: getShaderColorFromString(palette.ink),
        u_colorFront: getShaderColorFromString(palette.paper),
        u_pxSize: .1 + grain * .5,
        u_scale: scale(),
      });
    },
    setPlayback(speed) { mount.setSpeed(speed * .4); },
    restart() { mount.setFrame(0); },
    dispose() { mount.dispose(); },
  };
}
