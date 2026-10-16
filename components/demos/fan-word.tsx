'use client';

import { ChevronLeft, ChevronRight, Leaf, Mountain, Sun, Waves, Wind } from 'lucide-react';
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform, type MotionValue } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import './nature-studies.css';

const words = [
  { name: 'Stillness', note: 'A pause between two thoughts.', icon: Leaf, photo: '/nature-motion/forest.jpg' },
  { name: 'Wander', note: 'Follow the path you have not taken.', icon: Mountain, photo: '/feed-adapt/weekend.jpg' },
  { name: 'Daylight', note: 'Let a little light find its way in.', icon: Sun, photo: '/nature-motion/forest.jpg' },
  { name: 'Breathe', note: 'Leave some room for the unexpected.', icon: Wind, photo: '/feed-adapt/lake.jpg' },
  { name: 'Flow', note: 'Keep moving, at your own pace.', icon: Waves, photo: '/feed-adapt/lake.jpg' },
];
const arcEase = [0.37, 0, 0.63, 1] as [number, number, number, number];
const wrap = (value: number) => ((value % words.length) + words.length) % words.length;
const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

function arcGeometry(width: number, height: number) {
  const nodeSize = width < 420 ? 32 : 42;
  const focusWidth = Math.min(218, Math.max(Math.min(130, width * 0.48), width * 0.33));
  const stride = Math.max(width * 0.225, focusWidth / 2 + nodeSize / 2 + 14);
  const radius = Math.max(width * 0.95, 2 * stride * stride / (height * 0.43));
  const step = Math.asin(stride / radius);
  const apex = height * 0.29;
  const edgeY = apex + radius - Math.sqrt(radius * radius - width * width / 4);
  return { width, height, nodeSize, focusWidth, radius, step, apex, edgeY };
}
type Geometry = ReturnType<typeof arcGeometry>;

function ArcNode({ slot, progress, spread, geometry, settled, target, choose, move, swiped }: {
  slot: number; progress: MotionValue<number>; spread: MotionValue<number>; geometry: Geometry;
  settled: number; target: number; choose: (slot: number) => void; move: (direction: number) => void; swiped: React.RefObject<boolean>;
}) {
  const word = words[wrap(slot)];
  const Icon = word.icon;
  // Every frame uses the same circle as the guide, including during travel.
  const x = useTransform(progress, p => geometry.width / 2 + geometry.radius * Math.sin((slot - p) * geometry.step));
  const y = useTransform(progress, p => geometry.apex + geometry.radius * (1 - Math.cos((slot - p) * geometry.step)));
  const expansion = useTransform(() => {
    // Adjacent nodes exchange their width as they travel, without a stop at
    // the center. This depends on actual position, so reversals stay continuous.
    const proximity = Math.max(0, 1 - Math.abs(slot - progress.get()));
    return smooth(proximity) * spread.get();
  });
  const width = useTransform(expansion, value => geometry.nodeSize + (geometry.focusWidth - geometry.nodeSize) * value);
  const height = useTransform(expansion, value => geometry.nodeSize + (56 - geometry.nodeSize) * value);
  const materialPlay = useTransform(expansion, value => value > 0.03 ? 'running' : 'paused');
  const materialOpacity = useTransform(expansion, value => smooth(value));
  const textOpacity = useTransform(expansion, value => smooth((value - 0.15) / 0.85));
  const fontSize = geometry.width < 420 ? 14 : 18;
  const textWidth = useTransform(expansion, value => (word.name.length * fontSize * 0.53 + 2) * smooth(value));
  const gap = useTransform(expansion, value => value * 8);
  const color = useTransform(expansion, [0, 0.45, 1], ['#707681', '#d3d5df', '#ffffff']);
  const opacity = useTransform(progress, p => Math.abs(slot - p) > 3.3 ? 0 : 1);
  const inWindow = Math.abs(slot - target) <= 2 && Math.abs(geometry.radius * Math.sin((slot - target) * geometry.step)) < geometry.width / 2 - geometry.nodeSize / 2;
  return <motion.div className="fan-word-seat" style={{ x, y, opacity }} data-slot={slot}>
    <motion.button type="button" className="fan-word-node" style={{ width, height, color }}
      aria-label={`Choose ${word.name}`} aria-pressed={slot === settled} aria-hidden={!inWindow} tabIndex={inWindow ? 0 : -1}
      disabled={!inWindow} onClick={e => { if (!swiped.current || e.detail === 0) choose(slot); }} onKeyDown={e => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); move(e.key === 'ArrowRight' ? 1 : -1); }
      }}>
      <motion.div className="fan-word-material" aria-hidden="true" style={{ opacity: materialOpacity }}>
        <motion.img width={1536} height={1024} src={word.photo} alt="" draggable={false} style={{ animationPlayState: materialPlay }} />
        <span className="fan-word-shade" /><motion.span className="fan-word-mist" style={{ animationPlayState: materialPlay }} />
      </motion.div>
      <motion.span className="fan-word-content" style={{ columnGap: gap }}><Icon size={17} strokeWidth={1.5} />
        <motion.span style={{ width: textWidth, opacity: textOpacity, fontSize }}>{word.name}</motion.span>
      </motion.span>
    </motion.button>
  </motion.div>;
}

function FanStudy() {
  const [target, setTarget] = useState(0);
  const [settled, setSettled] = useState(0);
  const [windowCenter, setWindowCenter] = useState(0);
  const [phase, setPhase] = useState('opening');
  const [size, setSize] = useState({ width: 460, height: 170 });
  const progress = useMotionValue(0);
  const spread = useMotionValue(0);
  const track = useRef<HTMLFieldSetElement>(null);
  const cursor = useRef(0);
  const pointer = useRef<number | null>(null);
  const swiped = useRef(false);
  const reduced = !!useReducedMotion();
  const geometry = arcGeometry(size.width, size.height);
  const choose = useCallback((slot: number) => {
    if (slot === cursor.current) return;
    cursor.current = slot;
    setTarget(slot);
  }, []);
  const move = useCallback((direction: number) => choose(cursor.current + direction), [choose]);
  useMotionValueEvent(progress, 'change', value => setWindowCenter(Math.round(value)));

  useEffect(() => {
    let cancelled = false;
    const playbacks: ReturnType<typeof animate>[] = [];
    const travel = async () => {
      if (reduced) {
        progress.set(target); spread.set(1); setSettled(target); setPhase('resting');
        return;
      }
      const distance = Math.abs(progress.get() - target);
      setPhase(distance > 0.001 ? 'rolling' : 'opening');
      // A gentler symmetric ease avoids a fast burst in the middle of the morph.
      // Movement and shape share the same position signal. Both capsules stay
      // on the arc while the departing one closes and the arriving one opens.
      playbacks.push(animate(progress, target, {
        duration: distance > 0.001 ? Math.min(2, 1.34 + distance * 0.16) : 0,
        ease: arcEase,
      }));
      playbacks.push(animate(spread, 1, { duration: spread.get() < 1 ? 1.1 : 0, ease: arcEase }));
      await Promise.all(playbacks);
      if (!cancelled) { setSettled(target); setPhase('resting'); }
    };
    void travel();
    return () => { cancelled = true; playbacks.forEach(playback => playback.stop()); };
  }, [target, reduced, progress, spread]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(el);
    let lastEvent = 0, accumulated = 0, consumed = false;
    function wheel(event: WheelEvent) {
      if (Math.abs(event.deltaY) < 2 && Math.abs(event.deltaX) < 2) return;
      event.preventDefault();
      const now = performance.now();
      if (now - lastEvent > 180) { accumulated = 0; consumed = false; }
      lastEvent = now;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      accumulated += delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? size.height : 1);
      // Trackpad momentum belongs to one gesture, rather than changing words
      // repeatedly after the user's fingers have stopped.
      if (!consumed && Math.abs(accumulated) >= 24) {
        consumed = true;
        choose(cursor.current + Math.sign(accumulated));
      }
    }
    el.addEventListener('wheel', wheel, { passive: false });
    return () => { observer.disconnect(); el.removeEventListener('wheel', wheel); };
  }, [choose, size.height]);

  return <div className="fan-word-demo" data-phase={phase} data-selected={wrap(settled)}>
    <span className="fan-word-eyebrow">FIND YOUR OWN PACE</span><h4>A word to come back to.</h4>
    <fieldset className="fan-word-track" aria-label="Words along the arc" ref={track} onPointerDown={e => { pointer.current = e.clientX; swiped.current = false; }} onPointerMove={e => {
      if (pointer.current !== null && Math.abs(e.clientX - pointer.current) > 12) e.currentTarget.setPointerCapture(e.pointerId);
    }} onPointerUp={e => {
      if (pointer.current !== null && Math.abs(e.clientX - pointer.current) > 35) {
        choose(cursor.current + (e.clientX < pointer.current ? 1 : -1)); swiped.current = true;
      }
      pointer.current = null;
    }} onPointerCancel={() => { pointer.current = null; }}>
      <svg className="fan-word-guide" viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true">
        <path d={`M0 ${geometry.edgeY} A${geometry.radius} ${geometry.radius} 0 0 1 ${size.width} ${geometry.edgeY}`} fill="none" stroke="var(--line)" strokeWidth="1" />
      </svg>
      {Array.from({ length: 9 }, (_, i) => windowCenter + i - 4).map(slot => <ArcNode key={slot} slot={slot} progress={progress} spread={spread} geometry={geometry} settled={settled} target={target} choose={choose} move={move} swiped={swiped} />)}
    </fieldset>
    <p className="fan-word-note" aria-live="polite">{words[wrap(settled)].note}</p>
    <div className="fan-word-controls"><button type="button" aria-label="Previous word" onClick={() => choose(cursor.current - 1)}><ChevronLeft size={15} /></button><span>Scroll the arc · swipe · choose</span><button type="button" aria-label="Next word" onClick={() => choose(cursor.current + 1)}><ChevronRight size={15} /></button></div>
  </div>;
}
export function FanWord({ replayKey }: { replayKey: number }) { return <FanStudy key={replayKey} />; }
