import * as THREE from 'three';

const ART_WIDTH = 1536, ART_HEIGHT = 968;

function canvas() {
  const element = document.createElement('canvas');
  element.width = ART_WIDTH; element.height = ART_HEIGHT;
  const context = element.getContext('2d');
  if (!context) throw new Error('A 2D canvas is required for foil artwork.');
  return { element, context };
}

function texture(element: HTMLCanvasElement, color = false) {
  const result = new THREE.CanvasTexture(element);
  result.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  result.anisotropy = 4;
  return result;
}

function foilArtwork() {
  const artwork = canvas(), ctx = artwork.context, subject = canvas(), gem = subject.context;
  const holoMask = canvas(), finish = holoMask.context;
  finish.fillStyle = '#000'; finish.fillRect(0, 0, ART_WIDTH, ART_HEIGHT);
  const base = ctx.createLinearGradient(0, 0, ART_WIDTH, ART_HEIGHT);
  base.addColorStop(0, '#101a35'); base.addColorStop(0.52, '#1d3055'); base.addColorStop(1, '#111c39');
  ctx.fillStyle = base; ctx.fillRect(0, 0, ART_WIDTH, ART_HEIGHT);
  const halo = ctx.createRadialGradient(1070, 450, 30, 1070, 450, 510);
  halo.addColorStop(0, '#4788aa70'); halo.addColorStop(0.5, '#52678c40'); halo.addColorStop(1, '#52678c00');
  ctx.fillStyle = halo; ctx.fillRect(0, 0, ART_WIDTH, ART_HEIGHT);
  // A separate, frameless composition: a cut crystal on a quiet technical grid.
  ctx.strokeStyle = '#a6bfd018'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath(); ctx.moveTo(730 + i * 75, 150); ctx.lineTo(430 + i * 135, 780); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(690, 235 + i * 78); ctx.lineTo(1410, 120 + i * 106); ctx.stroke();
  }
  type Point = [number, number];
  const a: Point = [1125, 145], b: Point = [1380, 322], c: Point = [1215, 735];
  const d: Point = [925, 805], e: Point = [765, 520], f: Point = [864, 297], center: Point = [1080, 430];
  const facets: { points: Point[]; colors: [string, string]; foil: string }[] = [
    { points: [a, b, center], colors: ['#b5d6e3', '#6888b2'], foil: '#bd' },
    { points: [b, c, center], colors: ['#617db6', '#233d73'], foil: '#83' },
    { points: [c, d, center], colors: ['#78b5ca', '#427698'], foil: '#de' },
    { points: [d, e, center], colors: ['#7279ad', '#3a528d'], foil: '#ac' },
    { points: [e, f, center], colors: ['#3c6794', '#80bccd'], foil: '#e7' },
    { points: [f, a, center], colors: ['#729cad', '#c2dce5'], foil: '#9a' },
  ];
  for (const { points, colors, foil } of facets) {
    const shade = ctx.createLinearGradient(points[0][0], points[0][1], center[0], center[1]);
    shade.addColorStop(0, colors[0]); shade.addColorStop(1, colors[1]);
    for (const target of [gem, finish]) {
      target.beginPath(); target.moveTo(...points[0]);
      for (const point of points.slice(1)) target.lineTo(...point);
      target.closePath();
      target.fillStyle = target === gem ? shade : `#${foil.slice(1).repeat(3)}`;
      target.fill();
      target.strokeStyle = target === gem ? '#c4e1ec70' : '#ffffff'; target.lineWidth = 2.5; target.stroke();
    }
  }
  // A narrow inset facet gives the printed crystal depth without a second border.
  gem.fillStyle = '#142c5b'; gem.beginPath(); gem.moveTo(1080, 430);
  gem.lineTo(1170, 334); gem.lineTo(1158, 578); gem.closePath(); gem.fill();
  gem.strokeStyle = '#badde6'; gem.lineWidth = 3;
  gem.beginPath(); gem.moveTo(1125, 145); gem.lineTo(1080, 430); gem.lineTo(925, 805); gem.stroke();
  ctx.strokeStyle = '#a8c9d066'; ctx.lineWidth = 2;
  for (const [x, y, direction] of [[68, 68, 1], [1468, 900, -1]]) {
    ctx.beginPath(); ctx.moveTo(x, y + direction * 38); ctx.lineTo(x, y); ctx.lineTo(x + direction * 38, y); ctx.stroke();
  }
  return { holoMask: texture(holoMask.element), artwork: texture(artwork.element, true), subject: texture(subject.element, true) };
}

const foilVaryings = `
  varying vec2 vFoilUv;
  varying vec3 vFoilNormal, vFoilTangent, vFoilBitangent;
  varying float vFoilSide;
`;

const foilFragment = `
  uniform sampler2D uFoilMask, uFoilFront, uFoilBack, uHoloSubject, uGoldArtwork;
  ${foilVaryings}
`;

const foilSamples = `
  vec2 foilUv = vec2(mix(1.0 - vFoilUv.x, vFoilUv.x, vFoilSide), vFoilUv.y);
  float ornament = texture2D(uFoilMask, foilUv).r;
  float lettering = mix(texture2D(uFoilBack, foilUv).a, texture2D(uFoilFront, foilUv).a, vFoilSide);
  float engravingMask = max(ornament, lettering);
  vec3 foilView = normalize(vViewPosition);
  vec3 foilReflection = reflect(-foilView, normalize(vFoilNormal));
`;

export function createFoilMaterials(environment: THREE.Texture) {
  const maps = foilArtwork();
  const emptyArtwork = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  emptyArtwork.needsUpdate = true;
  const inkUniforms = () => ({
    uFoilFront: { value: null as THREE.Texture | null },
    uFoilBack: { value: null as THREE.Texture | null },
  });
  const prints = { gold: inkUniforms(), holo: inkUniforms() };
  const uniforms = {
    uGoldArtwork: { value: emptyArtwork as THREE.Texture },
  };
  const gold = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', metalness: 0.96, roughness: 0.34,
    clearcoat: 0.12, clearcoatRoughness: 0.2, envMap: environment, envMapIntensity: 1.15,
    bumpMap: emptyArtwork, bumpScale: 0.035,
  });
  const holo = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', map: maps.artwork, metalness: 0.12, roughness: 0.4,
    clearcoat: 0.5, clearcoatRoughness: 0.13, envMap: environment, envMapIntensity: 0.65,
  });
  for (const [kind, material] of [['gold', gold], ['holo', holo]] as const) {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms, prints[kind]);
      shader.uniforms.uFoilMask = { value: kind === 'gold' ? emptyArtwork : maps.holoMask };
      shader.uniforms.uHoloSubject = { value: maps.subject };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${foilVaryings}`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vFoilUv = uv;
          vFoilNormal = normalize(normalMatrix * normal);
          vFoilTangent = normalize(normalMatrix * vec3(1.0, 0.0, 0.0));
          vFoilBitangent = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));
          vFoilSide = step(0.0, position.z);
        `);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${foilFragment}`)
        .replace('#include <map_fragment>', kind === 'gold' ? `${foilSamples}
          // The artwork supplies a relief mask, never a black printed backdrop.
          // Both the empty ground and the raised flower-and-bird motif remain gold.
          float goldLuma = dot(texture2D(uGoldArtwork, foilUv).rgb, vec3(0.2126, 0.7152, 0.0722));
          ornament = smoothstep(0.006, 0.025, goldLuma);
          float goldDetail = pow(clamp(goldLuma * 1.6, 0.0, 1.0), 0.7);
          engravingMask = max(ornament, lettering);
          float goldRelief = max(ornament * (0.2 + goldDetail * 0.8), lettering * 0.45);
          vec3 goldGround = vec3(0.72, 0.48, 0.12);
          vec3 goldPetals = mix(vec3(0.32, 0.16, 0.027), vec3(0.97, 0.77, 0.33), goldDetail);
          diffuseColor.rgb *= mix(goldGround, goldPetals, ornament);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.52, 0.30, 0.065), lettering);
        ` : `${foilSamples}
          // Type stays on the card; the crystal and recessed backdrop have
          // opposing parallax. Clamp the view ray near the edge of a flip.
          vec2 viewShift = vec2(dot(foilView, vFoilTangent) * (vFoilSide * 2.0 - 1.0), dot(foilView, vFoilBitangent));
          viewShift = clamp(viewShift / max(abs(dot(foilView, normalize(vFoilNormal))), 0.35), vec2(-0.75), vec2(0.75));
          vec2 subjectUv = foilUv - viewShift * vec2(0.078, 0.124);
          vec2 backgroundUv = foilUv + viewShift * vec2(0.015, 0.024);
          vec4 crystal = texture2D(uHoloSubject, subjectUv);
          vec3 backgroundColor = texture2D(map, backgroundUv).rgb;
          vec2 shadowUv = subjectUv + vec2(0.023, 0.027);
          float crystalShadow = (texture2D(uHoloSubject, shadowUv + vec2(0.008, 0.0)).a
            + texture2D(uHoloSubject, shadowUv - vec2(0.008, 0.0)).a
            + texture2D(uHoloSubject, shadowUv + vec2(0.0, 0.012)).a
            + texture2D(uHoloSubject, shadowUv - vec2(0.0, 0.012)).a) * 0.25;
          backgroundColor *= 1.0 - crystalShadow * 0.32;
          diffuseColor.rgb *= mix(backgroundColor, crystal.rgb, crystal.a);
          ornament = texture2D(uFoilMask, subjectUv).r * crystal.a;
        `);
      if (kind === 'gold') {
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
            roughnessFactor = mix(0.34, mix(0.3, 0.19, goldDetail), engravingMask);
          `)
          .replace('#include <normal_fragment_maps>', `
            normal = perturbNormalArb(-vViewPosition, normal, vec2(dFdx(goldRelief), dFdy(goldRelief)) * bumpScale, faceDirection);
          `)
          .replace('#include <opaque_fragment>', `
            // Feather and petal relief interrupt one broad, angle-driven reflection.
            float goldPosition = foilUv.x + foilUv.y * 0.45 + foilReflection.x * 2.4 + foilReflection.y * 1.2 + goldRelief * 0.045;
            float goldGlint = exp(-pow((goldPosition - 0.46) / 0.2, 2.0));
            outgoingLight += vec3(1.0, 0.76, 0.34) * goldGlint * engravingMask * (0.18 + goldDetail * 0.85);
            #include <opaque_fragment>
          `);
      } else {
        shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
          // The finish is locked to viewing direction, never to a time loop.
          // A local spectral band appears at oblique angles and leaves the ink intact.
          float holoPosition = foilUv.x + foilUv.y * 0.36 + foilReflection.x * 1.75 - foilReflection.y * 0.6;
          float holoBand = exp(-pow((holoPosition - 0.6) / 0.23, 2.0));
          float angleGate = smoothstep(0.07, 0.27, abs(foilReflection.x + 0.2) + abs(foilReflection.y - 0.12) * 0.4);
          float hue = foilUv.x * 0.9 + foilUv.y * 0.4 + foilReflection.x * 0.75 + foilReflection.y * 0.55 + ornament * 0.12;
          vec3 spectrum = 0.5 + 0.5 * cos(6.2831853 * (hue + vec3(0.0, 0.333, 0.667)));
          float foilLight = holoBand * angleGate * (0.12 + ornament * 0.88) * (1.0 - lettering);
          outgoingLight += spectrum * foilLight * 0.9;
          outgoingLight += vec3(0.78, 0.9, 1.0) * pow(holoBand, 5.0) * angleGate * ornament * 0.15;
          #include <opaque_fragment>
        `);
      }
    };
    material.customProgramCacheKey = () => `card-${kind}-foil-v4`;
  }
  return {
    gold, holo,
    textures: [emptyArtwork, maps.holoMask, maps.artwork, maps.subject],
    setGoldArtwork(artwork: THREE.Texture) {
      uniforms.uGoldArtwork.value = artwork;
    },
    setPrint(kind: 'gold' | 'holo', front: THREE.Texture, back: THREE.Texture) {
      prints[kind].uFoilFront.value = front; prints[kind].uFoilBack.value = back;
    },
  };
}
