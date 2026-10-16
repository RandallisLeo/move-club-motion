import * as THREE from 'three';

export type AcrylicPose = { x: number; y: number; z: number; rx: number; ry: number; rz: number; scale: number; opacity: number };
export type AcrylicFrame = { scale: number; tilt: number; y: number; depth: number; concentration: number; motion: number; poses: AcrylicPose[] };

const vertex = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vLocal;
  void main() {
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = -view.xyz;
    vLocal = position;
    gl_Position = projectionMatrix * view;
  }
`;
const softCoverage = /* glsl */`
  uniform float uSoftness;
  varying vec3 vLocal;
  float coverage() {
    #ifdef SOFT_DISC
      // Gaussian edge spread, evaluated before compositing. A rear sheet
      // stays defocused even when seen through a sharp transparent sheet.
      float x = (length(vLocal.xy) - 62.7) / max(uSoftness, .2);
      float a = abs(x) * .70710678;
      float t = 1.0 / (1.0 + .3275911 * a);
      float e = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * exp(-a*a);
      return .5 * (1.0 - sign(x) * e);
    #else
      return 1.0;
    #endif
  }
`;
const absorption = /* glsl */`
  uniform vec3 uTint;
  uniform float uOpacity;
  uniform float uDensity;
  uniform float uFrost;
  varying vec3 vNormal;
  varying vec3 vView;
  ${softCoverage}
  void main() {
    float incidence = abs(dot(normalize(vNormal), normalize(vView)));
    // Clear PMMA absorbs more colored light along the longer edge path.
    // Multiplicative blending transmits the actual sheets behind this one;
    // ordinary alpha fills would turn the same colors into milky pastels.
    float path = uDensity / max(incidence, 0.62);
    vec3 transmission = exp(log(max(uTint, vec3(0.018))) * path);
    transmission = mix(transmission, vec3(.38), uFrost);
    transmission = mix(vec3(1.0), transmission, uOpacity * coverage());
    gl_FragColor = vec4(transmission, 1.0);
  }
`;
const reflection = /* glsl */`
  uniform vec3 uTint;
  uniform float uOpacity;
  uniform float uDensity;
  uniform float uFrost;
  varying vec3 vNormal;
  varying vec3 vView;
  ${softCoverage}
  float panel(vec3 r, vec3 direction, float width) {
    return exp((dot(r, normalize(direction)) - 1.0) / width);
  }
  void main() {
    vec3 n = normalize(vNormal), v = normalize(vView);
    vec3 r = reflect(-v, n);
    float facing = clamp(abs(dot(n, v)), 0.0, 1.0);
    // Broad area lights keep the acrylic sheen and bevel highlights without
    // the narrow rectangular reflections reading as white pillars.
    float fresnel = 0.039 + 0.961 * pow(1.0 - facing, 5.0);
    float broad = panel(r, vec3(-.30, .46, .84), .18);
    float fill = panel(r, vec3(.40, .65, .62), .28);
    float gloss = panel(r, vec3(-.045, .065, .997), .0012);
    float overhead = panel(r, vec3(-.16, .94, -.30), .006);
    float light = gloss * 8.0 + overhead * 4.5 + broad * 1.2 + fill * .45;
    float bevel = smoothstep(61.1, 63.1, length(vLocal.xy));
    vec3 rimTint = mix(vec3(1.0), sqrt(uTint), .16);
    vec3 reflected = rimTint * (fresnel * light + bevel * light * .10) / (1.0 + uSoftness * uSoftness * .12);
    // A small amount of light is carried by the colored volume. This keeps
    // dense stacks luminous without washing out a single sheet's tint.
    vec3 through = exp(log(max(uTint, vec3(.018))) * uDensity / max(facing, .62));
    reflected += (vec3(1.0) - through) * sqrt(uTint) * .16 * (1.0 - uFrost);
    // The white sheet scatters transmitted light instead of becoming an
    // invisible colorless filter against the pale stage.
    reflected += uTint * .62 * uFrost;
    gl_FragColor = vec4(reflected * uOpacity * coverage(), 1.0);
  }
`;
const resolveVertex = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const resolveFragment = /* glsl */`
  uniform sampler2D uColor;
  uniform vec2 uTexel;
  uniform float uPixelRatio;
  uniform float uMotion;
  varying vec2 vUv;
  void main() {
    vec2 stepUV = uTexel * vec2(uMotion * .85, 0.0) * uPixelRatio;
    vec3 color = texture2D(uColor, vUv).rgb * .5;
    color += texture2D(uColor, vUv + stepUV).rgb * .25;
    color += texture2D(uColor, vUv - stepUV).rgb * .25;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

export function createAcrylicRenderer(host: HTMLElement, colors: readonly string[], onFailure: () => void, onReady: () => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.domElement.className = 'dr-acrylic-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f7f7fa');
  const camera = new THREE.PerspectiveCamera(12, 1, 1, 2200);
  camera.position.z = 1050;
  const group = new THREE.Group(); scene.add(group);
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 62.2, 0, Math.PI * 2, false);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 4.6, bevelEnabled: true, bevelThickness: .75, bevelSize: .8, bevelSegments: 4, curveSegments: 64, steps: 1 });
  geometry.translate(0, 0, -2.3);
  geometry.computeBoundingSphere();
  const softGeometry = new THREE.PlaneGeometry(224, 224);
  const sheets = colors.map(color => {
    const tint = new THREE.Color(color).lerp(new THREE.Color('#ffffff'), .018);
    const uniforms = { uTint: { value: tint }, uOpacity: { value: 1 }, uDensity: { value: .92 }, uFrost: { value: Math.min(tint.r, tint.g, tint.b) > .7 ? 1 : 0 }, uSoftness: { value: 0 } };
    const body = new THREE.ShaderMaterial({
      uniforms, vertexShader: vertex, fragmentShader: absorption,
      transparent: true, depthTest: true, depthWrite: true, side: THREE.FrontSide,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
      blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor,
      blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    });
    const shine = new THREE.ShaderMaterial({
      uniforms, vertexShader: vertex, fragmentShader: reflection,
      transparent: true, depthTest: true, depthWrite: false, side: THREE.FrontSide,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    });
    const object = new THREE.Group();
    const bodyMesh = new THREE.Mesh(geometry, body), shineMesh = new THREE.Mesh(geometry, shine);
    const softBody = body.clone(), softShine = shine.clone();
    softBody.uniforms = uniforms; softShine.uniforms = uniforms;
    softBody.defines = { SOFT_DISC: 1 }; softShine.defines = { SOFT_DISC: 1 };
    softBody.side = THREE.DoubleSide; softShine.side = THREE.DoubleSide;
    softBody.depthWrite = false;
    const softBodyMesh = new THREE.Mesh(softGeometry, softBody), softShineMesh = new THREE.Mesh(softGeometry, softShine);
    object.add(bodyMesh, shineMesh, softBodyMesh, softShineMesh); group.add(object);
    object.rotation.order = 'YXZ';
    return { object, body, shine, bodyMesh, shineMesh, softBody, softShine, softBodyMesh, softShineMesh, uniforms, depth: 0 };
  });
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true, samples: 4 });
  target.texture.colorSpace = THREE.LinearSRGBColorSpace;
  const resolveMaterial = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: target.texture }, uTexel: { value: new THREE.Vector2(1, 1) }, uPixelRatio: { value: pixelRatio }, uMotion: { value: 0 } },
    vertexShader: resolveVertex, fragmentShader: resolveFragment, depthTest: false, depthWrite: false,
  });
  const resolveScene = new THREE.Scene();
  const quadGeometry = new THREE.PlaneGeometry(2, 2);
  resolveScene.add(new THREE.Mesh(quadGeometry, resolveMaterial));
  const resolveCamera = new THREE.Camera();
  let disposed = false, ready = false;
  function resize() {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height || disposed) return;
    renderer.setSize(width, height, false);
    target.setSize(Math.round(width * pixelRatio), Math.round(height * pixelRatio));
    resolveMaterial.uniforms.uTexel.value.set(1 / target.width, 1 / target.height);
    camera.aspect = width / height;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(height / (2 * 1050)));
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize); observer.observe(host);
  host.appendChild(renderer.domElement); resize();
  const lost = (event: Event) => { event.preventDefault(); onFailure(); };
  renderer.domElement.addEventListener('webglcontextlost', lost);
  const worldPoint = new THREE.Vector3();
  // Compile the two material passes before showing the canvas. Loading a new
  // material must not block a formation switch with synchronous shader work.
  void (async () => {
    try {
      renderer.setRenderTarget(target);
      await renderer.compileAsync(scene, camera);
      if (disposed) return;
      renderer.setRenderTarget(null);
      await renderer.compileAsync(resolveScene, resolveCamera);
      if (!disposed) { ready = true; onReady(); }
    } catch { if (!disposed) onFailure(); }
  })();
  return {
    setColors(nextColors: readonly string[]) {
      sheets.forEach((sheet, i) => {
        const tint = sheet.uniforms.uTint.value;
        tint.set(nextColors[i]).lerp(new THREE.Color('#ffffff'), .018);
        sheet.uniforms.uFrost.value = Math.min(tint.r, tint.g, tint.b) > .7 ? 1 : 0;
      });
    },
    render(frame: AcrylicFrame) {
      if (disposed || !ready) return false;
      group.rotation.x = -frame.tilt;
      group.scale.setScalar(frame.scale);
      group.position.y = -frame.y;
      frame.poses.forEach((pose, i) => {
        const sheet = sheets[i];
        sheet.object.visible = pose.opacity > .001;
        sheet.object.position.set(pose.x, -pose.y, pose.z);
        sheet.object.rotation.set(-pose.rx, pose.ry, -pose.rz, 'YXZ');
        sheet.object.scale.setScalar(pose.scale);
        sheet.uniforms.uOpacity.value = pose.opacity;
        const back = frame.depth * (1 - THREE.MathUtils.smoothstep(pose.z, -120, 120));
        sheet.uniforms.uDensity.value = frame.concentration * (1 - back * .16);
        const softness = frame.depth * 15 * (1 - THREE.MathUtils.smoothstep(pose.z, -140, 70));
        sheet.uniforms.uSoftness.value = softness;
        const soft = softness > .45;
        sheet.bodyMesh.visible = !soft; sheet.shineMesh.visible = !soft;
        sheet.softBodyMesh.visible = soft; sheet.softShineMesh.visible = soft;
      });
      group.updateMatrixWorld(true);
      const sorted = sheets.filter(sheet => sheet.object.visible).map(sheet => {
        sheet.object.getWorldPosition(worldPoint); sheet.depth = worldPoint.z; return sheet;
      }).sort((a, b) => a.depth - b.depth);
      sorted.forEach((sheet, index) => {
        sheet.bodyMesh.renderOrder = sheet.softBodyMesh.renderOrder = index * 2;
        sheet.shineMesh.renderOrder = sheet.softShineMesh.renderOrder = index * 2 + 1;
      });
      resolveMaterial.uniforms.uMotion.value = frame.motion;
      renderer.setRenderTarget(target); renderer.render(scene, camera);
      renderer.setRenderTarget(null); renderer.render(resolveScene, resolveCamera);
      return true;
    },
    dispose() {
      if (disposed) return; disposed = true;
      observer.disconnect(); renderer.domElement.removeEventListener('webglcontextlost', lost);
      geometry.dispose(); softGeometry.dispose(); sheets.forEach(sheet => { sheet.body.dispose(); sheet.shine.dispose(); sheet.softBody.dispose(); sheet.softShine.dispose(); });
      target.dispose(); resolveMaterial.dispose(); quadGeometry.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
