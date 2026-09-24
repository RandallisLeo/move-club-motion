import * as THREE from 'three';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { cakeFragmentShader, cakeVertexShader } from './cake-reflect-shader';
import {
  CAKES,
  DEFAULT_CAKE_ELEVATION,
  advanceCakeTurn,
  turnIsHeld,
  type CakeSceneState,
} from './cake-reflect-model';

export type CakeSurfaceAction = { key: number; index: number; x: number; y: number };
const PICK_SAMPLES = 9;

// The ray tracer writes display-referred color, matching the CSS palette exactly.
function displayColor(hex: string) {
  return new THREE.Vector3(
    ...([1, 3, 5].map(
      (offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255,
    ) as [number, number, number]),
  );
}
export function createCakeScene(
  host: HTMLElement,
  read: () => CakeSceneState,
  onFailure: () => void,
  onEmptyAnchors: (anchors: CakeSurfaceAction[]) => void,
) {
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
  });
  // The geometry is drawn inside a fragment shader, so canvas MSAA alone
  // cannot smooth its edges. Keep sampling density stable and filter the image.
  const renderPixelRatio = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2);
  renderer.setPixelRatio(renderPixelRatio);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  const uniforms = {
    uResolution: { value: new THREE.Vector2(1, 1) },
    uBackground: { value: new THREE.Vector3() },
    uRotation: { value: read().angle },
    uElevation: { value: DEFAULT_CAKE_ELEVATION },
    uCount: { value: read().count },
    uMirrors: { value: 1 },
    uBody: { value: CAKES.map((cake) => displayColor(cake.body)) },
    uIcing: { value: CAKES.map((cake) => displayColor(cake.icing)) },
    uHeight: { value: CAKES.map((cake) => cake.height) },
    uPresent: { value: Array(8).fill(1) },
    uPicking: { value: 0 },
    uPickPoints: { value: Array.from({ length: PICK_SAMPLES }, () => new THREE.Vector2()) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: cakeVertexShader,
    fragmentShader: cakeFragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  const geometry = new THREE.PlaneGeometry(2, 2),
    scene = new THREE.Scene(),
    camera = new THREE.Camera();
  scene.add(new THREE.Mesh(geometry, material));
  const beautyTarget = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  });
  const antialiasUniforms = THREE.UniformsUtils.clone(FXAAShader.uniforms);
  antialiasUniforms.tDiffuse.value = beautyTarget.texture;
  const antialiasMaterial = new THREE.ShaderMaterial({
    uniforms: antialiasUniforms,
    vertexShader: cakeVertexShader,
    fragmentShader: FXAAShader.fragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  const antialiasScene = new THREE.Scene();
  antialiasScene.add(new THREE.Mesh(geometry, antialiasMaterial));
  const pickTarget = new THREE.WebGLRenderTarget(PICK_SAMPLES, 1, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: false,
    stencilBuffer: false,
  });
  const pickPoints = (points: { x: number; y: number }[], includeMissingCakes = false) => {
    const started = performance.now(), size = uniforms.uResolution.value;
    const pixels = new Uint8Array(PICK_SAMPLES * 4);
    for (let i = 0; i < PICK_SAMPLES; i++) {
      const point = points[i] ?? points[0];
      uniforms.uPickPoints.value[i].set(point.x / size.x, 1 - point.y / size.y);
    }
    uniforms.uPicking.value = includeMissingCakes ? 2 : 1;
    let result: Promise<THREE.TypedArray>;
    try {
      renderer.setRenderTarget(pickTarget);
      renderer.render(scene, camera);
      result = renderer.readRenderTargetPixelsAsync(pickTarget, 0, 0, PICK_SAMPLES, 1, pixels);
    } finally {
      // Restore the beauty pass immediately, before awaiting the GPU fence.
      renderer.setRenderTarget(null);
      uniforms.uPicking.value = 0;
    }
    host.dataset.pickSubmitMs = (performance.now() - started).toFixed(1);
    return result.then(() => points.map((_, index) => ({
      index: pixels[index * 4] - 1,
      overSubject: pixels[index * 4 + 1] > 0,
    })));
  };
  const projectPoint = (slot: number, radius: number, height: number) => {
    const state = read(), size = uniforms.uResolution.value;
    const azimuth = (slot + .5) * Math.PI * 2 / state.count;
    const p = new THREE.Vector3(Math.cos(azimuth) * radius, height, Math.sin(azimuth) * radius);
    p.applyAxisAngle(new THREE.Vector3(0, 1, 0), -state.angle);
    const eye = new THREE.Vector3(0, Math.sin(elevation) * 7, Math.cos(elevation) * 7);
    const forward = new THREE.Vector3(0, 1, 0).sub(eye).normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward);
    const aspect = size.x / size.y, framing = 2.18 * (aspect < 1.05 ? 1.05 / aspect : 1);
    p.sub(eye);
    return { x: (.5 + p.dot(right) / (framing * aspect) * .5) * size.x,
      y: (.5 - p.dot(up) / framing * .5) * size.y };
  };
  // Both actions stay at the same outer-face center, even while the cake is absent.
  const projectCakeAction = (slot: number) => projectPoint(slot,
    (slot === 4 ? 1.18 : 1.24) - .018, (CAKES[slot].height + .31) * .5);
  let hadEmptyAnchors = false, anchorReadPending = false, lastAnchorQuery = 0;
  let completedAnchorKey = '';
  const restoreLocations = new Map<number, number>();
  const contentKey = () => {
    const state = read();
    return `${state.count}:${state.mirrors}:${state.present.join(',')}`;
  };
  const viewKey = () => `${contentKey()}:${read().angle.toFixed(4)}:${elevation.toFixed(4)}:${uniforms.uResolution.value.toArray().join(',')}`;
  const publishEmptyActions = () => {
    const anchors: CakeSurfaceAction[] = [];
    for (const [index, slot] of restoreLocations) {
      if (!read().present[index]) anchors.push({ ...projectCakeAction(slot), index, key: index });
    }
    onEmptyAnchors(anchors);
    hadEmptyAnchors = anchors.length > 0;
  };
  const placeEmptyActions = (now: number) => {
    const state = read();
    if (state.present.slice(0, state.count).every(Boolean)) {
      if (hadEmptyAnchors) onEmptyAnchors([]);
      hadEmptyAnchors = false;
      restoreLocations.clear();
      completedAnchorKey = '';
      return;
    }
    // Manipulating the camera never waits for or queues a GPU picking pass.
    if (state.dragging || Math.abs(state.elevation - elevation) > .005) {
      if (hadEmptyAnchors) onEmptyAnchors([]);
      hadEmptyAnchors = false;
      restoreLocations.clear();
      completedAnchorKey = '';
      return;
    }
    if (restoreLocations.size) publishEmptyActions();
    const key = viewKey();
    if (anchorReadPending || key === completedAnchorKey ||
      (!turnIsHeld(state) && now - lastAnchorQuery < 120)) return;
    const snapshot = { content: contentKey(), angle: state.angle, elevation };
    const points = Array.from({ length: state.count }, (_, i) => projectCakeAction(i));
    anchorReadPending = true;
    lastAnchorQuery = now;
    void pickPoints(points, true).then((indices) => {
      if (disposed || snapshot.content !== contentKey() || read().dragging ||
        Math.abs(Math.atan2(Math.sin(read().angle - snapshot.angle), Math.cos(read().angle - snapshot.angle))) > .07 ||
        Math.abs(elevation - snapshot.elevation) > .04) return;
      const candidates = points.map((point, slot) => ({ ...point, slot, index: indices[slot].index }))
        .filter(({ index, slot }) => index === slot && !read().present[index]);
      const nextLocations = new Map<number, number>();
      // Physical slots only: a mirror image never receives a duplicate control.
      for (const candidate of candidates) nextLocations.set(candidate.index, candidate.slot);
      restoreLocations.clear();
      for (const [index, slot] of nextLocations) restoreLocations.set(index, slot);
      completedAnchorKey = key;
      publishEmptyActions();
    }).catch(() => {
      // Context loss has its own visible fallback. Do not queue repeated reads.
      completedAnchorKey = viewKey();
    }).finally(() => {
      anchorReadPending = false;
      if (!disposed && turnIsHeld(read()) && completedAnchorKey !== viewKey()) invalidate();
    });
  };
  let frame = 0,
    disposed = false,
    visible = true,
    last = 0,
    failed = false,
    elevation = DEFAULT_CAKE_ELEVATION;
  renderer.debug.onShaderError = (gl, _program, _vertex, fragment) => {
    failed = true;
    console.error('Cake reflection shader:', gl.getShaderInfoLog(fragment));
    onFailure();
  };
  const draw = (now: number) => {
    frame = 0;
    if (disposed || failed || !visible || document.hidden) {
      last = 0;
      return;
    }
    const state = read(),
      dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    if (last) host.dataset.frameGapMs = (now - last).toFixed(1);
    last = now;
    advanceCakeTurn(state, dt);
    const target = state.elevation;
    elevation = state.reducedMotion || state.dragging
      ? target
      : THREE.MathUtils.damp(elevation, target, 8, dt);
    uniforms.uRotation.value = state.angle;
    uniforms.uElevation.value = elevation;
    uniforms.uCount.value = state.count;
    uniforms.uMirrors.value = state.mirrors ? 1 : 0;
    for (let i = 0; i < 8; i++)
      uniforms.uPresent.value[i] = state.present[i] ? 1 : 0;
    host.dataset.rotation = ((state.angle * 180) / Math.PI).toFixed(3);
    host.setAttribute(
      'aria-valuenow',
      String(Math.round((state.angle * 180) / Math.PI)),
    );
    host.dataset.motion = turnIsHeld(state) ? 'paused' : 'clockwise';
    host.dataset.elevation = ((elevation * 180) / Math.PI).toFixed(2);
    host.setAttribute('aria-valuetext', `${Math.round(state.angle * 180 / Math.PI)} degrees rotation, ${Math.round(elevation * 180 / Math.PI)} degrees viewing elevation`);
    host.dataset.renderScale = String(renderPixelRatio);
    host.dataset.antialias = 'supersampling-fxaa';
    renderer.setRenderTarget(beautyTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(antialiasScene, camera);
    placeEmptyActions(now);
    if (
      !failed &&
      (!turnIsHeld(state) || Math.abs(target - elevation) > 0.0001)
    )
      frame = requestAnimationFrame(draw);
    else last = 0;
  };
  const invalidate = () => {
    if (!frame && !disposed) frame = requestAnimationFrame(draw);
  };
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(Math.max(1, width), Math.max(1, height), false);
    const drawingSize = renderer.getDrawingBufferSize(new THREE.Vector2());
    beautyTarget.setSize(drawingSize.x, drawingSize.y);
    antialiasUniforms.resolution.value.set(1 / drawingSize.x, 1 / drawingSize.y);
    uniforms.uResolution.value.set(Math.max(1, width), Math.max(1, height));
    const root = host.closest('.cake-reflect-demo') || host;
    const rgb = getComputedStyle(root)
      .backgroundColor.match(/[\d.]+/g)
      ?.slice(0, 3)
      .map(Number);
    if (rgb?.length === 3)
      uniforms.uBackground.value.set(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
    invalidate();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) invalidate();
  });
  intersection.observe(host);
  const visibility = () => {
    if (!document.hidden) invalidate();
  };
  const contextLost = (event: Event) => {
    event.preventDefault();
    failed = true;
    onFailure();
  };
  document.addEventListener('visibilitychange', visibility);
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  resize();
  return {
    invalidate,
    getElevation: () => elevation,
    pick: async (clientX: number, clientY: number) => {
      const rect = host.getBoundingClientRect();
      const x = clientX - rect.left, y = clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height)
        return { overSubject: false, cake: null };
      const points = [{ x, y }, ...Array.from({ length: read().count }, (_, slot) => projectCakeAction(slot))];
      const indices = await pickPoints(points);
      if (disposed) return null;
      const { index, overSubject } = indices[0];
      if (index < 0 || indices[index + 1]?.index !== index)
        return { overSubject, cake: null };
      // Fixed center of the real outer face; its own visibility sample prevents
      // placing the control onto a mirror or an intervening slice.
      const anchor = points[index + 1];
      return { overSubject, cake: { index, x: anchor.x, y: anchor.y } };
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      geometry.dispose();
      material.dispose();
      antialiasMaterial.dispose();
      beautyTarget.dispose();
      pickTarget.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
