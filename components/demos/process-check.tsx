'use client';

import { Check, LoaderCircle, Play, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useStudyViewport } from './agent-study-shared';

const steps = ['Gather the references', 'Find the little detail', 'Give the shape a nudge', 'Let the motion settle'];
const timing = [2400, 3200, 2800, 3600];
type Progress = { completed: number; elapsed: number[] };
const freshProgress = (): Progress => ({ completed: 0, elapsed: steps.map(() => 0) });
const formatTime = (milliseconds: number) => `${(milliseconds / 1000).toFixed(1)}s`;

function recordTime(progress: Progress, delta: number, advance: boolean): Progress {
  if (progress.completed === steps.length) return progress;
  const elapsed = [...progress.elapsed];
  elapsed[progress.completed] += delta;
  const finished = advance && elapsed[progress.completed] >= timing[progress.completed];
  return { elapsed, completed: progress.completed + (finished ? 1 : 0) };
}

function CheckStudy() {
  const { ref, visible, reduced } = useStudyViewport();
  const [progress, setProgress] = useState(freshProgress);
  const [running, setRunning] = useState(true);
  const [compact, setCompact] = useState(false);
  const lastTick = useRef<number | null>(null);
  const progressAction = useRef<HTMLButtonElement>(null);
  const noteAction = useRef<HTMLButtonElement>(null);
  const { completed, elapsed } = progress;
  const complete = completed === steps.length;

  useEffect(() => {
    if (!complete) return;
    const timer = window.setTimeout(() => {
      const transferFocus = document.activeElement === progressAction.current;
      setCompact(true);
      if (transferFocus) window.requestAnimationFrame(() => noteAction.current?.focus());
    }, reduced ? 0 : 650);
    return () => window.clearTimeout(timer);
  }, [complete, reduced]);

  useEffect(() => {
    if (!running || !visible || complete) return;
    lastTick.current = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.max(0, now - (lastTick.current ?? now));
      lastTick.current = now;
      setProgress(current => recordTime(current, delta, !reduced));
    }, reduced ? 1000 : 100);
    return () => { window.clearInterval(timer); lastTick.current = null; };
  }, [completed, complete, running, visible, reduced]);

  function elapsedSinceTick() {
    const now = performance.now();
    const delta = lastTick.current === null ? 0 : Math.max(0, now - lastTick.current);
    lastTick.current = now;
    return delta;
  }
  function start() {
    if (complete) {
      setCompact(false); setProgress(freshProgress()); setRunning(true);
      window.requestAnimationFrame(() => progressAction.current?.focus());
      return;
    }
    if (reduced) {
      const delta = elapsedSinceTick();
      setProgress(current => {
        const timed = recordTime(current, delta, false);
        return { ...timed, completed: Math.min(steps.length, timed.completed + 1) };
      });
      return;
    }
    setRunning(true);
  }
  function pause() {
    const delta = elapsedSinceTick();
    setProgress(current => recordTime(current, delta, false));
    setRunning(false);
  }

  return <div className="process-check-demo" ref={ref} data-playing={running && visible && !reduced}>
    <motion.div className="process-check-panel" initial={false} animate={{ height: compact ? 64 : 'auto' }} transition={{ duration: reduced ? 0 : 0.7, ease: [0.4, 0, 0.2, 1] }}>
      <motion.div className="process-check-detail" aria-hidden={compact} inert={compact || undefined} animate={{ opacity: compact ? 0 : 1 }} transition={{ duration: reduced ? 0 : 0.18 }}>
      <div className="process-check-heading"><span>A small study</span><span>{String(completed).padStart(2, '0')} / 04</span></div>
      <ol>{steps.map((step, index) => {
        const done = index < completed;
        const current = index === completed;
        return <li key={step} className={done ? 'is-done' : current ? 'is-current' : ''} aria-current={current ? 'step' : undefined}>
          {index < steps.length - 1 && <span className="process-check-track"><motion.i initial={false} animate={{ scaleY: done ? 1 : 0 }} transition={{ duration: reduced ? 0 : 0.6, delay: reduced ? 0 : 0.15, ease: [0.33, 0, 0.2, 1] }} /></span>}
          <motion.span className="process-check-box" aria-hidden="true" animate={{ scale: done ? [1, 1.15, 1] : 1 }} transition={{ duration: reduced ? 0 : 0.36 }}>
            {done ? <motion.svg viewBox="0 0 16 16"><motion.path d="M 3.5 8.2 L 6.5 11 L 12.5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduced ? 0 : 0.32 }} /></motion.svg> : current ? <LoaderCircle className="process-check-spinner" size={14} strokeWidth={1.7} /> : <span>{index + 1}</span>}
          </motion.span><span className="process-check-label">{step}</span>
          {done ? <span className="process-check-state">Done</span> : current ? <time className="process-check-state" dateTime={`PT${(elapsed[index] / 1000).toFixed(1)}S`} aria-label={`Elapsed ${(elapsed[index] / 1000).toFixed(1)} seconds`}>{formatTime(elapsed[index])}</time> : <span className="process-check-state" aria-label="Not started">—</span>}
        </li>;
      })}</ol>
      <div className="process-check-bottom"><output aria-live="polite">{complete ? 'A little idea, ready to share.' : reduced ? 'Take it one step at a time.' : running ? 'Let each step find its own pace.' : 'A moment to catch your breath.'}</output><button ref={progressAction} type="button" aria-label={complete ? 'Run the process again' : reduced ? 'Complete next process step' : running ? 'Pause process' : 'Resume process'} onClick={() => complete || reduced || !running ? start() : pause()}>{complete ? <RotateCcw size={13} /> : reduced ? <Check size={13} /> : running ? <span className="process-check-pause" /> : <Play size={13} />}</button></div>
      </motion.div>
      {compact && <motion.div className="process-check-note" initial={reduced ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.24, delay: reduced ? 0 : 0.16 }}>
        <span className="process-check-note-icon" aria-hidden="true"><Check size={15} strokeWidth={1.8} /></span>
        <output aria-live="polite"><strong>Study complete.</strong><span>All four steps are done.</span></output>
        <button ref={noteAction} type="button" aria-label="Run the process again" onClick={start}><RotateCcw size={13} /></button>
      </motion.div>}
    </motion.div><span className="agent-study-hint">{compact ? 'Replay to begin again' : reduced ? 'Tap the check to advance' : 'Follow the checks · pause when you like'}</span>
  </div>;
}
export function ProcessCheck({ replayKey }: { replayKey: number }) { return <CheckStudy key={replayKey} />; }
