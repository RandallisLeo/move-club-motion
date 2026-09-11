import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { foldCameraDistance, foldFocus, foldGeometry, foldLighting, HINGE_Z, PANEL_DEPTH, PANEL_HEIGHT, PANEL_WIDTH, stepSpatialPose, type SpatialPose } from './spatial-motion';
import { createOrbitCameraRig, ORBIT_FRAME_OFFSET, orbitCameraPosition, retargetOrbitCamera, stepOrbitCamera } from './orbit-camera';
import { FOLD_WALLPAPERS } from './fold-wallpapers';

type Model = { root: THREE.Group; update: (pose: SpatialPose, camera: THREE.PerspectiveCamera) => void; textures: THREE.Texture[] };

function panelShape(width: number, height: number, outerEdge: 'left' | 'right') {
  const x = -width / 2, y = -height / 2;
  // The two inner halves meet without a border or rounded cutout at the hinge.
  const leftRadius = outerEdge === 'left' ? 0.18 : 0;
  const rightRadius = outerEdge === 'right' ? 0.18 : 0;
  const shape = new THREE.Shape();
  shape.moveTo(x + leftRadius, y);
  shape.lineTo(x + width - rightRadius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + rightRadius);
  shape.lineTo(x + width, y + height - rightRadius);
  shape.quadraticCurveTo(x + width, y + height, x + width - rightRadius, y + height);
  shape.lineTo(x + leftRadius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - leftRadius);
  shape.lineTo(x, y + leftRadius);
  shape.quadraticCurveTo(x, y, x + leftRadius, y);
  return shape;
}

function panelSurface(width: number, height: number, outerEdge: 'left' | 'right') {
  const geometry = new THREE.ShapeGeometry(panelShape(width, height, outerEdge), 12);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) / width + 0.5, position.getY(i) / height + 0.5);
  return geometry;
}

async function sharedPhoto(src: string) {
  const photo = new Image();
  photo.src = src;
  await photo.decode();
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 740;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');
  const scale = Math.max(canvas.width / photo.width, canvas.height / photo.height);
  context.drawImage(photo, (canvas.width - photo.width * scale) / 2, (canvas.height - photo.height * scale) / 2, photo.width * scale, photo.height * scale);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  // One full-bleed photograph, shared by all three projected surfaces.
  return texture;
}

function photoWindowMaterial(texture: THREE.Texture, worldToImage: THREE.Matrix4, cameraInImage: THREE.Vector3, side: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture }, uWorldToImage: { value: worldToImage }, uCameraInImage: { value: cameraInImage },
      uImageSize: { value: new THREE.Vector2(PANEL_WIDTH * 2, PANEL_HEIGHT) }, uSide: { value: side },
      uExposure: { value: 1 }, uCreaseShadow: { value: 0 }, uShadowWidth: { value: 0.1 }, uZoom: { value: 1 },
      uFocusDepth: { value: 0 }, uAperture: { value: 0 },
    },
    vertexShader: `
      uniform mat4 uWorldToImage;
      varying vec2 vUv;
      varying vec3 vImagePosition;
      varying float vDepth;
      void main() {
        vUv = uv;
        vImagePosition = (uWorldToImage * modelMatrix * vec4(position, 1.0)).xyz;
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        vDepth = -view.z;
        gl_Position = projectionMatrix * view;
      }`,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform float uSide, uExposure, uCreaseShadow, uShadowWidth, uZoom, uFocusDepth, uAperture;
      uniform vec2 uImageSize;
      uniform vec3 uCameraInImage;
      varying vec2 vUv;
      varying vec3 vImagePosition;
      varying float vDepth;
      void main() {
        // Cast through this moving window onto the single rear image plane.
        // Image coordinates never come from the rotating leaf's surface UVs.
        vec3 ray = vImagePosition - uCameraInImage;
        vec2 hit = uCameraInImage.xy - ray.xy * (uCameraInImage.z / ray.z);
        vec2 imageUv = hit / uImageSize + 0.5;
        vec2 p = (imageUv - 0.5) / uZoom + 0.5;
        float defocus = min(42.0, abs(vDepth - uFocusDepth) * uAperture);
        // A continuous prefiltered texture pyramid avoids the multiple-image
        // ghosting produced by widely spaced blur taps on fine details.
        vec2 texelScale = vec2(1024.0, 740.0);
        float footprint = max(length(dFdx(p) * texelScale), length(dFdy(p) * texelScale));
        float lod = log2(max(1.0, max(footprint, defocus * 0.5)));
        vec4 c = textureLod(uMap, p, lod);
        if (defocus > footprint * 1.5) {
          // Blend an overlapping, prefiltered Gaussian kernel so stronger
          // defocus remains soft instead of exposing large mipmap texels.
          vec2 r = vec2(defocus * 0.6) / texelScale;
          c *= 0.25;
          c += (textureLod(uMap, p + vec2(r.x, 0.0), lod)
            + textureLod(uMap, p - vec2(r.x, 0.0), lod)
            + textureLod(uMap, p + vec2(0.0, r.y), lod)
            + textureLod(uMap, p - vec2(0.0, r.y), lod)) * 0.125;
          c += (textureLod(uMap, p + r, lod)
            + textureLod(uMap, p - r, lod)
            + textureLod(uMap, p + vec2(r.x, -r.y), lod)
            + textureLod(uMap, p + vec2(-r.x, r.y), lod)) * 0.0625;
        }
        float shadowDistance = uSide > 0.5 ? vUv.x : 1.0 - vUv.x;
        float crease = exp(-shadowDistance / uShadowWidth);
        c.rgb *= uExposure * (1.0 - uCreaseShadow * crease);
        // The photograph has real bounds. The triangular parts of a raised
        // window show a dark surface, not stretched/clamped border pixels.
        // Blur softens this boundary too, as if seen through a foreground pane.
        vec2 feather = max(fwidth(imageUv) * 0.7, vec2(defocus * 0.65) / texelScale);
        vec2 inside = smoothstep(-feather, feather, imageUv)
          * (1.0 - smoothstep(1.0 - feather, 1.0 + feather, imageUv));
        float coverage = inside.x * inside.y;
        vec3 matte = vec3(0.005, 0.007, 0.012);
        gl_FragColor = vec4(mix(matte, c.rgb, coverage), 1.0);
        #include <colorspace_fragment>
      }`,
    toneMapped: false,
  });
}

async function createFoldModel(): Promise<Model> {
  const loaded = await Promise.allSettled(FOLD_WALLPAPERS.map(({ src }) => sharedPhoto(src)));
  const photos = loaded.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
  if (photos.length !== FOLD_WALLPAPERS.length) {
    photos.forEach((texture) => texture.dispose());
    throw new Error('A fold wallpaper could not be loaded');
  }
  const photo = photos[0];
  const root = new THREE.Group();
  const pivot = new THREE.Group();
  pivot.position.z = HINGE_Z; root.add(pivot);
  const left = new THREE.Group(); left.position.z = -HINGE_Z; pivot.add(left);
  const right = new THREE.Group(); root.add(right);
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0x505664, roughness: 0.78, metalness: 0.03 });
  const worldToImage = new THREE.Matrix4(), imageOffset = new THREE.Matrix4();
  const cameraInImage = new THREE.Vector3();
  const materials = [
    photoWindowMaterial(photo, worldToImage, cameraInImage, 1),
    photoWindowMaterial(photo, worldToImage, cameraInImage, 1),
    photoWindowMaterial(photo, worldToImage, cameraInImage, 1),
  ];
  const focus = new THREE.Vector3(), coverFocus = new THREE.Vector3();
  const surfaces: THREE.Mesh[] = [];

  [left, right].forEach((group, index) => {
    const outerEdge = index === 0 ? 'left' : 'right';
    const center = (index === 0 ? -1 : 1) * PANEL_WIDTH / 2;
    const geometry = new THREE.ExtrudeGeometry(panelShape(PANEL_WIDTH, PANEL_HEIGHT, outerEdge), {
      depth: PANEL_DEPTH, bevelEnabled: false, curveSegments: 12,
    });
    geometry.translate(0, 0, -PANEL_DEPTH / 2);
    const slab = new THREE.Mesh(geometry, edgeMaterial);
    slab.position.x = center; group.add(slab);
    const face = new THREE.Mesh(panelSurface(PANEL_WIDTH, PANEL_HEIGHT, outerEdge), materials[index]);
    face.name = index === 0 ? 'inner-left-content' : 'inner-right-content';
    face.position.set(center, 0, PANEL_DEPTH / 2 + 0.001); group.add(face);
    surfaces[index] = face;
    if (index === 0) {
      // Third content surface: mounted on the reverse of the moving leaf.
      // Its reversed normal faces the viewer only after the inward fold passes 90°.
      const cover = new THREE.Mesh(panelSurface(PANEL_WIDTH, PANEL_HEIGHT, 'right'), materials[2]);
      cover.name = 'outer-cover-content';
      cover.position.set(center, 0, -PANEL_DEPTH / 2 - 0.001);
      cover.rotation.y = Math.PI;
      group.add(cover);
      surfaces[2] = cover;
    }
  });

  // A tiny flexible strip joins the inner halves around the hinge's clearance.
  // It samples the same image, so the fold never exposes a straight slab edge.
  const hingeSegments = 16;
  const hingeGeometry = new THREE.BufferGeometry();
  const hingePositions = new THREE.BufferAttribute(new Float32Array((hingeSegments + 1) * 6), 3);
  const hingeUvs = new THREE.BufferAttribute(new Float32Array((hingeSegments + 1) * 4), 2);
  const hingeIndices: number[] = [];
  for (let i = 0; i <= hingeSegments; i++) {
    hingeUvs.setXY(i * 2, 0, 0); hingeUvs.setXY(i * 2 + 1, 0, 1);
    if (i < hingeSegments) {
      const a = i * 2;
      hingeIndices.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
  }
  hingeGeometry.setAttribute('position', hingePositions);
  hingeGeometry.setAttribute('uv', hingeUvs);
  hingeGeometry.setIndex(hingeIndices);
  const hinge = new THREE.Mesh(hingeGeometry, materials[1]);
  hinge.name = 'continuous-inner-fold';
  hinge.frustumCulled = false;
  root.add(hinge);

  return {
    root, textures: photos,
    update(pose, camera) {
      const p = THREE.MathUtils.clamp(pose.progress, 0, 1);
      const fold = foldGeometry(p);
      pivot.rotation.y = fold.angle;
      const hingeRadius = HINGE_Z - (PANEL_DEPTH / 2 + 0.001);
      for (let i = 0; i <= hingeSegments; i++) {
        const angle = fold.angle * i / hingeSegments;
        const x = -hingeRadius * Math.sin(angle), z = HINGE_Z - hingeRadius * Math.cos(angle);
        hingePositions.setXYZ(i * 2, x, -PANEL_HEIGHT / 2, z);
        hingePositions.setXYZ(i * 2 + 1, x, PANEL_HEIGHT / 2, z);
      }
      hingePositions.needsUpdate = true;
      root.rotation.set(pose.rx, pose.ry, pose.rz, 'YXZ');
      root.position.copy(new THREE.Vector3(-fold.centerX, 0, -p * 0.03).applyEuler(root.rotation)).multiplyScalar(pose.scale);
      root.scale.setScalar(pose.scale);
      root.updateMatrixWorld(true);
      const focusState = foldFocus(p);
      const light = foldLighting(p);
      // The image plane shares the stationary inner face's orientation. The leaf
      // only changes the window we see it through, never the photo's orientation.
      // At final closure the plane moves across just the stacked panel thickness.
      const imageDepth = PANEL_DEPTH / 2 + 0.001 + 2 * HINGE_Z * focusState.coverWeight;
      imageOffset.makeTranslation(fold.centerX, 0, imageDepth);
      worldToImage.copy(root.matrixWorld).multiply(imageOffset).invert();
      cameraInImage.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(worldToImage);
      surfaces[1].getWorldPosition(focus);
      surfaces[2].getWorldPosition(coverFocus);
      focus.lerp(coverFocus, focusState.coverWeight).applyMatrix4(camera.matrixWorldInverse);
      for (const material of materials) {
        material.uniforms.uMap.value = photos[pose.wallpaper ?? 0] ?? photo;
        material.uniforms.uFocusDepth.value = -focus.z;
        material.uniforms.uAperture.value = focusState.aperture;
        material.uniforms.uZoom.value = 1 + p * 0.035;
        material.uniforms.uShadowWidth.value = light.shadowWidth;
      }
      materials[0].uniforms.uAperture.value *= 1.9;
      materials[2].uniforms.uAperture.value *= 1.9;
      materials[0].uniforms.uExposure.value = light.innerExposure;
      materials[1].uniforms.uExposure.value = light.innerExposure;
      materials[0].uniforms.uCreaseShadow.value = light.innerShadow;
      materials[1].uniforms.uCreaseShadow.value = light.innerShadow * 0.12;
      materials[2].uniforms.uCreaseShadow.value = light.coverShadow;
    },
  };
}

function createOrbitModel(): Model {
  const root = new THREE.Group();
  // A continuous sculptural loop: no screen, device frame, or folding parts.
  const geometry = new THREE.TorusKnotGeometry(0.79, 0.25, 240, 36, 2, 3);
  geometry.computeVertexNormals();
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x8589df, metalness: 0.42, roughness: 0.27, clearcoat: 0.65, clearcoatRoughness: 0.18,
  });
  const sculpture = new THREE.Mesh(geometry, material);
  sculpture.rotation.x = Math.PI / 2;
  root.add(sculpture);
  return {
    root, textures: [],
    update() { /* The sculpture stays fixed; only the camera travels. */ },
  };
}

function disposeModel(model: Model) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  model.root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  model.textures.forEach((texture) => texture.dispose());
}

export async function createSpatialScene(host: HTMLDivElement, kind: 'fold' | 'object', getPose: () => SpatialPose, reduced: () => boolean, onError: () => void) {
  const model = kind === 'fold' ? await createFoldModel() : createOrbitModel();
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch (error) { disposeModel(model); throw error; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(model.root);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7c7b91, 2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(-3, 5, 6); scene.add(keyLight);
  const rim = new THREE.DirectionalLight(0xbbc6ff, 2);
  rim.position.set(4, 0, -3); scene.add(rim);

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128; shadowCanvas.height = 128;
  const ctx = shadowCanvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  gradient.addColorStop(0, '#31344c55'); gradient.addColorStop(1, '#31344c00');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, kind === 'fold' ? 0.43 : 4.2), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.55 }));
  shadow.position.set(0, -1.55, kind === 'fold' ? -0.5 : 0);
  if (kind === 'object') shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);

  const current = { ...getPose() };
  const initialShot = current.camera;
  const cameraRig = kind === 'object' && initialShot ? createOrbitCameraRig(initialShot) : null;
  const velocity: SpatialPose = { progress: 0, rx: 0, ry: 0, rz: 0, scale: 0 };
  let frame = 0, lastTime = 0, visible = true, disposed = false, aspect = 1;
  let foldDistance = kind === 'fold' ? foldCameraDistance(aspect) : 0;

  function render(time: number) {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    const dt = (time - (lastTime || time - 16)) / 1000;
    lastTime = time;
    const pose = getPose();
    current.wallpaper = pose.wallpaper;
    let moving = stepSpatialPose(current, velocity, pose, dt, reduced());
    if (cameraRig && pose.camera) {
      retargetOrbitCamera(cameraRig, pose.camera);
      moving = stepOrbitCamera(cameraRig, dt, reduced()) || moving;
      const shot = cameraRig.current;
      const position = orbitCameraPosition(shot, aspect);
      camera.position.set(position.x, position.y, position.z);
      if (Math.abs(camera.fov - shot.fov) > 0.00001) { camera.fov = shot.fov; camera.updateProjectionMatrix(); }
      camera.up.set(0, 1, 0);
      camera.lookAt(shot.aimX, shot.aimY, shot.aimZ);
      camera.rotateZ(shot.roll);
    } else {
      camera.position.set(0, 0.02, foldDistance);
      camera.lookAt(0, -0.02, 0);
    }
    camera.updateMatrixWorld();
    model.update(current, camera);
    shadow.scale.x = kind === 'fold' ? 1 - current.progress * 0.48 : 1;
    renderer.render(scene, camera);
    if (moving) frame = requestAnimationFrame(render);
  }

  function wake() {
    if (!disposed && !frame && visible && !document.hidden) { lastTime = 0; frame = requestAnimationFrame(render); }
  }
  const resize = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (!width || !height) return;
    aspect = width / height;
    if (kind === 'fold') foldDistance = foldCameraDistance(aspect);
    camera.aspect = aspect; camera.updateProjectionMatrix();
    if (kind === 'object') camera.setViewOffset(width, height, -width * ORBIT_FRAME_OFFSET.x, height * ORBIT_FRAME_OFFSET.y, width, height);
    renderer.setSize(width, height); wake();
  });
  resize.observe(host);
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) wake(); });
  intersection.observe(host);
  const visibility = () => { if (!document.hidden) wake(); };
  document.addEventListener('visibilitychange', visibility);
  const contextLost = (event: Event) => { event.preventDefault(); onError(); };
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  wake();

  return {
    wake,
    dispose() {
      disposed = true; cancelAnimationFrame(frame);
      resize.disconnect(); intersection.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      disposeModel(model);
      shadow.geometry.dispose(); shadow.material.dispose(); shadowTexture.dispose();
      environment.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
