'use client';

import { motion } from 'motion/react';
import { useId, useRef, useState } from 'react';
import { useStudyReducedMotion } from './agent-study-shared';

const pages = [
  { label: 'Sketches', kicker: '01 / THE FIRST MARK', title: 'Start with a shape.', note: 'A circle. A fold. A little room to play.' },
  { label: 'Motion', kicker: '02 / GIVE IT A NUDGE', title: 'Let it find its rhythm.', note: 'Some things spring. Others take their time.' },
  { label: 'Notes', kicker: '03 / LOOK A LITTLE CLOSER', title: 'Keep what you notice.', note: 'The pause is part of the movement, too.' },
  { label: 'Source', kicker: '04 / PASS IT ON', title: 'Leave the door open.', note: 'One small study. Another starting point.' },
];

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Inline SVG charts need an image role to expose one accessible description. */
function ChapterChart({ page }: { page: number }) {
  const headers = [
    { label: 'Weekly sketches', value: '125', unit: 'marks' },
    { label: 'Motion progress', value: '84', unit: '%' },
    { label: 'Study mix', value: '', unit: '3 types' },
    { label: 'Daily activity', value: '', unit: '4 weeks' },
  ];
  const header = headers[page];
  let plot;
  if (page === 0) {
    const values = [9, 14, 11, 21, 25, 17, 28];
    plot = <div className="tabs-turn-chart-body">
      <svg className="tabs-turn-chart" viewBox="0 0 236 52" preserveAspectRatio="none" role="img" aria-label="Sample bar chart: 125 sketches over seven days, with 28 on the final day.">
        {[10, 28, 46].map(y => <path key={y} className="tabs-turn-chart-grid" d={`M 0 ${y} H 236`} />)}
        {values.map((value, index) => <rect key={index} x={8 + index * 33} y={46 - value * 1.4} width="20" height={value * 1.4} rx="2" fill={index === 6 ? 'var(--accent)' : index === 4 ? '#b2b5fa' : '#dedfff'} />)}
      </svg>
      <div className="tabs-turn-chart-axis tabs-turn-chart-days" aria-hidden="true">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <span key={index}>{day}</span>)}</div>
    </div>;
  } else if (page === 1) {
    const values = [12, 28, 46, 42, 67, 84];
    const positions = values.map((value, index) => ({ x: 4 + index * 45.6, y: 46 - value * 0.47 }));
    const line = positions.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
    plot = <div className="tabs-turn-chart-body">
      <svg className="tabs-turn-chart" viewBox="0 0 236 52" preserveAspectRatio="none" role="img" aria-label="Sample area and line chart: motion progress across six weeks rises from 12 percent to 84 percent.">
        {[10, 28, 46].map(y => <path key={y} className="tabs-turn-chart-grid" d={`M 0 ${y} H 236`} />)}
        <path d={`${line} L 232 46 L 4 46 Z`} fill="var(--accent-soft)" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="232" cy={positions[5].y} r="3" fill="var(--accent)" stroke="white" strokeWidth="1.5" />
      </svg>
      <div className="tabs-turn-chart-axis" aria-hidden="true"><span>W01</span><span>W03</span><span>W06</span></div>
    </div>;
  } else if (page === 2) {
    const shares = [48, 32, 20];
    const colors = ['var(--accent)', '#abaef7', '#dedfff'];
    const circumference = 2 * Math.PI * 24;
    plot = <div className="tabs-turn-chart-mix">
      <svg className="tabs-turn-chart tabs-turn-chart-donut" viewBox="0 0 64 64" role="img" aria-label="Sample donut chart: sketches 48 percent, motion 32 percent, notes 20 percent.">
        {shares.map((share, index) => <circle key={index} cx="32" cy="32" r="24" fill="none" stroke={colors[index]} strokeWidth="8" strokeDasharray={`${circumference * share / 100 - 2} ${circumference * (1 - share / 100) + 2}`} strokeDashoffset={-circumference * shares.slice(0, index).reduce((total, value) => total + value, 0) / 100} transform="rotate(-90 32 32)" />)}
      </svg>
      <div className="tabs-turn-chart-legend" aria-hidden="true">{shares.map((share, index) => <div key={index}><span className="tabs-turn-chart-swatch" style={{ background: colors[index] }} /><span>{['Sketches', 'Motion', 'Notes'][index]}</span><span className="tabs-turn-chart-share">{share}%</span></div>)}</div>
    </div>;
  } else {
    const activity = [[1, 0, 2, 1, 3, 1, 0], [2, 1, 2, 3, 1, 0, 1], [3, 2, 1, 2, 3, 2, 1], [2, 3, 3, 1, 2, 3, 2]];
    const shades = ['var(--accent-soft)', '#d7d9ff', '#abaef7', 'var(--accent)'];
    plot = <div className="tabs-turn-chart-body">
      <svg className="tabs-turn-chart" viewBox="0 0 236 52" preserveAspectRatio="none" role="img" aria-label="Sample heatmap: four weeks of daily activity, with darker squares representing more activity.">
        {activity.map((week, row) => <g key={row}>{week.map((level, column) => <rect key={column} x={4 + column * 33} y={2 + row * 12.5} width="28" height="9" rx="2" fill={shades[level]} />)}</g>)}
      </svg>
      <div className="tabs-turn-chart-axis tabs-turn-chart-days" aria-hidden="true">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <span key={index}>{day}</span>)}</div>
    </div>;
  }
  return <div className="tabs-turn-data">
    <div className="tabs-turn-chart-header"><span>{header.label}</span><span className="tabs-turn-chart-metric">{header.value && <strong>{header.value}</strong>}<span>{header.unit}</span></span></div>
    {plot}
  </div>;
}
/* oxlint-enable jsx-a11y/prefer-tag-over-role */

function TurnPage({ page, active, reduced = false }: { page: number; active: boolean; reduced?: boolean }) {
  const current = pages[page];
  return <div aria-hidden={!active} className={`tabs-turn-page tabs-turn-page-${page}`}
    style={{ transform: reduced ? undefined : `rotateX(${-page * 90}deg) translateZ(var(--tabs-turn-depth))` }}>
    <span className="tabs-turn-kicker">{current.kicker}</span>
    <div className="tabs-turn-illustration"><ChapterChart page={page} /></div>
    <h4>{current.title}</h4><p>{current.note}</p><span className="tabs-turn-folio">{String(page + 1).padStart(2, '0')} / 04</span>
  </div>;
}

function TurnStudy() {
  const reduced = useStudyReducedMotion();
  const [page, setPage] = useState(0);
  const [rotation, setRotation] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const markerTransition = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 380, damping: 31, mass: 0.85 };
  function select(next: number, step = next - page) {
    if (next === page) return;
    setRotation(value => value + step * 90);
    setPage(next);
  }
  return <div className="tabs-turn-demo">
    <div className="tabs-turn-layout">
      <div className="tabs-turn-tabs" role="tablist" aria-label="Study chapters" aria-orientation="vertical">
        <motion.span className="tabs-turn-marker" aria-hidden="true" initial={false} animate={{ y: page * 38 }} transition={markerTransition} />
        {pages.map((item, index) => <button ref={element => { tabs.current[index] = element; }} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel`} aria-selected={page === index} tabIndex={page === index ? 0 : -1} key={item.label} onClick={() => select(index)} onKeyDown={event => {
          let next = index;
          if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % pages.length;
          else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index + pages.length - 1) % pages.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = pages.length - 1;
          else return;
          event.preventDefault();
          const step = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : next - index;
          select(next, step); tabs.current[next]?.focus();
        }}>
          {page === index && <motion.span className="tabs-turn-active" layoutId={`${id}-active`} transition={markerTransition} />}
          <motion.span className="tabs-turn-label" initial={false} animate={{ x: page === index ? 12 : 0 }} transition={markerTransition}>{item.label}</motion.span>
        </button>)}
      </div>
      <div className="tabs-turn-book" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${page}`} tabIndex={0}>
        <div className="tabs-turn-window">
          {reduced ? <TurnPage page={page} active reduced /> : <div className="tabs-turn-reel-axis">
            <motion.div className="tabs-turn-reel" initial={false} animate={{ rotateX: rotation }} transition={{ duration: 0.85, ease: [0.4, 0, 0.2, 1] }}>
              {pages.map((_, index) => <TurnPage key={index} page={index} active={page === index} />)}
            </motion.div>
          </div>}
        </div>
      </div>
    </div>
    <span className="agent-study-hint">Choose a chapter · the page follows</span>
  </div>;
}
export function TabsTurn({ replayKey }: { replayKey: number }) { return <TurnStudy key={replayKey} />; }
