'use client';

import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import './signal-crossing.css';

const signals = [
  { name: 'stop', word: 'STOP', color: '#bf2540', hint: 'Hold your step.', duration: 3000 },
  { name: 'alert', word: 'ALERT', color: '#ffd564', hint: 'Stay ready.', duration: 1800 },
  { name: 'walk', word: 'WALK', color: '#267354', hint: 'Find your rhythm.', duration: 4200 },
] as const;
const sequence = [0, 1, 2, 1];

// Actual ink bounds of the bundled Anton font, at its native 2048 units/em.
// Each glyph shares the same visible baseline; only the last glyph is shorter.
const glyphBounds: Record<string, string> = {
  S: '42 -1776 864 1792', T: '20 -1760 770 1760',
  O: '64 -1776 868 1792', P: '78 -1760 856 1760',
  A: '30 -1760 934 1760', L: '78 -1760 714 1760',
  E: '78 -1760 727 1760', R: '78 -1760 860 1760',
  W: '27 -1760 1404 1760', K: '78 -1760 907 1760',
};

function CrossingStudy() {
  const [phase, setPhase] = useState(0);
  const [take, setTake] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);
  const [foreground, setForeground] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const stripes = useRef<HTMLDivElement>(null);
  const roadOffset = useRef(0);
  const roadSpeed = useRef(0);
  const entrySpeed = useRef(0);
  const elapsed = useRef(0);
  const selected = sequence[phase];
  const signal = signals[selected];
  const running = playing && visible && foreground && !reduced;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const preference = () => {
      setReduced(media.matches);
      setPlaying(!media.matches);
    };
    preference();
    media.addEventListener('change', preference);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 });
    if (root.current) observer.observe(root.current);
    const visibility = () => setForeground(!document.hidden);
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      media.removeEventListener('change', preference);
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  useEffect(() => {
    elapsed.current = 0;
    entrySpeed.current = roadSpeed.current;
    if (signal.name === 'stop') roadSpeed.current = 0;
  }, [phase, take, signal.name]);

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = Math.min(now - last, 100);
      elapsed.current += delta;
      last = now;
      const previousSpeed = roadSpeed.current;
      if (signal.name === 'walk') {
        const t = Math.min(elapsed.current / 900, 1);
        const ease = t * t * (3 - 2 * t);
        roadSpeed.current = entrySpeed.current + (62 / 1.1 - entrySpeed.current) * ease;
      } else if (signal.name === 'alert') {
        const t = Math.min(elapsed.current / 800, 1);
        const ease = t * t * (3 - 2 * t);
        const cautiousSpeed = (62 / 1.1) * 0.2;
        roadSpeed.current = entrySpeed.current + (cautiousSpeed - entrySpeed.current) * ease;
      } else {
        roadSpeed.current = 0;
      }
      // Integrate velocity without resetting the stripe phase when the light changes.
      roadOffset.current = (roadOffset.current + (previousSpeed + roadSpeed.current) * delta / 2000) % 62;
      if (stripes.current) stripes.current.style.transform = `translateX(${-roadOffset.current}px)`;
      if (elapsed.current >= signal.duration) {
        setPhase((current) => (current + 1) % sequence.length);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, phase, take, signal.duration, signal.name]);

  function select(index: number) {
    setPhase(index);
    setTake((current) => current + 1);
  }

  return (
    <div ref={root} className="signal-crossing-demo" data-signal={signal.name} data-running={running} data-reduced={reduced}
      style={{ '--crossing-ink': signal.color } as CSSProperties}>
      <div className="crossing-heading"><span>PEDESTRIAN SIGNAL</span><span>03 / STATES</span></div>
      <div className="crossing-scene">
        <div key={`${phase}-${take}`} className="crossing-type" aria-hidden="true"
          style={{ '--crossing-leading-letters': signal.word.length - 1 } as CSSProperties}>
          {signal.word.split('').map((letter, index) => (
            <svg key={`${index}-${letter}`} className={index === signal.word.length - 1 ? 'crossing-letter crossing-letter-tail' : 'crossing-letter'}
              viewBox={glyphBounds[letter]} preserveAspectRatio="none">
              <text x="0" y="0">{letter}</text>
            </svg>
          ))}
        </div>
        <fieldset className="crossing-signal" aria-label="Choose a traffic signal">
          {signals.map((item, index) => (
            <button key={item.name} className={`crossing-light crossing-light-${item.name}`} type="button"
              aria-label={`${item.word}: ${item.hint}`} aria-pressed={selected === index}
              title={item.word} onClick={() => select(index)}>
              <span className="crossing-lens" />
            </button>
          ))}
        </fieldset>
        <div className="crossing-road" aria-hidden="true"><div className="crossing-road-plane"><div ref={stripes} className="crossing-stripes" /></div></div>
      </div>
      <button className="crossing-play" type="button" aria-label={playing ? 'Pause traffic animation' : 'Play traffic animation'}
        aria-pressed={playing} disabled={reduced} title={reduced ? 'Reduced motion enabled. Select a light to explore.' : playing ? 'Pause' : 'Play'}
        onClick={() => setPlaying((current) => !current)}>
        {playing ? <Pause size={14} strokeWidth={1.7} aria-hidden="true" /> : <Play size={14} strokeWidth={1.7} aria-hidden="true" />}
      </button>
    </div>
  );
}

export function SignalCrossing({ replayKey }: { replayKey: number }) {
  return <CrossingStudy key={replayKey} />;
}
