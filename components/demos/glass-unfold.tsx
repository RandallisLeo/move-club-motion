'use client';

import { Bookmark, Layers, NotebookPen } from 'lucide-react';
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import './nature-studies.css';

const phases = [
  { name: 'compact', left: 0, right: 0, hold: 1300 },
  { name: 'opening-left', left: 1, right: 0, hold: 1500 },
  { name: 'opening-right', left: 1, right: 1, hold: 2200 },
  { name: 'closing-right', left: 1, right: 0, hold: 1300 },
  { name: 'closing-left', left: 0, right: 0, hold: 1300 },
];

function UnfoldStudy() {
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { amount: 0.4 });
  const reduced = !!useReducedMotion();
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [width, setWidth] = useState(460);
  const left = useMotionValue(0);
  const right = useMotionValue(0);
  const manualStep = useRef(false);
  const playbacks = useRef<ReturnType<typeof animate>[]>([]);
  const available = Math.max(200, Math.min(284, width - 40));
  const coreWidth = Math.max(100, Math.min(124, available * 0.46));
  const rightWingWidth = available * 0.32;
  const leftWingWidth = available - coreWidth - rightWingWidth;
  const leftWidth = useTransform(left, value => leftWingWidth * value);
  const rightWidth = useTransform(right, value => rightWingWidth * value);
  const panelWidth = useTransform(() => leftWidth.get() + coreWidth + rightWidth.get());
  const leftOpacity = useTransform(left, [0, 0.35, 1], [0, 0, 1]);
  const rightOpacity = useTransform(right, [0, 0.3, 1], [0, 0, 1]);
  const current = phases[phase];

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (reduced) { left.set(current.left); right.set(current.right); return; }
    const transition = { duration: 0.62, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };
    playbacks.current = [animate(left, current.left, transition), animate(right, current.right, transition)];
    return () => { playbacks.current.forEach(animation => animation.stop()); playbacks.current = []; };
  }, [phase, current.left, current.right, left, right, reduced]);
  useEffect(() => {
    playbacks.current.forEach(animation => {
      if ((playing || manualStep.current) && inView && animation.state === 'paused') animation.play();
      else if ((!inView || (!playing && !manualStep.current)) && animation.state === 'running') animation.pause();
    });
  }, [playing, inView, phase, reduced]);
  useEffect(() => {
    if (reduced || !playing || !inView) return;
    const timer = window.setTimeout(() => { manualStep.current = false; setPhase(value => (value + 1) % phases.length); }, current.hold);
    return () => window.clearTimeout(timer);
  }, [phase, current.hold, playing, inView, reduced]);

  return <div ref={root} className="glass-unfold-demo" data-phase={current.name} data-playing={playing}>
    <button type="button" className="glass-unfold-step" aria-label="Advance to the next unfold step" onClick={() => {
      manualStep.current = true;
      // Closing-left is already the compact shape; skip the duplicate hold
      // when a person asks for a new step, while keeping the automatic pause.
      setPhase(value => value === phases.length - 1 ? 1 : value + 1);
    }} />
    <motion.div className="glass-unfold-panel" style={{ width: panelWidth }}>
      <motion.div className="glass-unfold-wing glass-unfold-left" style={{ width: leftWidth }} aria-hidden="true">
        <motion.div className="glass-unfold-left-content" style={{ width: leftWingWidth, opacity: leftOpacity }}><span><Layers size={12}/></span><span><NotebookPen size={12}/></span><span><Bookmark size={12}/></span></motion.div>
      </motion.div>
      <div className="glass-unfold-core" style={{ width: coreWidth }}><span className="glass-unfold-index">01 / NOTE</span><NotebookPen size={19} strokeWidth={1.4} aria-hidden="true" /><h4>A little<br />space.</h4><span className="glass-unfold-caption">Room for a thought.</span></div>
      <motion.div className="glass-unfold-wing glass-unfold-right" style={{ width: rightWidth }} aria-hidden="true">
        <motion.div className="glass-unfold-right-content" style={{ width: rightWingWidth, opacity: rightOpacity }}><small>A SMALL THOUGHT</small><p>Keep it simple.<br/>Leave a little<br/>room to explore.</p><span/></motion.div>
      </motion.div>
    </motion.div>
    <div className="glass-unfold-controls"><span>Tap to advance · unfold / fold</span>{!reduced && <button type="button" aria-label={playing ? 'Pause automatic unfolding' : 'Resume automatic unfolding'} aria-pressed={!playing} onClick={() => { manualStep.current = false; setPlaying(value => !value); }}>{playing ? 'Pause' : 'Resume'}</button>}</div>
  </div>;
}
export function GlassUnfold({ replayKey }: { replayKey: number }) { return <UnfoldStudy key={replayKey} />; }
