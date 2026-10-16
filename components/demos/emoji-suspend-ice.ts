import * as THREE from 'three';

function randomSequence(seed: number) {
  let value = seed >>> 0;
  return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
}

export function createIceDetails() {
  const group = new THREE.Group(), random = randomSequence(42);
  // Small, tapered pores with a freezing direction, rather than blue rings.
  // These opaque fragments are visible in Three's transmission source pass.
  const poreGeometry = new THREE.SphereGeometry(1, 16, 12);
  const positions = poreGeometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i), taper = .78 + .22 * y;
    positions.setXYZ(i, positions.getX(i) * taper + .08 * (1 - y * y), y, positions.getZ(i) * taper);
  }
  poreGeometry.computeVertexNormals();
  const poreMaterial = new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vNormal, vEye;
      void main() {
        vec3 n = normal;
        mat3 basis = mat3(instanceMatrix);
        n /= vec3(dot(basis[0], basis[0]), dot(basis[1], basis[1]), dot(basis[2], basis[2]));
        vNormal = normalize(normalMatrix * basis * n);
        vec4 p = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        vEye = normalize(-p.xyz); gl_Position = projectionMatrix * p;
      }`,
    fragmentShader: `varying vec3 vNormal, vEye;
      void main() {
        vec3 n = normalize(vNormal);
        float edge = 1.0 - abs(dot(n, normalize(vEye)));
        if (edge < .56) discard;
        float glint = pow(max(0.0, dot(n, normalize(vec3(-.55,.8,.5)))), 5.0);
        vec3 color = mix(vec3(.38,.42,.45), vec3(.91,.95,.96), glint + .38 * smoothstep(.84,1.,edge));
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const count = 680, pores = new THREE.InstancedMesh(poreGeometry, poreMaterial, count), transform = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const clustered = i > 100;
    const size = clustered ? .0035 + random() ** 2 * .008 : .003 + random() ** 3 * .017;
    if (clustered) {
      const angle = random() * Math.PI * 2, radius = Math.sqrt(random());
      transform.position.set(.58 + Math.cos(angle) * radius * .34, -.76 + Math.sin(angle) * radius * .26, (random() - .5) * .4);
    } else transform.position.set((random() - .5) * 2.12, (random() - .5) * 2.14, (random() - .5) * .88);
    transform.scale.set(size, size * (1.2 + random() * 2.1), size * (.7 + random() * .3));
    transform.rotation.set((random() - .5) * .3, random() * Math.PI, (random() - .5) * .45);
    transform.updateMatrix(); pores.setMatrixAt(i, transform.matrix);
  }
  pores.instanceMatrix.needsUpdate = true; group.add(pores);

  // Thin fracture planes taper and branch at sharp changes in direction.
  // Their broken reflection stays local to the corners, leaving the core clear.
  const cracks: THREE.BufferGeometry[] = [];
  const crackMaterial = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; void main() {
      float grain = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898,78.233))) * 43758.5453);
      float thin = pow(1.0 - abs(vUv.y * 2.0 - 1.0), 3.0);
      if (grain > thin * .58) discard;
      gl_FragColor = vec4(vec3(.44,.49,.52),1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const crack = (points: number[][], width: number) => {
    const vertices: number[] = [], uv: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = new THREE.Vector3(...points[i] as [number, number, number]);
      const b = new THREE.Vector3(...points[i + 1] as [number, number, number]);
      const across = new THREE.Vector3(-(b.y - a.y), b.x - a.x, .12).normalize();
      const wa = width * (1 - i / points.length), wb = width * (1 - (i + 1) / points.length);
      const corners = [a.clone().addScaledVector(across, wa), a.clone().addScaledVector(across, -wa), b.clone().addScaledVector(across, wb), b.clone().addScaledVector(across, -wb)];
      for (const k of [0,1,2,2,1,3]) { vertices.push(...corners[k].toArray()); uv.push(k < 2 ? i / points.length : (i + 1) / points.length, k % 2); }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    cracks.push(geometry); group.add(new THREE.Mesh(geometry, crackMaterial));
  };
  crack([[1.12,1.02,.27],[.99,.97,.34],[.94,.81,.38],[.79,.72,.39],[.77,.59,.41]], .006);
  crack([[.94,.81,.38],[1.05,.76,.33],[1.12,.63,.3]], .003);
  crack([[-1.12,-.66,.27],[-.97,-.72,.34],[-.98,-.89,.35],[-.85,-1.01,.32]], .005);
  crack([[-.97,-.72,.34],[-.8,-.74,.37],[-.71,-.86,.37]], .0025);

  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#797979'; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) {
    const x = random() * 512, y = random() * 512, radius = 8 + random() * 22;
    const gradient = ctx.createRadialGradient(x,y,0,x,y,radius);
    gradient.addColorStop(0, `rgba(210,210,210,${.08 + random() * .18})`); gradient.addColorStop(1,'rgba(210,210,210,0)');
    ctx.fillStyle = gradient; ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
  }
  for (const [x,y,radius] of [[78,94,90],[392,421,110],[432,128,44]]) {
    const gradient = ctx.createRadialGradient(x,y,0,x,y,radius);
    gradient.addColorStop(0,'#e3e3e3'); gradient.addColorStop(.45,'#aaa'); gradient.addColorStop(1,'#797979');
    ctx.fillStyle = gradient; ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
  }
  for (let i = 0; i < 6000; i++) {
    const shade = 105 + Math.floor(random() * 65); ctx.fillStyle = `rgba(${shade},${shade},${shade},.13)`;
    ctx.fillRect(random() * 512, random() * 512, .7 + random(), .7 + random());
  }
  const frostMap = new THREE.CanvasTexture(canvas);
  const neutralMap = new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1); neutralMap.needsUpdate = true;
  return { group, frostMap, neutralMap, dispose: () => { poreGeometry.dispose(); poreMaterial.dispose(); pores.dispose(); crackMaterial.dispose(); cracks.forEach(v => v.dispose()); frostMap.dispose(); neutralMap.dispose(); } };
}
