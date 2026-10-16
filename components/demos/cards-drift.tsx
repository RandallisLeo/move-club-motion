'use client';

import { animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from 'motion/react';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import './cards-drift.css';

const cards = [
  { label: 'OBSERVE', title: 'A small\ndetail.', body: 'I kept watching the last few frames. The card had almost stopped, but that small remaining movement made it feel heavier.' },
  { label: 'EXPLORE', title: 'Another\nangle.', body: 'The next card was already in view. A slight turn was enough to show where it would come from, before I moved anything.' },
  { label: 'RETURN', title: 'Find the\nway back.', body: 'I opened a card to look closer, then folded it back into place. The collection stayed where I left it, ready for the next little discovery.' },
];
export const CARDS_DRIFT_PALETTES = [
  { id: 'mint', name: 'Mint', colors: ['#bfead9', '#c4def6', '#ded5f4'] },
  { id: 'coast', name: 'Coast', colors: ['#bde6ed', '#b4d8ec', '#d4ebdf'] },
  { id: 'citrus', name: 'Citrus', colors: ['#d5edb2', '#f4edb9', '#c4e7db'] },
  { id: 'bloom', name: 'Bloom', colors: ['#cfe5cd', '#e6d7f1', '#f3d8dd'] },
  { id: 'dawn', name: 'Dawn', colors: ['#cfe8f7', '#fff0ba', '#f6dbd1'] },
] as const;
export type CardsDriftPalette = typeof CARDS_DRIFT_PALETTES[number]['id'];
const crossing = [0.66, 0, 0.18, 1] as const;
const landing = [0.22, 1, 0.36, 1] as const;
type Phase = 'idle' | 'switching' | 'opening' | 'open' | 'returning';

function CardArtwork({ index }: { index: number }) {
  return <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
    {index === 0 ? <><circle cx="60" cy="60" r="25"/><ellipse cx="60" cy="60" rx="47" ry="18" transform="rotate(-35 60 60)"/><path d="M60 12v9m0 78v9M12 60h9m78 0h9"/></> : index === 1 ? <path d="M20 85C-3 20 106 5 98 59S14 108 28 62 104 32 92 83 47 113 53 60"/> : <><path d="M20 105c0-48 80-42 80-90M38 110c0-48 48-38 48-94M53 111c0-47 19-34 19-96"/><circle cx="23" cy="30" r="7"/></>}
  </svg>;
}

function DriftCard({ index, position, reveal, active, expanded, busy, onSelect }: {
  index: number; position: MotionValue<number>; reveal: MotionValue<number>;
  active: boolean; expanded: boolean; busy: boolean; onSelect: () => void;
}) {
  const card = cards[index];
  const x = useTransform(() => {
    const relative = index - position.get();
    const distance = Math.abs(relative);
    // The nearest card peeks out; the third nests closer behind it.
    return `${Math.sign(relative) * (Math.min(distance, 1) * 67 + Math.max(0, distance - 1) * 28)}%`;
  });
  const y = useTransform(() => `${Math.min(Math.abs(index - position.get()), 2) * (index === 1 ? 8 : 6)}%`);
  const rotate = useTransform(() => Math.max(-13, Math.min(13, (index - position.get()) * (index === 1 ? 7 : 9))));
  const scale = useTransform(() => 1 - Math.min(Math.abs(index - position.get()), 2) * .045);
  const opacity = useTransform(() => 1 - Math.min(Math.abs(index - position.get()), 1) * reveal.get());
  const zIndex = useTransform(() => 10 - Math.round(Math.abs(index - position.get()) * 3));
  const width = useTransform(() => `${100 + reveal.get() * (active ? 45 : 0)}%`);
  const left = useTransform(() => `${reveal.get() * (active ? -22.5 : 0)}%`);
  const height = useTransform(() => `${100 + reveal.get() * (active ? 40 : 0)}%`);
  const top = useTransform(() => `${reveal.get() * (active ? -20 : 0)}%`);
  // Keep the same two lines and glyph metrics throughout the resize. Move and
  // scale the existing title with the card's progress instead of reflowing it.
  const titleY = useTransform(() => active ? -8 * reveal.get() : 0);
  const titleScale = useTransform(() => active ? 1 - .16 * reveal.get() : 1);
  const bodyOpacity = useTransform(() => active ? Math.max(0, (reveal.get() - .45) / .55) : 0);
  const bodyY = useTransform(reveal, [.45, 1], [8, 0]);
  const artworkOpacity = useTransform(() => active ? .7 * Math.max(0, 1 - reveal.get() / .4) : .7);
  const artworkY = useTransform(() => active ? reveal.get() * 8 : 0);
  return <motion.button type="button" className={`cd-card cd-card-${index}${active ? ' is-current' : ''}${expanded && active ? ' is-open' : ''}`}
    style={{ x, y, rotate, scale, opacity, zIndex, width, height, left, top }} tabIndex={active ? 0 : -1} disabled={busy || (expanded && !active)}
    aria-label={active ? expanded ? 'Close card and return' : `Open card ${index + 1}` : `Select card ${index + 1}`} aria-expanded={active ? expanded : undefined} aria-current={active ? 'true' : undefined} aria-hidden={expanded && !active} onClick={onSelect}>
    <span className="cd-card-meta"><span>{String(index + 1).padStart(2, '0')}</span><span>{card.label}</span></span>
    <motion.strong className="cd-title" style={{ y:titleY, scale:titleScale }}>{card.title}</motion.strong>
    <motion.span className="cd-artwork" style={{ opacity:artworkOpacity, y:artworkY }}><CardArtwork index={index}/></motion.span>
    <motion.span className="cd-card-body" style={{ opacity:bodyOpacity, y:bodyY }} aria-hidden={!expanded || !active}>{card.body}</motion.span>
    <span className="cd-card-action"><span>{expanded && active ? 'Back to cards' : 'Open card'}</span>{expanded && active ? <ArrowLeft size={16}/> : <ArrowRight size={16}/>}</span>
  </motion.button>;
}

function CardsDriftStudy({ replayKey, palette }: { replayKey: number; palette: CardsDriftPalette }) {
  const reduced = useReducedMotion();
  const position = useMotionValue(0);
  const reveal = useMotionValue(0);
  const [selected, setSelected] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const phaseRef = useRef<Phase>('idle');
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ id: number; x: number; y: number; position: number; horizontal: boolean } | null>(null);
  const suppressClick = useRef(0);
  const alive = useRef(true);
  const animations = useRef<ReturnType<typeof animate>[]>([]);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const navigationOpacity = useTransform(reveal, [0, .4], [1, 0]);
  const expanded = phase === 'open' || phase === 'opening';
  const busy = phase !== 'idle' && phase !== 'open';
  const colors = CARDS_DRIFT_PALETTES.find(item => item.id === palette)!.colors;

  function status(value: Phase) { phaseRef.current = value; if (alive.current) setPhase(value); }
  async function move(value: MotionValue<number>, target: number, duration: number, ease: readonly [number, number, number, number] = crossing) {
    const control = animate(value, target, { duration: reduced ? 0 : duration, ease });
    animations.current.push(control); await control;
    animations.current = animations.current.filter(item => item !== control);
    return alive.current;
  }
  function pause(ms: number) { return new Promise<void>(resolve => { const timer = setTimeout(() => { timers.current.delete(timer); resolve(); }, ms); timers.current.add(timer); }); }
  function focusCard() { requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>('.cd-card[aria-current=true]')?.focus({ preventScroll:true })); }
  async function select(index: number, keyboard = false) {
    if (phaseRef.current !== 'idle') return;
    const next = Math.max(0, Math.min(2, index));
    status('switching'); setSelected(next);
    if (await move(position, next, .56)) { status('idle'); if (keyboard) focusCard(); }
  }
  async function open() {
    if (phaseRef.current !== 'idle') return;
    status('opening');
    if (await move(reveal, 1, .58)) { status('open'); focusCard(); }
  }
  async function close() {
    if (phaseRef.current !== 'open') return;
    status('returning');
    // Closing restores the user's current place in the collection.
    if (await move(reveal, 0, .58, landing)) { status('idle'); focusCard(); }
  }
  async function replay() {
    for (const index of [1, 2]) {
      if (!alive.current) return;
      await select(index); await pause(300);
    }
    if (!alive.current) return;
    await open(); await pause(1000);
    if (alive.current) await close();
  }
  useEffect(() => {
    alive.current = true;
    if (replayKey > 0 && !reduced) { const timer=setTimeout(() => void replay(), 150); timers.current.add(timer); }
    return () => { alive.current=false; animations.current.forEach(control => control.stop()); timers.current.forEach(clearTimeout); };
    // The replay key remounts the study and cancels the previous sequence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function begin(event: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'idle' || event.button !== 0) return;
    gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY,position:position.get(),horizontal:false};
  }
  function drag(event: PointerEvent<HTMLDivElement>) {
    const g=gesture.current; if (!g || g.id !== event.pointerId) return;
    const dx=event.clientX-g.x,dy=event.clientY-g.y;
    if (!g.horizontal) {
      if (Math.abs(dy)>10 && Math.abs(dy)>Math.abs(dx)) { gesture.current=null; return; }
      if (Math.abs(dx)<8) return;
      g.horizontal=true; event.currentTarget.setPointerCapture(event.pointerId);
    }
    const raw=g.position-dx/((track.current?.clientWidth ?? 220)*.67);
    position.set(raw<0 ? raw*.18 : raw>2 ? 2+(raw-2)*.18 : raw);
    suppressClick.current=Date.now()+350;
  }
  function end(event: PointerEvent<HTMLDivElement>, cancelled=false) {
    const g=gesture.current; if (!g || g.id !== event.pointerId) return;
    gesture.current=null;
    if (event.currentTarget.hasPointerCapture(g.id)) event.currentTarget.releasePointerCapture(g.id);
    if (!g.horizontal) return;
    const dx=event.clientX-g.x;
    void select(cancelled ? selected : Math.abs(dx)>35 ? selected+(dx<0 ? 1 : -1) : Math.round(position.get()));
  }

  return <div ref={root} className="cards-drift-demo" style={{ '--cd-color-0': colors[0], '--cd-color-1': colors[1], '--cd-color-2': colors[2] } as CSSProperties} data-palette={palette} data-phase={phase} data-selected={selected} role="group" aria-label="Cards / Drift interaction" onKeyDown={event => {
    if (event.key === 'Escape' && phaseRef.current === 'open') { event.preventDefault(); void close(); }
    if (phaseRef.current === 'idle' && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) { event.preventDefault(); void select(selected+(event.key === 'ArrowRight' ? 1 : -1),true); }
  }}>
    <div className="cd-rail" onPointerDown={begin} onPointerMove={drag} onPointerUp={event => end(event)} onPointerCancel={event => end(event,true)} onLostPointerCapture={event => { if(gesture.current) end(event,true); }}>
      <div ref={track} className="cd-track">{cards.map((card,index) => <DriftCard key={card.label} index={index} position={position} reveal={reveal} active={selected===index} expanded={expanded} busy={busy} onSelect={() => { if(Date.now()<suppressClick.current) return; if(index!==selected) void select(index); else if(phaseRef.current==='open') void close(); else void open(); }}/>)}</div>
    </div>
    <motion.div className="cd-controls" style={{ opacity:navigationOpacity }} inert={phase !== 'idle'} aria-hidden={expanded}>
      <button type="button" aria-label="Previous card" disabled={selected===0 || busy} onClick={() => void select(selected-1)}><ChevronLeft size={16}/></button>
      <div className="cd-dots">{cards.map((card,index) => <button type="button" key={card.label} aria-label={`Go to card ${index+1}`} aria-pressed={selected===index} disabled={busy} onClick={() => void select(index)}><span/></button>)}</div>
      <button type="button" aria-label="Next card" disabled={selected===2 || busy} onClick={() => void select(selected+1)}><ChevronRight size={16}/></button>
    </motion.div>
    <span className="cd-status" role="status">{phase==='open' ? `Card ${selected+1} expanded. Activate again or press Escape to return.` : `Card ${selected+1} of 3.`}</span>
  </div>;
}

export function CardsDrift({ replayKey=0, palette='dawn' }: { replayKey?: number; palette?: CardsDriftPalette }) { return <CardsDriftStudy key={replayKey} replayKey={replayKey} palette={palette}/>; }
