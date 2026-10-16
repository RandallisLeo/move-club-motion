import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { emojiSilhouetteShapes } from './emoji-suspend-contours';
import { SUSPEND_FILLINGS, SUSPEND_CHARM_COUNT } from './emoji-suspend-fillings';
import { createIceDetails } from './emoji-suspend-ice';
import type { SuspendMaterial, SuspendState } from './emoji-suspend';

const PRESETS: Record<SuspendMaterial, { color: string; roughness: number; ior: number; thickness: number; transmission: number; amplitude: number; decay: number }> = {
  jelly: { color: '#f5dbe5', roughness: .14, ior: 1.36, thickness: .7, transmission: .97, amplitude: .19, decay: 1.6 },
  resin: { color: '#c5b9fa', roughness: .055, ior: 1.44, thickness: .85, transmission: 1, amplitude: .032, decay: 2.4 },
  glass: { color: '#f5f8ff', roughness: .015, ior: 1.51, thickness: .9, transmission: 1, amplitude: 0, decay: 7 },
  ice: { color: '#e2edf0', roughness: .17, ior: 1.31, thickness: 1.15, transmission: 1, amplitude: 0, decay: 7 },
};

// Trace a continuous silhouette rather than extruding the stair steps of pixels.
function emojiCharm(emoji: string) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.font = '380px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 256, 278);
  const sample = document.createElement('canvas'); sample.width = sample.height = 192;
  const sc = sample.getContext('2d', { willReadFrequently: true })!; sc.drawImage(canvas, 0, 0, 192, 192);
  const pixels = sc.getImageData(0, 0, 192, 192).data;
  const shapes = emojiSilhouetteShapes(pixels, 192);
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] > 128) { r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2]; n++; }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const raw = new THREE.ExtrudeGeometry(shapes, { depth: .13, bevelEnabled: true, bevelThickness: .016, bevelSize: .007, bevelSegments: 5, steps: 1, curveSegments: 3 });
  raw.translate(0, 0, -.065);
  const pos = raw.attributes.position, uv = raw.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) + .5, pos.getY(i) + .5);
  // Weld shared bevel vertices before computing normals, so light does not
  // reveal a separate flat face for every short piece of the silhouette.
  raw.deleteAttribute('normal'); const geometry = mergeVertices(raw, .00001); raw.dispose(); geometry.computeVertexNormals();
  const front = new THREE.MeshPhysicalMaterial({ map: texture, alphaTest: .025, alphaToCoverage: true, roughness: .3, clearcoat: .8, clearcoatRoughness: .18 });
  const side = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(r / Math.max(n, 1) / 255, g / Math.max(n, 1) / 255, b / Math.max(n, 1) / 255).convertSRGBToLinear(), roughness: .28, clearcoat: .8 });
  return new THREE.Mesh(geometry, [front, side]);
}

function blockGeometry(material: SuspendMaterial) {
  const profile = {
    jelly: { x: 1.3, y: 1.28, z: .69, ring: .34, ey: .68, ex: .65, ez: .74 },
    resin: { x: 1.3, y: 1.3, z: .61, ring: .22, ey: .44, ex: .42, ez: .46 },
    glass: { x: 1.29, y: 1.29, z: .6, ring: .11, ey: .22, ex: .22, ez: .24 },
    ice: { x: 1.29, y: 1.31, z: .64, ring: .125, ey: .25, ex: .26, ez: .27 },
  }[material];
  const geometry = new THREE.SphereGeometry(1, 112, 80), p = geometry.attributes.position;
  const power = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e);
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), theta = Math.atan2(p.getZ(i), p.getX(i));
    const ring = Math.pow(Math.max(0, 1 - y * y), profile.ring);
    const x = profile.x * ring * power(Math.cos(theta), profile.ex), z = profile.z * ring * power(Math.sin(theta), profile.ez), py = profile.y * power(y, profile.ey);
    const uneven = material === 'ice' ? 1 + .009 * Math.sin(py * 4 + z * 3) * Math.cos(x * 5) + .003 * Math.sin(py * 19 + x * 13) * Math.cos(z * 17 + x * 8) : 1;
    p.setXYZ(i, x * uneven, py, z * uneven);
  }
  geometry.computeVertexNormals(); return geometry;
}

export function createSuspendScene(host: HTMLElement, read: () => SuspendState, onFailure: () => void) {
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' }); } catch { onFailure(); return () => {}; }
  renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2)); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  renderer.domElement.setAttribute('aria-hidden', 'true'); host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#0b0b12');
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 50); camera.position.set(0, 0, 9); camera.lookAt(0, 0, 0);
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04); scene.environment = environment.texture; room.dispose(); pmrem.dispose();
  scene.add(new THREE.AmbientLight('#b7b7fa', .8));
  const key = new THREE.DirectionalLight('#fff1f2', 2.7); key.position.set(-3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight('#a299ff', 5); rim.position.set(4, 2, -3); scene.add(rim);
  const pink = new THREE.PointLight('#ff71c6', 6, 8); pink.position.set(-2, -.5, 2); scene.add(pink);
  const object = new THREE.Group(); scene.add(object);
  const ice = createIceDetails(); object.add(ice.group);
  const softUniforms = { uSoftTime: { value: 0 }, uSoftWave: { value: 0 } };
  // This is a closed volume. DoubleSide makes Three render its back wall into
  // the transmission source, then refract that wall again as a grey panel.
  const bodyMaterial = new THREE.MeshPhysicalMaterial({ color: PRESETS.resin.color, roughness: .055, transmission: 1, thickness: .85, ior: 1.44, clearcoat: 1, clearcoatRoughness: .035, envMapIntensity: 1.3, attenuationColor: '#bda4fa', attenuationDistance: 4, side: THREE.FrontSide, roughnessMap: ice.neutralMap, bumpMap: ice.frostMap, bumpScale: 0 });
  bodyMaterial.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, softUniforms);
    shader.vertexShader = 'uniform float uSoftTime, uSoftWave;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <morphtarget_vertex>', `#include <morphtarget_vertex>
      float wavePhase = transformed.y * 5.5 - uSoftTime * 27.0;
      transformed.x += uSoftWave * sin(wavePhase) * cos(transformed.x * 1.2);
      transformed.z += uSoftWave * .45 * sin(wavePhase + transformed.x * 2.0);
      #ifndef FLAT_SHADED
        vec3 waveNormal = objectNormal;
        waveNormal.y -= uSoftWave * 5.5 * cos(wavePhase) * cos(transformed.x * 1.2) * waveNormal.x;
        vNormal = normalize(normalMatrix * waveNormal);
      #endif
    `);
  };
  const bodyGeometry = blockGeometry('resin');
  const morphMaterials: SuspendMaterial[] = ['jelly', 'glass', 'ice'];
  bodyGeometry.morphAttributes.position = []; bodyGeometry.morphAttributes.normal = [];
  for (const material of morphMaterials) { const target = blockGeometry(material); bodyGeometry.morphAttributes.position.push(target.attributes.position.clone()); bodyGeometry.morphAttributes.normal.push(target.attributes.normal.clone()); target.dispose(); }
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial); object.add(body);
  const charms = new THREE.Group(); object.add(charms);
  const cache = new Map<string, THREE.Mesh>();
  const locations = Array.from({ length: SUSPEND_CHARM_COUNT }, (_, i) => {
    const row = Math.floor(i / 5), col = i % 5, columns = row === 4 ? 4 : 5;
    return [(col - (columns - 1) / 2) * (row === 4 ? .45 : .405) + Math.sin(i * 2.1) * .028, (2 - row) * .425 + Math.cos(i * 3.2) * .03, Math.sin(i * 1.73) * .25];
  });
  let currentFilling = -1;
  const fill = (index: number) => {
    charms.clear();
    SUSPEND_FILLINGS[index].emoji.slice(0, SUSPEND_CHARM_COUNT).forEach((emoji, i) => {
      if (!cache.has(emoji)) cache.set(emoji, emojiCharm(emoji));
      const charm = cache.get(emoji)!.clone(); const size = .43 + (i % 4) * .015;
      charm.scale.setScalar(size); charm.position.set(locations[i][0], locations[i][1], locations[i][2]); charm.rotation.set((i % 3 - 1) * .17, (i % 5 - 2) * .13, Math.sin(i * 2.7) * .25); charm.userData.home = charm.position.clone(); charms.add(charm);
    }); currentFilling = index;
  };
  fill(0);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true, disposed = false, frame = 0, last = performance.now(), time = 0, impulseTime = -20, lastImpulse = read().impulse, yaw = 0, pitch = 0;
  let presetId = read().material; let wobble = PRESETS[presetId].amplitude;
  const resize = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.position.z = Math.max(7.2, 5.6 / camera.aspect); camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(host); resize();
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }); io.observe(host);
  const contextLost = (event: Event) => { event.preventDefault(); onFailure(); }; renderer.domElement.addEventListener('webglcontextlost', contextLost);
  const animate = (now: number) => {
    if (disposed) return;
    frame = requestAnimationFrame(animate); const dt = Math.min((now - last) / 1000, .05); last = now;
    if (!visible || document.hidden) return;
    const state = read(), preset = PRESETS[state.material]; const active = !state.paused && !reduced.matches, motion = !reduced.matches;
    if (active) time += dt;
    if (currentFilling !== state.filling) fill(state.filling);
    if (lastImpulse !== state.impulse) { impulseTime = time; lastImpulse = state.impulse; }
    if (presetId !== state.material) { presetId = state.material; wobble = preset.amplitude; }
    const blend = 1 - Math.exp(-dt * 5);
    bodyMaterial.color.lerp(new THREE.Color(preset.color), blend); bodyMaterial.roughness += (preset.roughness - bodyMaterial.roughness) * blend; bodyMaterial.ior += (preset.ior - bodyMaterial.ior) * blend; bodyMaterial.thickness += (preset.thickness - bodyMaterial.thickness) * blend;
    bodyMaterial.attenuationColor.copy(bodyMaterial.color);
    bodyMaterial.transmission += (preset.transmission - bodyMaterial.transmission) * blend;
    bodyMaterial.envMapIntensity += ((state.material === 'glass' ? 1.05 : 1.3) - bodyMaterial.envMapIntensity) * blend;
    body.morphTargetInfluences!.forEach((influence, i) => { body.morphTargetInfluences![i] += ((state.material === morphMaterials[i] ? 1 : 0) - influence) * blend; });
    ice.group.visible = state.material === 'ice';
    bodyMaterial.roughnessMap = state.material === 'ice' ? ice.frostMap : ice.neutralMap;
    bodyMaterial.bumpScale += ((state.material === 'ice' ? .022 : 0) - bodyMaterial.bumpScale) * blend;
    bodyMaterial.clearcoat += ((state.material === 'ice' ? .18 : state.material === 'jelly' ? .65 : 1) - bodyMaterial.clearcoat) * blend;
    key.color.lerp(new THREE.Color(state.material === 'ice' ? '#e4f8ff' : '#fff1f2'), blend);
    pink.color.lerp(new THREE.Color(state.material === 'ice' ? '#d6eeff' : state.material === 'glass' ? '#e7eaff' : state.material === 'jelly' ? '#f5cfdf' : '#ff71c6'), blend);
    pink.intensity += ((state.material === 'jelly' ? 1.8 : state.material === 'glass' ? 1.3 : state.material === 'ice' ? 2 : 6) - pink.intensity) * blend;
    const since = time - impulseTime, rigidImpulse = motion && preset.amplitude === 0 ? Math.sin(since * 8) * Math.exp(-since * 7) * .08 : 0, ripple = motion ? (state.material === 'jelly' ? Math.sin(since * 24) * .76 + Math.sin(since * 37) * .24 : Math.sin(since * 7)) * Math.exp(-since * preset.decay) * wobble : 0;
    softUniforms.uSoftTime.value = time;
    softUniforms.uSoftWave.value = motion && state.material === 'jelly' ? Math.exp(-since * 1.8) * .028 + Math.sin(time * 1.8) * .002 : 0;
    yaw += (state.yaw - yaw) * (1 - Math.exp(-dt * (state.material === 'glass' ? 14 : 7))); pitch += (state.pitch - pitch) * blend;
    object.rotation.set(.12 + pitch + (motion ? Math.sin(time * .48) * .045 : 0), .28 + yaw + (motion && !state.dragging ? Math.sin(time * .55) * .24 : 0), motion ? Math.sin(time * .42) * .035 + ripple * .38 + rigidImpulse : 0);
    object.scale.set(1 + ripple, (1 + ripple) ** -1.3, (1 + ripple) ** .3);
    object.position.y = motion ? Math.sin(time * .65) * .04 : 0;
    charms.children.forEach((child, i) => { const home = child.userData.home as THREE.Vector3; child.position.y = home.y + (motion && (state.material === 'jelly' || state.material === 'resin') ? Math.sin(time * .7 + i * 1.6) * (state.material === 'jelly' ? .018 : .006) + ripple * Math.sin(i) * .08 : 0); });
    renderer.render(scene, camera);
  };
  frame = requestAnimationFrame(animate);
  return () => { disposed = true; cancelAnimationFrame(frame); ro.disconnect(); io.disconnect(); renderer.domElement.removeEventListener('webglcontextlost', contextLost); body.geometry.dispose(); bodyMaterial.dispose(); ice.dispose(); for (const mesh of cache.values()) { mesh.geometry.dispose(); for (const m of mesh.material as THREE.MeshPhysicalMaterial[]) { m.map?.dispose(); m.dispose(); } } environment.dispose(); renderer.dispose(); renderer.domElement.remove(); };
}
