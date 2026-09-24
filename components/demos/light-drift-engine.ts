import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { createLightMembraneFrame, createLightAdhesionField } from './light-drift-surface';

export const lightPalettes = [
  { name: 'Iris', colors: ['#6155da', '#c286ea', '#65bde5'] },
  { name: 'Lagoon', colors: ['#128f9f', '#73cebb', '#5d83de'] },
  { name: 'Ember', colors: ['#dd796a', '#edb479', '#b574be'] },
] as const;

export type LightSettings = { speed: number; lift: number; width: number; palette: number };
export const lightDefaults: LightSettings = { speed: 1, lift: .65, width: .72, palette: 0 };

const vertexShader = `
varying vec2 vUv;
void main() { vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }
`;

// Ridges and the connecting material share sampled surface boundaries. Only
// interior material coordinates deform; the attachments cannot drift away.
const fragmentShader = `
precision highp float;
varying vec2 vUv;
uniform float uWidth;
uniform float uVerticalScale;
uniform float uSoundScale;
uniform vec2 uSoundOffset;
uniform vec3 uEnergy;
uniform vec3 uRolls;
uniform sampler2D uPaths;
uniform sampler2D uMembrane;
uniform sampler2D uContactSpans;
uniform float uPathCount;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;

void main() {
  // Expand the whole light field about its center, including its shoulders:
  // a tiny central lens was barely visible while the underlying waves moved.
  vec2 fieldPosition=(vUv*2.0-1.0-uSoundOffset)/uSoundScale;
  float x=fieldPosition.x/uWidth;
  float y=fieldPosition.y/uVerticalScale;
  float envelope=pow(max(0.0,1.0-x*x),1.3);
  float slot=clamp(x*.5+.5,0.0,1.0)*(uPathCount-1.0);
  float left=floor(slot);
  vec4 contact=mix(texture2D(uPaths,vec2((left+.5)/uPathCount,.5)),
    texture2D(uPaths,vec2((min(left+1.0,uPathCount-1.0)+.5)/uPathCount,.5)),fract(slot));
  vec4 membrane=mix(texture2D(uMembrane,vec2((left+.5)/uPathCount,.5)),
    texture2D(uMembrane,vec2((min(left+1.0,uPathCount-1.0)+.5)/uPathCount,.5)),fract(slot));
  vec4 spanLeft=texture2D(uContactSpans,vec2((left+.5)/uPathCount,.5));
  vec4 spanRight=texture2D(uContactSpans,vec2((min(left+1.0,uPathCount-1.0)+.5)/uPathCount,.5));
  // Never interpolate a real contact boundary toward an empty (0,0) interval:
  // that creates a stray cut or spur at the end of an otherwise clean meniscus.
  vec4 spanBounds=spanLeft.y>spanLeft.x
    ? (spanRight.y>spanRight.x ? mix(spanLeft,spanRight,fract(slot)) : spanLeft)
    : spanRight;
  vec3 paths=contact.xyz;
  float gap=abs(paths.x-paths.y);
  float middle=(paths.x+paths.y)*.5;
  vec3 distanceToWave=abs(vec3(y)-paths);
  // Fixed thickness at every phase. Only the spatial taper changes the width.
  float radius=.003+.009*envelope;
  float shoulder=exp(-pow(x/.60,2.0));
  float tips=pow(max(0.0,1.0-x*x),1.8);
  float centerLock=exp(-pow(x/.48,4.0));
  vec3 energy=mix(uEnergy,vec3(1.0,1.0,.22),centerLock);
  vec3 cores=exp(-pow(distanceToWave/radius,vec3(2.0)))*energy;
  // Fixed ridge profiles. Contact adds a bound surface, not a larger ridge.
  float core=max(max(cores.x,cores.y),cores.z);
  vec3 veils=exp(-pow(distanceToWave/(radius*3.8),vec3(2.0)))*energy;
  float veil=max(max(veils.x,veils.y),veils.z);

  // Both section boundaries come from the exact visible ribbon samples.
  // Interior warp vanishes at v=0 and v=1; it cannot detach the film edge.
  float v=(y-membrane.x)/max(membrane.y-membrane.x,.001);
  float materialV=v+membrane.z*4.0*v*(1.0-v);
  float inside=smoothstep(0.0,.04,v)*(1.0-smoothstep(.96,1.0,v));
  float volume=exp(-pow((materialV-.5)/.58,4.0));
  // A real concave side silhouette: anchored at v=0/1 and pulled inward by
  // roughly a quarter of this contact's length at its waist. The body stays full.
  float arc=sqrt(max(0.0,1.0-pow(2.0*clamp(v,0.0,1.0)-1.0,2.0)));
  float span=max(0.0,spanBounds.y-spanBounds.x);
  float leftEdge=spanBounds.x+span*spanBounds.z*arc;
  float rightEdge=spanBounds.y-span*spanBounds.w*arc;
  float edgeSoftness=max(.003,span*.015);
  float tension=smoothstep(leftEdge-edgeSoftness,leftEdge+edgeSoftness,x)
    *(1.0-smoothstep(rightEdge-edgeSoftness,rightEdge+edgeSoftness,x));
  tension*=smoothstep(0.0,.015,span);
  float joinedBand=inside*volume*tension*membrane.w;
  float across=(y-middle)/(.035+gap*.5);
  vec3 pigment=mix(uColorA,uColorB,.5+.5*sin(x*2.6+across*.20));
  pigment=mix(pigment,uColorC,.35);
  vec3 fringe=mix(pigment,.5+.5*cos(vec3(0.0,2.1,4.2)+across*.7+x*2.0),.35);
  // Cores, merged band and diffusion share exposure; no additive white flash.
  float luminousBand=max(core*.90,joinedBand*1.04);
  float diffusion=max(veil,joinedBand*1.02);
  vec3 radiance=mix(fringe,vec3(1.0),.78)*luminousBand;
  radiance+=mix(pigment,vec3(1.0),.38)*diffusion*.16;
  // Every film starts on its own ridge and spreads only toward y=0. Its
  // brightest point stays on the ridge: no displaced face or traveling hotspot.
  vec3 inward=mix(vec3(-1.0),vec3(1.0),step(paths,vec3(0.0)));
  vec3 faceDistance=(vec3(y)-paths)*inward;
  vec3 faceWidth=(.018+.125*envelope)*(vec3(.85)+.15*cos(uRolls));
  faceWidth=min(faceWidth,max(abs(paths)*.85,vec3(.003)));
  vec3 faces=exp(-1.05*pow(max(faceDistance,vec3(0.0))/faceWidth,vec3(1.2)));
  // Tiny edge softness is hidden under the fine ridge; the film has no outer
  // lobe and tapers away at the horizontal axis as a ridge crosses through it.
  faces*=vec3(1.0)-smoothstep(vec3(0.0),vec3(.004),-faceDistance);
  faces*=vec3(1.0)-smoothstep(max(abs(paths)-.003,vec3(0.0)),abs(paths)+.003,faceDistance);
  vec3 faceTintA=mix(uColorA,vec3(1.0),.60);
  vec3 faceTintB=mix(uColorB,vec3(1.0),.60);
  vec3 faceTintC=mix(uColorC,vec3(1.0),.58);
  vec3 faceLight=max(faceTintA*faces.x*.20,faceTintB*faces.y*.20);
  faceLight=max(faceLight,faceTintC*faces.z*.135);
  // A continuous, dimmer face between the two main ridges. Axis-facing veils
  // alone leave a dark gap when both ridges move to the same side of y=0.
  // Use their exact boundaries; fade inward from each ridge without thickening
  // either bright core or changing the high-radiance contact's concave sides.
  float pairLower=min(paths.x,paths.y);
  float pairUpper=max(paths.x,paths.y);
  float pairInside=smoothstep(pairLower-.002,pairLower+.002,y)
    *(1.0-smoothstep(pairUpper-.002,pairUpper+.002,y));
  float pairDistance=max(0.0,min(y-pairLower,pairUpper-y));
  float pairFace=exp(-1.1*pow(pairDistance/(.025+gap*.65),1.2));
  pairFace*=pairInside*smoothstep(.006,.035,gap);
  vec3 pairTint=mix(mix(uColorA,uColorB,.5),vec3(1.0),.76);
  faceLight=max(faceLight,pairTint*pairFace*.24);
  // Shared radiance keeps the overlap stable and the third face subordinate.
  radiance=max(radiance,faceLight);
  // Color-only optical fringe. Follow the existing ridges and their roll;
  // never change the distance fields, light support, or adhesion geometry.
  vec3 colorWeights=veils*veils;
  colorWeights/=max(dot(colorWeights,vec3(1.0)),.000001);
  vec3 signedEdge=(vec3(y)-paths)/radius;
  vec3 orientation=cos(uRolls+vec3(.35,1.05,.7)+x*.75);
  float edgeSide=dot(colorWeights,signedEdge*orientation);
  float edgeDistance=dot(colorWeights,abs(signedEdge));
  float coldToWarm=smoothstep(-1.1,1.1,edgeSide);
  vec3 ice=vec3(.025,.62,1.0);
  vec3 champagne=vec3(1.0,.56,.16);
  vec3 spectrum=mix(ice,champagne,coldToWarm);
  // The selected palette remains a quiet undertone, below the local cool/warm split.
  spectrum=mix(spectrum,mix(pigment,vec3(1.0),.30),.08);
  float coloredEdge=exp(-pow((edgeDistance-1.35)/1.15,2.0));
  float whiteCore=1.0-smoothstep(.68,.94,core);
  float colorAmount=(.95*coloredEdge+.19*exp(-edgeDistance/7.0))*whiteCore;
  // Carry just a hint into the existing face and diffusion. Preserve the exact
  // incoming luminance so tinting cannot add glow, widen a band, or pulse exposure.
  vec3 lumaWeights=vec3(.2126,.7152,.0722);
  float luminance=dot(radiance,lumaWeights);
  vec3 spectralLight=spectrum*(luminance/max(dot(spectrum,lumaWeights),.0001));
  radiance=mix(radiance,spectralLight,clamp(colorAmount,0.0,.97));
  radiance*=tips*(.08+.92*shoulder);
  // Add this single bounded field over the scene background.
  gl_FragColor=vec4(radiance,1.0);
}`;

export function createLightDrift(canvas: HTMLCanvasElement, background: string) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const geometry = new THREE.PlaneGeometry(2, 2);
  const adhesion = createLightAdhesionField();
  const pathTexture = new THREE.DataTexture(adhesion.data, adhesion.count, 1, THREE.RGBAFormat, THREE.FloatType);
  const membraneTexture = new THREE.DataTexture(adhesion.membrane, adhesion.count, 1, THREE.RGBAFormat, THREE.FloatType);
  const spansTexture = new THREE.DataTexture(adhesion.spans, adhesion.count, 1, THREE.RGBAFormat, THREE.FloatType);
  for (const texture of [pathTexture, membraneTexture, spansTexture]) {
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
  }
  const uniforms = {
    uVerticalScale: { value: 1 },
    uSoundScale: { value: 1 },
    uSoundOffset: { value: new THREE.Vector2() },
    uPaths: { value: pathTexture }, uMembrane: { value: membraneTexture }, uContactSpans: { value: spansTexture },
    uPathCount: { value: adhesion.count },
    uEnergy: { value: new THREE.Vector3() },
    uRolls: { value: new THREE.Vector3() },
    uWidth: { value: lightDefaults.width },
    uColorA: { value: new THREE.Color(lightPalettes[0].colors[0]) },
    uColorB: { value: new THREE.Color(lightPalettes[0].colors[1]) },
    uColorC: { value: new THREE.Color(lightPalettes[0].colors[2]) },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader, fragmentShader, uniforms,
    side: THREE.DoubleSide, forceSinglePass: true,
    transparent: true, blending: THREE.AdditiveBlending,
    depthTest: false, depthWrite: false,
  });
  scene.background = new THREE.Color(background);
  scene.add(new THREE.Mesh(geometry, material));
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType, samples: 4, depthBuffer: false,
  });
  const composer = new EffectComposer(renderer, target);
  const renderPass = new RenderPass(scene, camera);
  // A subpixel optical softness keeps grazing silhouettes from sparkling as
  // the projected fold crosses pixel boundaries. Bloom stays a separate effect.
  const soften = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, texel: { value: new THREE.Vector2() } },
    vertexShader: `varying vec2 vUv;
      void main() { vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 texel; varying vec2 vUv;
      void main() {
        vec4 color=texture2D(tDiffuse,vUv)*.25;
        color+=(texture2D(tDiffuse,vUv+vec2(texel.x,0.0))+texture2D(tDiffuse,vUv-vec2(texel.x,0.0))
          +texture2D(tDiffuse,vUv+vec2(0.0,texel.y))+texture2D(tDiffuse,vUv-vec2(0.0,texel.y)))*.125;
        color+=(texture2D(tDiffuse,vUv+texel)+texture2D(tDiffuse,vUv-texel)
          +texture2D(tDiffuse,vUv+vec2(texel.x,-texel.y))+texture2D(tDiffuse,vUv+vec2(-texel.x,texel.y)))*.0625;
        gl_FragColor=color;
      }`,
  });
  // Spread more of the existing light into a wider halo without raising the
  // membrane's peak radiance or the exposure of the whole scene.
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .62, .88, .22);
  const output = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(soften);
  composer.addPass(bloom);
  composer.addPass(output);
  return {
    resize() {
      const width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight);
      renderer.setSize(width, height, false);
      composer.setSize(width, height);
      soften.uniforms.texel.value.set(.75 / width, .75 / height);
      const aspect = width / height;
      uniforms.uVerticalScale.value = 2 * aspect / Math.max(2.55, aspect * .92);
    },
    render(time: number, settings: LightSettings, amplitude = 1, sound = { scale: 1, x: 0, y: 0 }) {
      adhesion.update(time, settings.lift, amplitude);
      pathTexture.needsUpdate = true;
      membraneTexture.needsUpdate = true;
      spansTexture.needsUpdate = true;
      const frame = createLightMembraneFrame(time, settings.lift);
      uniforms.uEnergy.value.fromArray(frame.energy);
      uniforms.uRolls.value.fromArray(frame.phases.map(phase => phase % (Math.PI * 4)));
      uniforms.uWidth.value = settings.width;
      uniforms.uSoundScale.value = sound.scale;
      uniforms.uSoundOffset.value.set(sound.x, sound.y);
      const palette = lightPalettes[settings.palette];
      uniforms.uColorA.value.set(palette.colors[0]);
      uniforms.uColorB.value.set(palette.colors[1]);
      uniforms.uColorC.value.set(palette.colors[2]);
      composer.render();
    },
    dispose() {
      geometry.dispose(); material.dispose(); pathTexture.dispose(); membraneTexture.dispose(); spansTexture.dispose();
      bloom.dispose(); soften.dispose(); output.dispose(); renderPass.dispose(); composer.dispose();
      renderer.dispose();
    },
  };
}
