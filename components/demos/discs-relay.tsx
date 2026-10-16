'use client';

import { useEffect, useRef, useState } from 'react';
import { RELAY_DURATION, RELAY_CARD_DURATION, RELAY_STAGGER, RELAY_SPEEDS, RELAY_TAU as TAU, relayClamp as clamp, relayLerp as lerp, relayCadence, relayNearestAngle, relayCircle, relayWave, RELAY_BURST_DURATION, RELAY_BURST_TURN, relayBurstProgress, relayBurstVelocity } from './discs-relay-motion';
import type { AcrylicPose, createAcrylicRenderer } from './discs-relay-acrylic';
import { RELAY_DEFAULT_PALETTE, RELAY_PALETTES } from './discs-relay-palettes';
import './discs-relay.css';

type Mode = 0 | 1 | 2;
type Pose = { angle: number; y: number; rx: number; ry: number; rz: number };
const modes = [
  { label: 'Ring', note: 'Rotate the discs together in a tight ring.' },
  { label: 'Depth', note: 'Move through a wave with shifting focus.' },
  { label: 'Spread', note: 'Lay the discs flat and keep them turning.' },
];
function pose(mode: Mode, i: number): Pose {
  // Keep the eight continuing sheets near their new slots. Redistributing
  // eight consecutive slots over a whole orbit added a second, abrupt rush.
  const ringSlot = i < 8 ? Math.floor(i / 2) * 3 + i % 2 : (i - 8) * 3 + 2;
  const angle = (mode === 0 ? ringSlot / 12 : (i % 8) / 8) * TAU - Math.PI / 2;
  if (mode === 0) return { angle, y: 0, rx: 0, ry: angle + Math.PI / 2, rz: 0 };
  if (mode === 1) return { angle, y: 0, rx: 0, ry: Math.sin(angle) * .12, rz: 0 };
  return { angle, y: 54, rx: Math.PI / 2, ry: Math.sin(angle) * .12, rz: 0 };
}
function setting(mode: Mode) {
  return { tilt: mode === 2 ? -.62 : mode === 1 ? 0 : -.20, scale: mode === 2 ? .95 : mode === 1 ? 1.12 : 1.14, y: mode === 2 ? -32 : -8, depth: mode === 1 ? 1 : 0, flat: mode === 2 ? 1 : 0, radius: mode === 0 ? 102 : 172 };
}

function RelayStudy({ paletteId }: { paletteId: string }) {
  const colors = (RELAY_PALETTES.find(item => item.id === paletteId) ?? RELAY_PALETTES[0]).colors;
  const colorRef = useRef(colors);
  colorRef.current = colors;
  const root = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const discs = useRef<(HTMLDivElement | null)[]>([]);
  const [mode, setMode] = useState<Mode>(0);
  const [automatic, setAutomatic] = useState(true);
  const [reduced, setReduced] = useState(false);
  const controls = useRef({ mode: 0 as Mode, automatic: true });
  controls.current = { mode, automatic };

  useEffect(() => {
    const host = root.current, group = world.current;
    if (!host || !group) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduce = media.matches, visible = true, dirty = true;
    setReduced(reduce);
    const preference = () => { reduce = media.matches; dirty = true; setReduced(reduce); };
    media.addEventListener('change', preference);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; dirty = true; }, { threshold: .05 });
    intersection.observe(host);
    let size = 1;
    const resize = new ResizeObserver(([entry]) => {
      size = Math.max(.1, Math.min((entry.contentRect.width - 32) / 530, (entry.contentRect.height - 112) / 310, 1.5));
      dirty = true;
    });
    resize.observe(host);
    let disposed = false;
    let acrylic: ReturnType<typeof createAcrylicRenderer> | null = null;
    const drawPoses: AcrylicPose[] = colors.map(() => ({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, scale: 1, opacity: 1 }));
    void import('./discs-relay-acrylic').then(({ createAcrylicRenderer }) => {
      if (disposed || !scene.current) return;
      try {
        acrylic = createAcrylicRenderer(scene.current, colorRef.current, () => { acrylic?.dispose(); acrylic = null; host.dataset.renderer = 'css'; dirty = true; }, () => { dirty = true; });
        dirty = true;
      } catch { acrylic?.dispose(); acrylic = null; host.dataset.renderer = 'css'; dirty = true; }
    }).catch(() => { if (!disposed) host.dataset.renderer = 'css'; });
    const views = discs.current.map(element => ({ element, faces: [...(element?.querySelectorAll<HTMLElement>('.dr-face') ?? [])], transform: '', opacity: '', filter: '' }));
    const current = colors.map((_, i) => pose(0, i));
    let from = current.map(p => ({ ...p })), target = current.map(p => ({ ...p }));
    let config = setting(0), configFrom = { ...config }, configTo = { ...config };
    let baseTurn = .28, burst = 0, burstTarget = 0, burstEntry = 0, speed: number = RELAY_SPEEDS[0];
    let lastColors: readonly string[] | null = null;
    let active: Mode = 0, transitionTime = 10, hold = 0;
    let boosting = false;
    let worldTransform = '', previous = performance.now(), frame = 0;
    const renderedYaw = current.map(p => p.ry + baseTurn);
    let yawFrom = [...renderedYaw], yawOffset = colors.map(() => 0);
    const diagnostics = process.env.NODE_ENV !== 'production' && new URLSearchParams(window.location.search).has('profile');
    let profile: { gaps: number[]; costs: number[]; mode: Mode } | null = null;

    function draw(now: number) {
      frame = requestAnimationFrame(draw);
      const rawDelta = now - previous;
      const dt = Math.min(rawDelta / 1000, .1);
      previous = now;
      const state = controls.current;
      const running = visible && !document.hidden && !reduce;
      const changed = state.mode !== active;
      const paletteChanged = lastColors !== colorRef.current;
      if (!running && !dirty && !changed && !paletteChanged) return;
      if (paletteChanged && acrylic) { acrylic.setColors(colorRef.current); lastColors = colorRef.current; }
      const started = performance.now();
      dirty = false;
      if (changed) {
        const liveBoost = burstTarget * relayBurstVelocity(transitionTime, burstEntry);
        boosting = !reduce;
        active = state.mode;
        // Carry the live orbital phase and velocity through every interruption.
        baseTurn += burst; burst = 0;
        from = current.map(p => ({ ...p }));
        target = colors.map((_, i) => { const p = pose(active, i); p.angle = relayNearestAngle(p.angle, from[i].angle); return p; });
        configFrom = { ...config }; configTo = setting(active);
        burstTarget = boosting ? RELAY_BURST_TURN : 0;
        burstEntry = boosting ? liveBoost / RELAY_BURST_TURN : 0;
        yawFrom = [...renderedYaw];
        yawOffset = target.map((p, i) => {
          const end = p.ry + (active === 0 ? baseTurn + burstTarget * relayBurstProgress(RELAY_DURATION, burstEntry) + speed * RELAY_DURATION : 0);
          return relayNearestAngle(end, yawFrom[i]) - end;
        });
        transitionTime = 0; hold = 0;
        if (diagnostics) profile = { gaps: [], costs: [], mode: active };
      }
      if (running) {
        transitionTime += dt;
        const desiredSpeed = RELAY_SPEEDS[active];
        speed = lerp(speed, desiredSpeed, 1 - Math.exp(-dt * 5));
        baseTurn += speed * dt;
      }
      if (reduce) transitionTime = 10;
      const progress = relayCadence(transitionTime / RELAY_DURATION);
      for (const key of ['tilt', 'scale', 'y', 'depth', 'flat', 'radius'] as const) config[key] = lerp(configFrom[key], configTo[key], progress);
      burst = burstTarget * relayBurstProgress(transitionTime, burstEntry);
      const yaw = baseTurn + burst;
      const ring = clamp(1 - config.depth - config.flat);
      const diameterScale = lerp(104 / 126, 1, ring);
      const nextWorld = `translate(-50%, calc(-50% + ${config.y}px)) scale(${size * config.scale}) rotateX(${config.tilt}rad)`;
      if (nextWorld !== worldTransform) { group!.style.transform = nextWorld; worldTransform = nextWorld; }

      current.forEach((p, i) => {
        const delay = (active === 0 ? 11 - i : i) * RELAY_STAGGER;
        const t = clamp((transitionTime - delay) / RELAY_CARD_DURATION);
        const q = relayCadence(t);
        // Slot spacing settles gently; the shared orbit supplies the speed.
        // Using the fast formation easing here added a second angular burst
        // which vanished as soon as the sheets reached their new slots.
        p.angle = lerp(from[i].angle, target[i].angle, relayCadence(t));
        for (const key of ['y', 'rx', 'ry', 'rz'] as const) p[key] = lerp(from[i][key], target[i][key], q);
        const orbitAngle = p.angle + yaw;
        const wave = relayWave(orbitAngle, reduce ? 0 : clamp(config.depth) * (1 - clamp(config.flat)), config.radius * size * config.scale / 1050);
        // Every center stays on one exact circle, including during a switch.
        const point = relayCircle(config.radius, orbitAngle);
        const y = p.y + wave.y;
        const desiredYaw = target[i].ry + (active === 0 ? yaw : 0) + yawOffset[i];
        renderedYaw[i] = lerp(yawFrom[i], desiredYaw, q);
        const view = views[i];
        if (!view.element) return;
        const opacity = i < 8 ? 1 : ring;
        const opacityText = opacity.toFixed(3);
        if (view.opacity !== opacityText) { view.element.style.opacity = opacityText; view.opacity = opacityText; }
        const near = clamp((point.z / config.radius + 1) * .5);
        const scale = diameterScale * (i < 8 ? 1 : .06 + ring * .94) * lerp(1, .84 + near * .20, config.depth);
        Object.assign(drawPoses[i], { x: point.x, y, z: point.z, rx: p.rx + wave.rx, ry: renderedYaw[i], rz: p.rz + wave.rz, scale, opacity });
        if (opacity < .001) return;
        const transform = `translate3d(${point.x}px,${y}px,${point.z}px) rotateY(${renderedYaw[i]}rad) rotateX(${p.rx + wave.rx}rad) rotateZ(${p.rz + wave.rz}rad) scale(${scale})`;
        if (view.transform !== transform) { view.element.style.transform = transform; view.transform = transform; }
        const cameraZ = y * Math.sin(config.tilt) + point.z * Math.cos(config.tilt);
        const distance = Math.abs(cameraZ - 150);
        // Keep the depth cue, but avoid repainting seven blurred surfaces per
        // paddle or changing its layout dimensions on every animation frame.
        const blur = Math.round(Math.min(14, Math.max(0, distance - 70) * .095) * config.depth * 4) / 4;
        const filter = config.depth > .001 ? `blur(${blur}px)` : '';
        if (view.filter !== filter) { view.faces.forEach(face => { face.style.filter = filter; }); view.filter = filter; }
      });
      if (acrylic?.render({ scale: size * config.scale, tilt: config.tilt, y: config.y, depth: config.depth, concentration: .92, motion: clamp(burstTarget * relayBurstVelocity(transitionTime, burstEntry) / 3), poses: drawPoses })) host!.dataset.renderer = 'acrylic';
      if (profile) {
        if (!changed) profile.gaps.push(rawDelta);
        profile.costs.push(performance.now() - started);
        if (transitionTime > Math.max(RELAY_DURATION, boosting ? RELAY_BURST_DURATION : 0) + .12) {
          const sorted = [...profile.gaps].sort((a, b) => a - b);
          console.info('[discs-relay transition]', JSON.stringify({ mode: modes[profile.mode].label, frames: sorted.length, p95FrameMs: sorted[Math.floor(sorted.length * .95)] ?? 0, maxRenderMs: Math.max(...profile.costs), over34ms: sorted.filter(v => v > 34).length }));
          profile = null;
        }
      }
      if (running && state.automatic && transitionTime > Math.max(RELAY_DURATION, boosting ? RELAY_BURST_DURATION : 0) + .15) {
        hold += dt;
        if (hold > (active === 2 ? 7 : 4.5)) { hold = 0; setMode(((active + 1) % 3) as Mode); }
      }
    }
    frame = requestAnimationFrame(draw);
    return () => { disposed = true; acrylic?.dispose(); delete host.dataset.renderer; cancelAnimationFrame(frame); resize.disconnect(); intersection.disconnect(); media.removeEventListener('change', preference); };
  }, []);

  return <div className="discs-relay-demo" ref={root} data-mode={mode}>
    <div className="dr-heading"><span>{mode === 0 ? 'TWELVE' : 'EIGHT'} PADDLES / THREE WAYS</span><span>0{mode + 1} / 03</span></div>
    <div className="dr-scene" ref={scene} role="img" aria-label={`${mode === 0 ? 'Twelve' : 'Eight'} clear colored acrylic paddles in the ${modes[mode].label.toLowerCase()} arrangement, moving together on one circular path.`}>
      <div className="dr-world" ref={world}>
        {colors.map((color, i) => <div className="dr-disc" key={i} ref={element => { discs.current[i] = element; }}>
          {[-1.8, 0, 1.8].map((z, j) => <span key={z} className={`dr-edge dr-edge-${j}`} style={{ transform: `translateZ(${z}px)`, background: `${color}0d` }}/>)}
          <span className="dr-face dr-front" style={{backgroundColor:`${color}aa`}}/><span className="dr-face dr-back" style={{backgroundColor:`${color}aa`}}/>
        </div>)}
      </div>
    </div>
    <div className="dr-bottom">
      <div className="dr-controls">
        <div className="dr-modes" role="group" aria-label="Disc arrangement">{modes.map((item, i) => <button type="button" key={item.label} aria-pressed={mode === i} onClick={() => { setMode(i as Mode); setAutomatic(false); }}>{item.label}</button>)}</div>
      </div>
      <p className="dr-note" aria-live="polite">{reduced ? 'Reduced motion · choose an arrangement to explore.' : modes[mode].note}</p>
    </div>
  </div>;
}

export function DiscsRelay({ replayKey, paletteId = RELAY_DEFAULT_PALETTE }: { replayKey: number; paletteId?: string }) { return <RelayStudy key={replayKey} paletteId={paletteId}/>; }
