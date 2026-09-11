import * as THREE from 'three';
import { CARD_MATERIALS, type CardMaterialId } from './card-material-options';
import { cardCameraSpan, cardDamp, cardFanAdvance, cardFanPose, cardFanRadius, cardFanTarget, cardShadow, cardTurn, CARD_CAMERA_FOV, CARD_TURN_SECONDS } from './card-material-motion';
import { backdropTexture, glassPrintGeometry, glassSurfaceHeight, liquidLens, plushPile, roundedRect } from './card-material-surfaces';
import { createFoilMaterials } from './card-material-foils';

type Settings = { material: CardMaterialId; chip: boolean; reduced: boolean };
export type CardMaterialEngine = { update: (settings: Settings) => void; point: (x: number, y: number) => void; flip: () => void; dispose: () => void };
const WIDTH = 3.4, HEIGHT = 2.14, DEPTH = 0.038;

function extrudedCard(width: number, height: number, radius: number, depth: number, bevel: number) {
  const geometry = new THREE.ExtrudeGeometry(roundedRect(width - bevel * 2, height - bevel * 2, radius), { depth: depth - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 4, steps: 1, curveSegments: 18 });
  geometry.translate(0, 0, -(depth - bevel * 2) / 2);
  return geometry;
}

function seededRandom(seed: number) {
  return () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
}

function textureCanvas(width: number, height: number, draw: (context: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('A 2D canvas is required for the card surface.');
  draw(context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function surfaceGrain(fibrous: boolean) {
  const random = seededRandom(fibrous ? 614 : 419);
  const texture = textureCanvas(512, 512, (ctx) => {
    ctx.fillStyle = '#898989'; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < (fibrous ? 23000 : 54000); i++) {
      const tone = Math.floor(70 + random() * 135);
      ctx.strokeStyle = `rgb(${tone} ${tone} ${tone} / ${fibrous ? 0.48 : 0.7})`;
      ctx.fillStyle = ctx.strokeStyle;
      const x = random() * 512, y = random() * 512;
      if (fibrous) {
        const angle = random() * Math.PI * 2, length = 3 + random() * 13;
        ctx.lineWidth = 0.45 + random() * 0.8;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(angle + 0.5) * length * 0.6, y + Math.sin(angle + 0.5) * length * 0.6, x + Math.cos(angle) * length, y + Math.sin(angle) * length); ctx.stroke();
      } else ctx.fillRect(x, y, 0.7, 0.7);
    }
  });
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1.3);
  return texture;
}

function cardPrint(back: boolean, lightInk: boolean, chip: boolean, pureWhite = false, engraved = false) {
  const fonts = getComputedStyle(document.documentElement);
  const sans = fonts.getPropertyValue('--font-geist-sans') || 'sans-serif';
  const mono = fonts.getPropertyValue('--font-geist-mono') || 'monospace';
  return textureCanvas(1536, 968, (ctx) => {
    const ink = pureWhite ? '#ffffff' : lightInk ? '#f7f7ed' : '#303441';
    ctx.fillStyle = ink;
    ctx.strokeStyle = ink; ctx.lineWidth = 7; ctx.lineJoin = 'round';
    const title = (text: string, x: number, y: number) => engraved ? ctx.strokeText(text, x, y) : ctx.fillText(text, x, y);
    ctx.textBaseline = 'top';
    ctx.font = `500 36px ${mono}`;
    ctx.fillText('MOVE CLUB', 112, 102);
    ctx.textAlign = 'right'; ctx.font = `400 26px ${mono}`;
    ctx.fillText('Nº 016', 1424, 108); ctx.textAlign = 'left';
    if (back) {
      ctx.font = `500 132px ${sans}`;
      title('Made to', 112, 334); title('move.', 112, 472);
      ctx.font = `400 24px ${mono}`; ctx.globalAlpha = pureWhite ? 1 : 0.75;
      ctx.fillText('A STUDY IN MATERIAL AND MOTION.', 112, 798);
      ctx.fillText('MOVE CLUB / STUDY 016', 112, 840);
      // A compact printed registration pattern, not a functioning payment code.
      ctx.globalAlpha = pureWhite ? 1 : 0.8;
      const random = seededRandom(84);
      for (let x = 1178; x < 1420; x += 8) if (random() > 0.35) ctx.fillRect(x, 782, 3 + random() * 4, 85);
    } else {
      ctx.font = `500 195px ${sans}`;
      title('move.', 98, 280);
      ctx.font = `400 24px ${mono}`; ctx.globalAlpha = pureWhite ? 1 : 0.64;
      ctx.fillText(chip ? 'CARDHOLDER' : 'MEMBER', 112, 776);
      ctx.globalAlpha = 1; ctx.font = `500 34px ${sans}`;
      ctx.fillText('Randall Dai', 112, 821);
      ctx.textAlign = 'right'; ctx.font = `400 24px ${mono}`;
      ctx.fillText(chip ? '••••  0016' : 'EST. 2026', 1424, 840);
    }
  });
}

function studioEnvironment() {
  const texture = textureCanvas(1024, 512, (ctx) => {
    const ambient = ctx.createLinearGradient(0, 0, 0, 512);
    ambient.addColorStop(0, '#e5e8f0'); ambient.addColorStop(0.48, '#8b929f'); ambient.addColorStop(1, '#d5d8e1');
    ctx.fillStyle = ambient; ctx.fillRect(0, 0, 1024, 512);
    ctx.filter = 'blur(9px)';
    ctx.fillStyle = '#ffffff'; ctx.fillRect(40, 40, 200, 295); ctx.fillRect(515, 80, 100, 250);
    ctx.fillStyle = '#697382'; ctx.fillRect(315, 0, 88, 440); ctx.fillRect(790, 170, 150, 300);
    ctx.filter = 'blur(3px)'; ctx.fillStyle = '#fff'; ctx.fillRect(730, 20, 22, 320);
  });
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
}

function reflectiveEnvironment() {
  // One broad softbox and its shaded edge, without repeated stripes around the
  // room. A flip sweeps through one continuous reflection instead of flashing.
  const texture = textureCanvas(2048, 1024, (ctx) => {
    ctx.fillStyle = '#bac2cf'; ctx.fillRect(0, 0, 2048, 1024);
    ctx.transform(1, 0, -0.45, 1, 200, 0);
    const panel = ctx.createLinearGradient(0, 0, 2048, 0);
    panel.addColorStop(0, '#bac2cf');
    panel.addColorStop(0.25, '#9ca7b7');
    panel.addColorStop(0.52, '#c4cbd4');
    panel.addColorStop(0.7, '#ffffff');
    panel.addColorStop(0.765, '#ffffff');
    panel.addColorStop(0.81, '#7e8999');
    panel.addColorStop(0.89, '#b1bbc7');
    panel.addColorStop(1, '#bac2cf');
    ctx.fillStyle = panel; ctx.fillRect(-512, 0, 3072, 1024);
  });
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
}

function feltFibers() {
  const random = seededRandom(318);
  const positions: number[] = [], colors: number[] = [];
  const base = new THREE.Color('#8fa180');
  // Keep geometry at the silhouette. The continuous felt map supplies the face
  // so tightly packed subpixel lines cannot turn into sparkling surface noise.
  for (let i = 0; i < 16000; i++) {
    const x = (random() - 0.5) * WIDTH, y = (random() - 0.5) * HEIGHT;
    const qx = Math.abs(x) - (WIDTH / 2 - 0.23), qy = Math.abs(y) - (HEIGHT / 2 - 0.23);
    const dx = Math.max(qx, 0), dy = Math.max(qy, 0);
    const edgeDistance = 0.23 - Math.hypot(dx, dy) - Math.min(Math.max(qx, qy), 0);
    if (edgeDistance < 0 || edgeDistance > 0.075) continue;
    const side = random() > 0.5 ? 1 : -1;
    const bevelT = Math.max(0, 1 - edgeDistance / 0.06);
    const z = side * (0.04 + 0.06 * Math.sqrt(1 - bevelT * bevelT));
    const normal = new THREE.Vector2(Math.sign(x) * dx, Math.sign(y) * dy).normalize();
    const length = 0.012 + random() * 0.035, curl = (random() - 0.5) * length;
    const mid = [x + normal.x * length * 0.55, y + normal.y * length * 0.55, z + side * length * 0.5];
    const tip = [x + normal.x * length * 0.65 - normal.y * curl, y + normal.y * length * 0.65 + normal.x * curl, z + side * length * 0.22];
    const tone = 0.9 + random() * 0.2;
    const rootColor = base.clone().multiplyScalar(tone * 0.9), tipColor = base.clone().multiplyScalar(tone * 1.08);
    positions.push(x, y, z, ...mid, ...mid, ...tip);
    colors.push(rootColor.r, rootColor.g, rootColor.b, tipColor.r, tipColor.g, tipColor.b, tipColor.r, tipColor.g, tipColor.b, tipColor.r, tipColor.g, tipColor.b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.38, depthWrite: false }));
}

export function createCardMaterialScene(host: HTMLElement, initial: Settings, onError: () => void): CardMaterialEngine {
  let settings = initial, disposed = false, visible = true, raf = 0;
  let pointerX = 0, pointerY = 0, tiltX = 0, tiltY = 0;
  let previousTime = 0, idleTime = 0;
  let selectedIndex = CARD_MATERIALS.findIndex(({ id }) => id === initial.material);
  let fanTarget = selectedIndex;
  let fan = { position: fanTarget, velocity: 0 }, fanFrequency = 9;
  let fanRadius = cardFanRadius(cardCameraSpan(1));
  const textures: THREE.Texture[] = [];
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  const stageColor = getComputedStyle(host.closest('.card-material-demo') ?? host).backgroundColor;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(stageColor, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CARD_CAMERA_FOV, 1, 0.1, 50);
  const environment = studioEnvironment(), reflectiveRoom = reflectiveEnvironment(); textures.push(environment, reflectiveRoom);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTarget = pmrem.fromEquirectangular(environment);
  const reflectionTarget = pmrem.fromEquirectangular(reflectiveRoom);
  scene.environment = envTarget.texture;
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight('#fff9f5', '#7a829a', 0.72));
  const key = new THREE.DirectionalLight('#ffffff', 1.15); key.position.set(-3, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight('#dbe1ff', 0.65); rim.position.set(4, 0, -2); scene.add(rim);
  const grain = surfaceGrain(false), feltGrain = surfaceGrain(true); textures.push(grain, feltGrain);
  const foils = createFoilMaterials(reflectionTarget.texture); textures.push(...foils.textures);
  const materials: Record<CardMaterialId, THREE.MeshPhysicalMaterial> = {
    classic: new THREE.MeshPhysicalMaterial({ color: '#474bb5', roughness: 0.38, metalness: 0.03, clearcoat: 0.5, clearcoatRoughness: 0.1, specularIntensity: 0.65, bumpMap: grain, bumpScale: 0.003, envMap: reflectionTarget.texture, envMapIntensity: 0.95 }),
    plush: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 1, metalness: 0, sheen: 0.32, sheenColor: '#fff0f5', sheenRoughness: 1, envMapIntensity: 0.8, specularIntensity: 0 }),
    felt: new THREE.MeshPhysicalMaterial({ color: '#718874', roughness: 1, metalness: 0, sheen: 0.22, sheenColor: '#d5e1bf', sheenRoughness: 1, bumpMap: feltGrain, bumpScale: 0.018, specularIntensity: 0.08, envMapIntensity: 0.7 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0, roughness: 0.008, transmission: 1, thickness: 0.47, ior: 1.5, clearcoat: 0.45, clearcoatRoughness: 0.06, envMap: reflectionTarget.texture, envMapIntensity: 1.35, attenuationDistance: Infinity, dispersion: 0.08, toneMapped: false }),
    mirror: new THREE.MeshPhysicalMaterial({ color: '#f4f5f7', metalness: 1, roughness: 0.065, clearcoat: 0.06, clearcoatRoughness: 0.06, envMap: reflectionTarget.texture, envMapIntensity: 1.05 }),
    gold: foils.gold,
    holo: foils.holo,
  };
  materials.classic.onBeforeCompile = (shader) => {
    // Expose the reflected softbox separately from the diffuse fill so the
    // satin highlight is visible without bleaching the purple base color.
    const reflection = THREE.ShaderChunk.envmap_physical_pars_fragment.replace(
      'return envMapColor.rgb * envMapIntensity;',
      'return envMapColor.rgb * envMapIntensity * 2.4;'
    );
    shader.fragmentShader = shader.fragmentShader.replace('#include <envmap_physical_pars_fragment>', reflection);
  };
  materials.classic.customProgramCacheKey = () => 'card-satin-reflection-v1';
  materials.plush.onBeforeCompile=(shader)=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\nfloat pileLuma=dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722));\ndiffuseColor.rgb=vec3(1.0,0.49,0.64)*(0.68+0.72*pileLuma);');
  };
  materials.plush.customProgramCacheKey=()=> 'plush-continuous-nap-v5';
  materials.glass.onBeforeCompile=(shader)=>{
    // Three's stock screen-space transmission samples at the volume exit. Our
    // fixed backdrop also needs the ray's travel after exiting this convex lens.
    // Amplify its offset from a straight-through ray without changing the card
    // silhouette, camera, surface printing, or reflected studio highlights.
    const transmission=THREE.ShaderChunk.transmission_pars_fragment.replaceAll(
      'vec3 refractedRayExit = position + transmissionRay;',
      `vec3 refractedRayExit = position + transmissionRay;
       vec3 exitNormal=reflect(n,normalize(modelMatrix[2].xyz));
       vec3 exitDirection=refract(normalize(transmissionRay),-exitNormal,ior);
       if(exitDirection.z < -0.02) {
         float travel=(-0.8-refractedRayExit.z)/exitDirection.z;
         if(travel>0.0) {
           refractedRayExit+=exitDirection*min(travel,4.0);
           vec3 straightExit=position-v*((position.z+0.8)/max(v.z,0.02));
           refractedRayExit.xy=mix(straightExit.xy,refractedRayExit.xy,2.4);
         }
       }`
    );
    shader.fragmentShader=shader.fragmentShader.replace('#include <transmission_pars_fragment>',transmission);
  };
  materials.glass.customProgramCacheKey=()=> 'card-strong-refraction-v2';
  const standardGeometry = extrudedCard(WIDTH, HEIGHT, 0.15, DEPTH, 0.012);
  const foilGeometry = standardGeometry.clone();
  const foilUV = foilGeometry.attributes.uv, foilPositions = foilGeometry.attributes.position;
  for (let i = 0; i < foilPositions.count; i++) foilUV.setXY(i, foilPositions.getX(i) / WIDTH + 0.5, foilPositions.getY(i) / HEIGHT + 0.5);
  const feltGeometry = extrudedCard(WIDTH, HEIGHT, 0.17, 0.2, 0.06);
  const feltUV = feltGeometry.attributes.uv, feltPositions = feltGeometry.attributes.position;
  for (let i = 0; i < feltPositions.count; i++) feltUV.setXY(i, feltPositions.getX(i) / WIDTH + 0.5, feltPositions.getY(i) / HEIGHT + 0.5);
  const glassGeometry = liquidLens(roundedRect(WIDTH, HEIGHT, 0.19));
  const plushGeometry = liquidLens(roundedRect(WIDTH, HEIGHT, 0.22));
  const plushUV = plushGeometry.attributes.uv, plushPositions = plushGeometry.attributes.position;
  for (let i=0; i<plushPositions.count; i++) plushUV.setXY(i,plushPositions.getX(i)/WIDTH+0.5,plushPositions.getY(i)/HEIGHT+0.5);
  // Geometry, material maps, and chip contacts are shared; each slot owns its
  // print materials and its local pivot so both cards can be visible in a turn.
  const printGeometry = new THREE.PlaneGeometry(WIDTH, HEIGHT);
  const curvedPrint = glassPrintGeometry();
  const prints = new Map<string, THREE.Texture>();
  const goldArtwork = new THREE.TextureLoader().load('/materials/gold-bird-blossom.png', () => {
    if (disposed) return;
    foils.setGoldArtwork(goldArtwork); wake();
  }, undefined, () => { if (!disposed) onError(); });
  goldArtwork.colorSpace = THREE.SRGBColorSpace; goldArtwork.anisotropy = 4; textures.push(goldArtwork);
  const plush = plushPile(plushGeometry), felt = feltFibers();
  const furTexture = new THREE.TextureLoader().load('/materials/blush-fur.jpg', () => {
    if (disposed) return;
    plush.material.uniforms.uHasFur.value = 1;
    materials.plush.map = furTexture; materials.plush.bumpMap = furTexture; materials.plush.bumpScale = 0.012; materials.plush.needsUpdate = true; wake();
  });
  furTexture.colorSpace = THREE.SRGBColorSpace; furTexture.wrapS = furTexture.wrapT = THREE.RepeatWrapping;
  furTexture.repeat.set(0.72,0.45); furTexture.offset.set(0.1,0.2); furTexture.anisotropy = 4; textures.push(furTexture);
  plush.material.uniforms.uFur.value = furTexture;

  const feltTexture = new THREE.TextureLoader().load('/materials/sage-felt.jpg', () => {
    if (disposed) return;
    materials.felt.map = feltTexture; materials.felt.bumpMap = feltTexture;
    materials.felt.color.set('#ffffff'); materials.felt.needsUpdate = true; wake();
  });
  feltTexture.colorSpace = THREE.SRGBColorSpace;
  feltTexture.wrapS = feltTexture.wrapT = THREE.RepeatWrapping;
  feltTexture.repeat.set(0.8, 0.504); feltTexture.offset.set(0.1, 0.248);
  feltTexture.anisotropy = 4; textures.push(feltTexture);

  const chipGroup = new THREE.Group(); chipGroup.position.set(1.05, -0.12, 0.033);
  const chipMaterial = new THREE.MeshPhysicalMaterial({ color: '#dcca9a', metalness: 1, roughness: 0.16, anisotropy: 0.95, anisotropyRotation: Math.PI / 3, clearcoat: 0.12, envMapIntensity: 1.2, envMap: envTarget.texture, transparent: true });
  chipMaterial.envMapRotation.set(0.2,0.72,0.12);
  const chipMesh = new THREE.Mesh(extrudedCard(0.45, 0.34, 0.055, 0.012, 0.004), chipMaterial); chipGroup.add(chipMesh);
  // Each metal contact has its own brushing direction and slightly tilted normal.
  for (const [index, x] of [-0.15, 0, 0.15].entries()) {
    const contactMaterial=chipMaterial.clone(); contactMaterial.roughness=0.13+index*0.035;
    contactMaterial.anisotropyRotation=index%2===0 ? 0 : Math.PI/2;
    contactMaterial.envMapRotation.y+=index*0.19;
    const contact=new THREE.Mesh(new THREE.PlaneGeometry(index===1 ? 0.142 : 0.105,index===1 ? 0.235 : 0.28),contactMaterial);
    contact.position.set(x,0,0.0065); contact.rotation.y=(index-1)*0.035; chipGroup.add(contact);
  }
  const chipEtching = textureCanvas(450, 340, (ctx) => {
    ctx.strokeStyle = '#615840'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.roundRect(146, 46, 158, 246, 37); ctx.stroke();
    for (const y of [105, 235]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(146, y); ctx.moveTo(304, y); ctx.lineTo(450, y); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(225, 0); ctx.lineTo(225, 46); ctx.moveTo(225, 292); ctx.lineTo(225, 340); ctx.stroke();
    ctx.strokeStyle = '#ffffff36'; ctx.lineWidth = 2;
    for (let x = 4; x < 450; x += 5) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 340); ctx.stroke(); }
  }); textures.push(chipEtching);
  const chipLines = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.34), new THREE.MeshStandardMaterial({ map: chipEtching, transparent: true, metalness: 0.7, roughness: 0.28, depthWrite: false }));
  chipLines.position.z = 0.008; chipGroup.add(chipLines);

  const shadowMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false,
    uniforms: { uOpacity: { value: 0.2 }, uSoftness: { value: 0 }, uColor: { value: new THREE.Color('#41495c') } },
    vertexShader: `
      varying vec2 vShadowUv;
      void main() {
        vShadowUv = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uOpacity, uSoftness;
      uniform vec3 uColor;
      varying vec2 vShadowUv;
      void main() {
        float radius = length(vShadowUv);
        float core = exp(-7.5 * radius * radius);
        float halo = exp(-3.0 * radius * radius);
        // The shadow reaches zero before the plane boundary in every direction.
        float feather = 1.0 - smoothstep(0.65, 0.98, radius);
        float alpha = mix(core, halo, 0.35 + uSoftness * 0.35) * feather * uOpacity;
        gl_FragColor = vec4(uColor, alpha);
        #include <colorspace_fragment>
      }`,
  });
  const colorBackdrop = backdropTexture(stageColor); textures.push(colorBackdrop);
  const backdropPresence = { value: 0 };
  const backdropMaterial = new THREE.MeshBasicMaterial({ map: colorBackdrop, toneMapped: false, depthWrite: false });
  backdropMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uBackdropPresence = backdropPresence;
    shader.uniforms.uStageColor = { value: new THREE.Color(stageColor) };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uBackdropPresence;\nuniform vec3 uStageColor;')
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = mix(uStageColor, diffuseColor.rgb, uBackdropPresence);');
  };
  backdropMaterial.customProgramCacheKey = () => 'card-fan-backdrop-v1';
  const sweep = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 4.5), backdropMaterial);
  sweep.position.z = -0.8; sweep.renderOrder = -10; scene.add(sweep);
  const shadowGeometry = new THREE.PlaneGeometry(1, 1);
  const cards = CARD_MATERIALS.map(({ id }, index) => {
    const holder = new THREE.Group(), card = new THREE.Group();
    holder.add(card); scene.add(holder);
    const geometry = id === 'glass' ? glassGeometry : id === 'plush' ? plushGeometry : id === 'felt' ? feltGeometry : id === 'gold' || id === 'holo' ? foilGeometry : standardGeometry;
    const body = new THREE.Mesh(geometry, materials[id]); card.add(body);
    const inkZ = id === 'glass' || id === 'plush' ? 0 : id === 'felt' ? 0.104 : DEPTH / 2 + 0.004;
    const frontInk = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.96, metalness: 0, depthWrite: false });
    const backInk = frontInk.clone();
    const surface = id === 'glass' || id === 'plush' ? curvedPrint : printGeometry;
    const front = new THREE.Mesh(surface, frontInk), back = new THREE.Mesh(surface, backInk);
    front.position.z = inkZ; back.position.z = -inkZ; back.rotation.y = Math.PI;
    front.visible = back.visible = id !== 'gold'; card.add(front, back);
    if (id === 'plush') card.add(plush);
    if (id === 'felt') card.add(felt);
    const chip = chipGroup.clone(true);
    chip.position.z = (id === 'glass' || id === 'plush' ? glassSurfaceHeight(1.05, -0.12) : inkZ) + 0.015;
    card.add(chip);
    const shadowInk = index === 0 ? shadowMaterial : shadowMaterial.clone();
    const shadow = new THREE.Mesh(shadowGeometry, shadowInk); scene.add(shadow);
    const turnMotion = { angle: 0, fromAngle: 0, targetAngle: 0, elapsed: CARD_TURN_SECONDS };
    return { id, index, holder, card, frontInk, backInk, chip, shadow, shadowInk, turnMotion };
  });

  function applyPrints() {
    for (const { id, frontInk, backInk, chip } of cards) {
      const lightInk = id === 'felt' || id === 'classic' || id === 'plush' || id === 'holo' || id === 'gold';
      const pureWhite = id === 'plush' || id === 'felt', engraved = id === 'gold';
      for (const isBack of [false, true]) {
        const key = `${isBack}-${lightInk}-${settings.chip}-${pureWhite}-${engraved}`;
        if (!prints.has(key)) { const map = cardPrint(isBack, lightInk, settings.chip, pureWhite, engraved); prints.set(key, map); textures.push(map); }
        const ink = isBack ? backInk : frontInk; ink.map = prints.get(key)!; ink.needsUpdate = true;
        ink.emissive.set(pureWhite ? '#ffffff' : '#000000'); ink.toneMapped = !pureWhite;
      }
      if (id === 'gold' || id === 'holo') foils.setPrint(id, frontInk.map!, backInk.map!);
      if (id === 'plush') {
        plush.material.uniforms.uFront.value = frontInk.map; plush.material.uniforms.uBack.value = backInk.map;
        plush.material.uniforms.uChip.value = settings.chip ? 1 : 0;
      }
      chip.visible = settings.chip;
    }
  }
  applyPrints();

  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false); camera.aspect = width / height;
    const verticalSpan = cardCameraSpan(camera.aspect);
    fanRadius = cardFanRadius(verticalSpan);
    camera.position.set(0, 0, verticalSpan / (2 * Math.tan(THREE.MathUtils.degToRad(CARD_CAMERA_FOV / 2))));
    camera.updateProjectionMatrix(); wake();
  }

  function render(now: number) {
    raf = 0;
    if (disposed || !visible || document.hidden) return;
    const dt = Math.min((now - previousTime) / 1000 || 1 / 60, 0.04); previousTime = now;
    const animated = !settings.reduced;
    if (animated) idleTime += dt;
    fan = animated ? cardFanAdvance(fan, fanTarget, dt, fanFrequency) : { position: fanTarget, velocity: 0 };
    const fanMoving = Math.abs(fan.position - fanTarget) > 0.0003 || Math.abs(fan.velocity) > 0.002;
    tiltX = cardDamp(tiltX, animated ? pointerY * 0.14 : 0, dt);
    tiltY = cardDamp(tiltY, animated ? pointerX * 0.22 : 0, dt);
    const drift = animated ? Math.sin(idleTime * 1.3) : 0;
    let turning = false;
    for (const { index, id, holder, card, shadow, shadowInk, turnMotion } of cards) {
      // Each physical card remembers its own side. A flip requested in transit
      // waits for this card to arrive; neighboring cards keep their own poses.
      if (turnMotion.elapsed < CARD_TURN_SECONDS) {
        if (!animated) turnMotion.elapsed = CARD_TURN_SECONDS;
        else if (turnMotion.elapsed > 0 || (!fanMoving && index === selectedIndex)) turnMotion.elapsed = Math.min(CARD_TURN_SECONDS, turnMotion.elapsed + dt);
        turning ||= turnMotion.elapsed > 0 && turnMotion.elapsed < CARD_TURN_SECONDS;
      }
      const turn = cardTurn(turnMotion.elapsed / CARD_TURN_SECONDS);
      turnMotion.angle = turnMotion.fromAngle + (turnMotion.targetAngle - turnMotion.fromAngle) * turn.turn;
      const pose = cardFanPose(index, fan.position, cards.length, fanRadius);
      holder.position.set(pose.x, pose.y - 0.04, 0);
      holder.rotation.z = pose.roll;
      card.position.y = (turn.lift + drift * 0.025) * pose.focus;
      card.rotation.set(pose.pitch - 0.13 + (tiltX + turn.pitch) * pose.focus,
        turnMotion.angle - 0.16 + (tiltY + (animated ? Math.sin(idleTime * 0.8) * 0.025 : 0)) * pose.focus,
        (-0.025 + turn.bank + drift * 0.008) * pose.focus, 'YXZ');
      card.scale.setScalar(1 + (turn.scale - 1) * pose.focus);
      const footprint = cardShadow(holder.position.x, holder.position.y + card.position.y,
        card.rotation.y, card.rotation.x, pose.roll + card.rotation.z, card.scale.x);
      shadow.position.set(footprint.x, footprint.y, -0.4);
      shadow.scale.set(footprint.width, footprint.depth, 1); shadow.rotation.z = footprint.rotation;
      shadowInk.uniforms.uOpacity.value = footprint.opacity * pose.focus * (id === 'glass' ? 0.65 : 1);
      shadowInk.uniforms.uSoftness.value = footprint.softness;
    }
    // Keep refraction attached to the display area; its color field comes in
    // gradually with the glass card instead of popping on material selection.
    const glassIndex = cards.findIndex(({ id }) => id === 'glass');
    backdropPresence.value = cardFanPose(glassIndex, fan.position, cards.length).focus;
    sweep.visible = backdropPresence.value > 0.002;
    renderer.render(scene, camera);
    if (animated || fanMoving || turning || Math.abs(tiltX) + Math.abs(tiltY) > 0.0001) raf = requestAnimationFrame(render);
  }
  function wake() { if (!disposed && !raf && visible && !document.hidden) { previousTime = performance.now(); raf = requestAnimationFrame(render); } }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host); resize();
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) wake(); else { cancelAnimationFrame(raf); raf = 0; } }); intersection.observe(host);
  const visibility = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else wake(); };
  document.addEventListener('visibilitychange', visibility);
  const contextLost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(raf); raf = 0; onError(); };
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  return {
    update(next) {
      if (next.material !== settings.material) {
        selectedIndex = CARD_MATERIALS.findIndex(({ id }) => id === next.material);
        fanTarget = cardFanTarget(selectedIndex, fanTarget, cards.length);
        fanFrequency = 9 / (1 + Math.abs(fanTarget - fan.position) * 0.055);
        pointerX = pointerY = 0;
      }
      const chipChanged = next.chip !== settings.chip;
      settings = next;
      if (chipChanged) applyPrints();
      wake();
    },
    point(x, y) { pointerX = x; pointerY = y; wake(); },
    flip() {
      // Retarget from the rendered angle, so rapid clicks never snap backwards.
      const turn = cards[selectedIndex].turnMotion;
      turn.fromAngle = turn.angle; turn.targetAngle += Math.PI; turn.elapsed = 0; wake();
    },
    dispose() {
      disposed = true; cancelAnimationFrame(raf); resizeObserver.disconnect(); intersection.disconnect();
      document.removeEventListener('visibilitychange', visibility); renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      const geometries = new Set<THREE.BufferGeometry>([standardGeometry, foilGeometry, feltGeometry, glassGeometry, plushGeometry, printGeometry, curvedPrint]), usedMaterials = new Set<THREE.Material>(Object.values(materials));
      scene.traverse((object) => { if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) { geometries.add(object.geometry); (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => usedMaterials.add(material)); } });
      geometries.forEach((geometry) => geometry.dispose()); usedMaterials.forEach((material) => material.dispose()); textures.forEach((texture) => texture.dispose());
      envTarget.dispose(); reflectionTarget.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
