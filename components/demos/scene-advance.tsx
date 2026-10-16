'use client';

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import './nature-studies.css';

function AdvanceStudy() {
  const [depth, setDepth] = useState(0);
  const view = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ y: number; depth: number } | null>(null);
  const reduced = !!useReducedMotion();
  const progress = useMotionValue(0);
  const farScale = useTransform(progress, [0, 1], [1.045, 1.15]);
  const middleScale = useTransform(progress, [0, 1], [1.045, 1.38]);
  const nearScale = useTransform(progress, [0, 1], [1.045, 1.8]);
  const farY = useTransform(progress, [0, 1], [0, -8]);
  const middleY = useTransform(progress, [0, 1], [0, 12]);
  const nearY = useTransform(progress, [0, 1], [0, 42]);
  const titleY = useTransform(progress, [0, 1], [0, -22]);
  const titleOpacity = useTransform(progress, [0, 1], [1, 0.45]);

  useEffect(() => {
    const animation = animate(progress, reduced ? 0 : depth / 100, { duration: reduced ? 0 : 0.42, ease: [0.22, 0.8, 0.24, 1] });
    return () => animation.stop();
  }, [depth, progress, reduced]);
  useEffect(() => {
    const el = view.current;
    if (!el) return;
    function wheel(event: WheelEvent) {
      if (!event.deltaY) return;
      const previous = Number(el!.dataset.depth ?? 0);
      if ((previous === 100 && event.deltaY > 0) || (previous === 0 && event.deltaY < 0)) return;
      event.preventDefault();
      setDepth(value => Math.max(0, Math.min(100, value + event.deltaY * 0.13)));
    }
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, []);
  return <div className="scene-advance-demo">
    <div className="scene-advance-view" ref={view} data-depth={depth} onPointerDown={event => { pointer.current = { y: event.clientY, depth }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => {
      if (pointer.current) setDepth(Math.max(0, Math.min(100, pointer.current.depth + (pointer.current.y - event.clientY) * 0.5)));
    }} onPointerUp={() => { pointer.current = null; }} onPointerCancel={() => { pointer.current = null; }}>
      <motion.img className="scene-advance-layer scene-advance-far" src="/nature-motion/scene-far.png" alt="Dawn over a misty mountain valley, framed by conifers and moss-covered boulders" style={{ scale: farScale, y: farY }} draggable={false} />
      <motion.img className="scene-advance-layer scene-advance-middle" src="/nature-motion/scene-middle.png" alt="" aria-hidden="true" style={{ scale: middleScale, y: middleY }} draggable={false} />
      <motion.img className="scene-advance-layer scene-advance-near" src="/nature-motion/scene-near.png" alt="" aria-hidden="true" style={{ scale: nearScale, y: nearY }} draggable={false} />
      <div className="scene-advance-vignette" />
      <motion.div className="scene-advance-title" style={{ y: titleY, opacity: titleOpacity }}><span>STEP INTO THE STILLNESS</span><h4>A little<br />closer.</h4></motion.div>
      <span className="scene-advance-caption">{depth < 35 ? 'At the edge of the forest' : depth < 75 ? 'Between the trees' : 'Here, for a moment'}</span>
    </div>
    <div className="scene-advance-controls"><label htmlFor="scene-advance-depth">Scroll the scene · drag upwards</label><input id="scene-advance-depth" type="range" aria-label="Distance into the forest" min="0" max="100" value={depth} onChange={event => setDepth(Number(event.target.value))} /><span>{Math.round(depth)}%</span></div>
  </div>;
}
export function SceneAdvance({ replayKey }: { replayKey: number }) { return <AdvanceStudy key={replayKey} />; }
