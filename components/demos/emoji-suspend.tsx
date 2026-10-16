'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Shuffle, Hand } from 'lucide-react';
import './emoji-suspend.css';
import { SUSPEND_FILLINGS, SUSPEND_CHARM_COUNT } from './emoji-suspend-fillings';

export type SuspendMaterial = 'jelly' | 'resin' | 'glass' | 'ice';
export type SuspendState = { material: SuspendMaterial; filling: number; paused: boolean; impulse: number; yaw: number; pitch: number; dragging: boolean };
const materials = [{ id: 'jelly', label: 'Jelly', note: 'Round, soft, and wonderfully wobbly.' }, { id: 'resin', label: 'Gel', note: 'A gentle, syrupy rebound.' }, { id: 'glass', label: 'Glass', note: 'Clear edges. A crisp turn.' }, { id: 'ice', label: 'Ice', note: 'Tiny bubbles, held in the cold.' }] as const;

export function EmojiSuspend({ replayKey }: { replayKey: number }) {
  const host = useRef<HTMLDivElement>(null);
  const [material, setMaterial] = useState<SuspendMaterial>('resin');
  const [paused, setPaused] = useState(false);
  const [filling, setFilling] = useState(0);
  const [failed, setFailed] = useState(false);
  const state = useRef<SuspendState>({ material: 'resin', filling: 0, paused: false, impulse: 0, yaw: 0, pitch: 0, dragging: false });
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number; moved: boolean } | null>(null);
  state.current.material = material; state.current.paused = paused; state.current.filling = filling;

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    setFailed(false);
    void import('./emoji-suspend-engine').then(({ createSuspendScene }) => {
      if (!disposed && host.current) cleanup = createSuspendScene(host.current, () => state.current, () => setFailed(true));
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => { disposed = true; cleanup?.(); };
  }, [replayKey]);

  return <div className="emoji-suspend-demo" data-material={material}>
    <div className="emoji-suspend-heading"><span>{SUSPEND_FILLINGS[filling].name.toUpperCase()} / {SUSPEND_CHARM_COUNT} CHARMS</span><span>{String(materials.findIndex((item) => item.id === material) + 1).padStart(2, '0')} / {material === 'resin' ? 'GEL' : material.toUpperCase()}</span></div>
    <div className="emoji-suspend-scene" ref={host} role="button" tabIndex={0}
      aria-label="Rounded transparent block filled with dimensional emoji. Drag or use arrow keys to turn; press Enter to jiggle."
      onPointerDown={(event) => { if (event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, yaw: state.current.yaw, pitch: state.current.pitch, moved: false }; state.current.dragging = true; }}
      onPointerMove={(event) => { const d = drag.current; if (!d) return; const dx = event.clientX - d.x, dy = event.clientY - d.y; d.moved ||= Math.abs(dx) + Math.abs(dy) > 5; state.current.yaw = d.yaw + dx * .009; state.current.pitch = Math.max(-.6, Math.min(.6, d.pitch + dy * .006)); }}
      onPointerUp={() => { if (drag.current && !drag.current.moved) state.current.impulse++; drag.current = null; state.current.dragging = false; }}
      onPointerCancel={() => { drag.current = null; state.current.dragging = false; }}
      onKeyDown={(event) => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(event.key)) event.preventDefault(); if (event.key === 'ArrowLeft') state.current.yaw -= .2; if (event.key === 'ArrowRight') state.current.yaw += .2; if (event.key === 'ArrowUp') state.current.pitch = Math.max(-.6, state.current.pitch - .1); if (event.key === 'ArrowDown') state.current.pitch = Math.min(.6, state.current.pitch + .1); if (event.key === 'Enter' || event.key === ' ') state.current.impulse++; }}>
      {failed && <p className="emoji-suspend-fallback">The 3D preview needs WebGL. Try opening this page in a browser with hardware acceleration.</p>}
    </div>
    <div className="emoji-suspend-controls">
      <div className="emoji-suspend-materials" role="group" aria-label="Transparent material">{materials.map((item) => <button type="button" key={item.id} aria-pressed={material === item.id} onClick={() => { setMaterial(item.id); state.current.impulse++; }}>{item.label}</button>)}</div>
      <div className="emoji-suspend-actions"><button type="button" aria-label={`Change emoji filling, ${SUSPEND_FILLINGS[filling].name} selected`} title={`Next filling · ${SUSPEND_FILLINGS[filling].name}`} onClick={() => { setFilling((value) => (value + 1) % SUSPEND_FILLINGS.length); state.current.impulse++; }}><Shuffle size={14} /></button><button type="button" aria-label={paused ? 'Resume motion' : 'Pause motion'} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Play size={14} /> : <Pause size={14} />}</button></div>
    </div>
    <div className="emoji-suspend-note"><span aria-live="polite">{materials.find((item) => item.id === material)?.note}</span><span><Hand size={10} /> Drag to turn · Tap to feel</span></div>
  </div>;
}
