'use client';

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import './nature-studies.css';

const periods = [
  { name: 'Week', values: [18, 30, 26, 39, 35, 51, 58], total: 12840, gain: 4.8 },
  { name: 'Month', values: [28, 22, 46, 34, 59, 49, 77], total: 24680, gain: 12.6 },
  { name: 'Year', values: [22, 38, 33, 55, 69, 61, 91], total: 58320, gain: 27.4 },
];

function TideDigit({ digit, period, reduced }: { digit: number; period: number; reduced: boolean }) {
  const position = useMotionValue(digit);
  const y = useTransform(position, value => `${-value * 1.06}em`);
  const previous = useRef(period);
  useEffect(() => {
    if (reduced) { position.set(digit); previous.current = period; return; }
    if (previous.current === period) return;
    previous.current = period;
    const playback = animate(position, digit + 20, {
      duration: 1.15, ease: [0.22, 1, 0.36, 1], onComplete: () => position.set(digit),
    });
    return () => playback.stop();
  }, [digit, period, position, reduced]);
  return <span className="data-tide-digit"><motion.span style={{ y }}>{Array.from({ length: 30 }, (_, i) => <span key={i}>{i % 10}</span>)}</motion.span></span>;
}

function TideStudy() {
  const [period, setPeriod] = useState(0);
  const reduced = !!useReducedMotion();
  const current = periods[period];
  return <div className="data-tide-demo">
    <div className="data-tide-panel">
      <div className="data-tide-heading"><span>FIELD NOTES / ACTIVITY</span><span className="data-tide-live">Live</span></div>
      <div className="data-tide-number" aria-live="polite" aria-label={`${current.total.toLocaleString('en-US')} observations`}>
        <span className="data-tide-reels" aria-hidden="true">{current.total.toLocaleString('en-US').split('').map((char, i) => char === ',' ? <span key={i}>,</span> : <TideDigit key={i} digit={Number(char)} period={period} reduced={reduced} />)}</span>
      </div>
      <div className="data-tide-summary"><span>observations collected</span><span>+{current.gain}%</span></div>
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Animated SVG bars need one accessible chart name. */}
      <svg viewBox="0 0 270 98" className="data-tide-chart" role="img" aria-label={`${current.name} activity chart: ${current.values.join(', ')}`}>
        {[24, 49, 74].map(y => <path key={y} d={`M0 ${y} H270`} stroke="var(--line)" strokeDasharray="2 5" />)}
        {current.values.map((height, i) => <motion.rect key={i} x={i * 39 + 6} width="22" rx="3" initial={false} animate={{ y: 96 - height, height }} fill={i === 6 ? 'var(--accent)' : '#bec1fb'} transition={{ duration: reduced ? 0 : 1.15, ease: [0.22, 1, 0.36, 1] }} />)}
      </svg>
      <div className="data-tide-days">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => <span key={i}>{day}</span>)}</div>
      <fieldset className="data-tide-periods" aria-label="Observation period">
        {periods.map((item, i) => <button key={item.name} type="button" aria-pressed={i === period} onClick={() => setPeriod(i)}>{i === period && <motion.span layoutId="data-tide-selection" className="data-tide-selection" transition={{ type: 'spring', stiffness: 320, damping: 32 }} />}<span>{item.name}</span></button>)}
      </fieldset>
    </div>
    <span className="data-tide-hint">Change the period. Follow the same rhythm.</span>
  </div>;
}

export function DataTide({ replayKey }: { replayKey: number }) { return <TideStudy key={replayKey} />; }
