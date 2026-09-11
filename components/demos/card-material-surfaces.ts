import * as THREE from 'three';

const W = 3.4, H = 2.14;
export const PLUSH_PILE_DEPTH = 0.032;

export function roundedRect(width: number, height: number, radius: number) {
  const shape = new THREE.Shape(), x = -width / 2, y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

/** Closed, smoothly curved volume. The front is a lens, not a flat extruded face. */
export function liquidLens(shape: THREE.Shape) {
  const outline = shape.getSpacedPoints(160);
  const positions: number[] = [], uv: number[] = [], indices: number[] = [];
  const rings = 64, count = outline.length;
  for (let row = 0; row <= rings; row++) {
    const phi = Math.PI * row / rings, r = Math.sin(phi);
    const z = 0.235 * Math.sign(Math.cos(phi)) * Math.abs(Math.cos(phi)) ** 0.55;
    for (const point of outline) {
      positions.push(point.x * r, point.y * r, z);
      uv.push(point.x * r / W + 0.5, point.y * r / H + 0.5);
    }
  }
  for (let row = 0; row < rings; row++) for (let i = 0; i < count - 1; i++) {
    const a = row * count + i, b = a + count;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function glassSurfaceHeight(x: number, y: number) {
  const r = Math.max(Math.abs(x) / (W / 2), Math.abs(y) / (H / 2));
  return 0.235 * Math.max(0, 1 - r * r) ** 0.275;
}

export function glassPrintGeometry() {
  const geometry = new THREE.PlaneGeometry(W, H, 64, 40);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, glassSurfaceHeight(p.getX(i), p.getY(i)) + 0.007);
  geometry.computeVertexNormals();
  return geometry;
}

/** A shallow, continuous nap feathers the silhouette without loose hairs. */
export function plushPile(surface: THREE.BufferGeometry) {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setIndex(surface.index!.clone());
  for (const name of ['position', 'normal', 'uv']) geometry.setAttribute(name, surface.attributes[name].clone());
  const layers = 8;
  geometry.setAttribute('aLayer', new THREE.InstancedBufferAttribute(Float32Array.from({ length: layers }, (_, i) => (i + 1) / layers), 1));
  geometry.instanceCount = layers;
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2.1);
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uFront: { value: null }, uBack: { value: null }, uFur: { value: null }, uHasFur: { value: 0 }, uChip: { value: 0 }, uDepth: { value: PLUSH_PILE_DEPTH } },
    vertexShader: `
      attribute float aLayer;
      uniform float uDepth;
      varying vec2 vUv;
      varying vec3 vNormal, vView, vLocal;
      varying float vLayer, vSide;
      void main() {
        vec3 raised = position + normal * uDepth * aLayer;
        vec4 viewPosition = modelViewMatrix * vec4(raised, 1.0);
        vUv = uv; vLocal = position;
        vNormal = normalize(normalMatrix * normal); vView = -viewPosition.xyz;
        vLayer = aLayer; vSide = step(0.0, position.z);
        gl_Position = projectionMatrix * viewPosition;
      }`,
    fragmentShader: `
      uniform sampler2D uFront, uBack, uFur;
      uniform float uHasFur, uChip;
      varying vec2 vUv;
      varying vec3 vNormal, vView, vLocal;
      varying float vLayer, vSide;
      void main() {
        // All layers share the face's combed texture, with no random particles.
        vec2 furUv = vUv * vec2(0.72, 0.45) + vec2(0.1, 0.2);
        vec3 fur = texture2D(uFur, furUv).rgb;
        float luma = mix(0.5, dot(fur, vec3(0.2126, 0.7152, 0.0722)), uHasFur);
        float height = clamp(0.22 + luma * 1.25, 0.0, 1.0);
        float coverage = smoothstep(vLayer - 0.2, vLayer + 0.2, height);
        float ink = mix(texture2D(uBack, vec2(1.0 - vUv.x, vUv.y)).a, texture2D(uFront, vUv).a, vSide);
        float chip = (1.0 - smoothstep(0.205, 0.26, abs(vLocal.x - 1.05)))
                   * (1.0 - smoothstep(0.15, 0.2, abs(vLocal.y + 0.12))) * uChip * vSide;
        float alpha = coverage * pow(1.0 - vLayer, 0.7) * 0.2 * (1.0 - max(ink, chip)) * uHasFur;
        vec3 N = normalize(vNormal), V = normalize(vView);
        float diffuse = 1.0 + 0.2 * max(0.0, dot(N, normalize(vec3(-0.5, 0.8, 1.2))));
        vec3 color = vec3(1.0, 0.49, 0.64) * (0.68 + 0.72 * luma) * diffuse;
        color = mix(color, vec3(1.0, 0.76, 0.84), pow(1.0 - abs(dot(N, V)), 3.0) * 0.12);
        gl_FragColor = vec4(color, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material); mesh.frustumCulled = false;
  return mesh;
}

export function backdropTexture(background: string) {
  const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 800;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = background; ctx.fillRect(0, 0, 1280, 800);
  // Spread the same Color composition beyond the card, leaving unbent contours
  // visible around the lens while keeping the card's framing unchanged.
  ctx.fillStyle = '#7179de'; ctx.beginPath(); ctx.arc(440, 315, 160, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f58965'; ctx.beginPath(); ctx.roundRect(665, 380, 300, 220, 34); ctx.fill();
  ctx.fillStyle = '#e9c750'; ctx.beginPath(); ctx.arc(895, 225, 95, 0, Math.PI * 2); ctx.fill();
  // Fade to the exact stage color so the finite plane has no visible rectangle.
  const fade = ctx.createRadialGradient(640, 400, 275, 640, 400, 510);
  const fadeColor = `#${new THREE.Color(background).getHexString()}`;
  fade.addColorStop(0, `${fadeColor}00`); fade.addColorStop(0.72, `${fadeColor}60`); fade.addColorStop(1, fadeColor);
  ctx.fillStyle=fade;ctx.fillRect(0,0,1280,800);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  return texture;
}
