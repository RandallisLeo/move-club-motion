'use client';

import { Redo2, Undo2 } from 'lucide-react';
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react';
import {
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import './signal-focus.css';

type Signal = {
  name: string;
  role: string;
  value: string;
  color: string;
  ink: string;
};

type Flight = {
  left: number;
  top: number;
  size: number;
  targetLeft: number;
  targetTop: number;
  targetSize: number;
};

const signals: Signal[] = [
  { name: 'Lumen', role: 'Light study', value: '12 traces', color: '#d9d2ff', ink: '#4d42a8' },
  { name: 'Tempo', role: 'Rhythm study', value: '08 beats', color: '#c8f3e6', ink: '#216b59' },
  { name: 'Arc', role: 'Spatial study', value: '05 paths', color: '#ffe2b9', ink: '#8b5821' },
  { name: 'Bloom', role: 'Growth study', value: '09 states', color: '#ffd5df', ink: '#964258' },
  { name: 'Echo', role: 'Feedback study', value: '16 signals', color: '#cfeaf6', ink: '#2d647b' },
  { name: 'Pulse', role: 'Motion study', value: '11 cycles', color: '#dddfe4', ink: '#4f5661' },
  { name: 'Drift', role: 'Timing study', value: '07 loops', color: '#d8f19a', ink: '#526d17' },
  { name: 'Halo', role: 'Focus study', value: '04 layers', color: '#ecd3f5', ink: '#70427d' },
  { name: 'Moss', role: 'Material study', value: '06 surfaces', color: '#d6e7d8', ink: '#46624a' },
  { name: 'Kite', role: 'Path study', value: '14 turns', color: '#cbe5ff', ink: '#356180' },
  { name: 'Flare', role: 'Color study', value: '10 tones', color: '#ffcfc1', ink: '#8c4c39' },
  { name: 'Tide', role: 'Flow study', value: '13 waves', color: '#c7eee8', ink: '#2d6b63' },
  { name: 'Dawn', role: 'Reveal study', value: '03 scenes', color: '#f7e4a8', ink: '#7c6523' },
  { name: 'Veil', role: 'Depth study', value: '09 planes', color: '#dfd7ef', ink: '#62527d' },
  { name: 'Loop', role: 'Cycle study', value: '18 rounds', color: '#d5ebee', ink: '#446c72' },
  { name: 'Ember', role: 'Energy study', value: '15 sparks', color: '#ecc9cc', ink: '#7b484d' },
];

const outerIndexes = [0, 3, 6, 9, 12, 2, 5];
const innerIndexes = [1, 4, 7, 10, 13];

const speedPresets = [
  { name: 'Slow', outer: 0.55, inner: 0.7 },
  { name: 'Flow', outer: 1, inner: 1.15 },
  { name: 'Quick', outer: 1.55, inner: 1.8 },
] as const;

export function SignalFocus({ replayKey }: { replayKey: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<number, HTMLButtonElement>());
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [arrived, setArrived] = useState(false);
  const [returning, setReturning] = useState(false);
  const [outerSpeed, setOuterSpeed] = useState(1);
  const [innerSpeed, setInnerSpeed] = useState(1.15);
  const [selectedPreset, setSelectedPreset] = useState<string>('Flow');
  const [outerDirection, setOuterDirection] = useState<1 | -1>(1);
  const [innerDirection, setInnerDirection] = useState<1 | -1>(-1);

  const outerAngle = useMotionValue(-12);
  const innerAngle = useMotionValue(14);
  const outerCounterAngle = useTransform(outerAngle, (angle) => -angle);
  const innerCounterAngle = useTransform(innerAngle, (angle) => -angle);

  const activeSignal = activeIndex === null ? null : signals[activeIndex];

  useAnimationFrame((time, delta) => {
    if (activeIndex !== null || reducedMotion) return;
    const safeDelta = Math.min(delta, 40) / 1000;
    const outerCadence = 0.82 + Math.sin(time / 1450) * 0.18;
    const innerCadence = 0.84 + Math.sin(time / 1120 + 1.2) * 0.16;
    outerAngle.set(outerAngle.get() + 5.4 * outerSpeed * outerDirection * outerCadence * safeDelta);
    innerAngle.set(innerAngle.get() + 7.2 * innerSpeed * innerDirection * innerCadence * safeDelta);
  });

  function selectSignal(event: MouseEvent<HTMLButtonElement>, index: number) {
    event.stopPropagation();
    if (activeIndex !== null) {
      releaseSignal();
      return;
    }

    const root = rootRef.current;
    const visual = visualRef.current;
    if (!root || !visual) return;

    const rootRect = root.getBoundingClientRect();
    const visualRect = visual.getBoundingClientRect();
    const nodeCore = event.currentTarget.querySelector<HTMLElement>('.signal-focus-node-core');
    const nodeRect = (nodeCore ?? event.currentTarget).getBoundingClientRect();
    const targetSize = Math.min(82, visualRect.width * 0.22);
    const focusWidth = targetSize + 17 + 64;
    const visualLeft = visualRect.left - rootRect.left;
    const visualTop = visualRect.top - rootRect.top;
    const targetLeft = visualLeft + Math.max(18, (visualRect.width - focusWidth) / 2);
    const targetTop = visualTop + (visualRect.height - targetSize) / 2;
    const left = nodeRect.left - rootRect.left;
    const top = nodeRect.top - rootRect.top;

    setArrived(false);
    setReturning(false);
    setActiveIndex(index);
    setFlight({
      left,
      top,
      size: nodeRect.width,
      targetLeft,
      targetTop,
      targetSize,
    });
  }

  function applySpeedPreset(preset: (typeof speedPresets)[number]) {
    setOuterSpeed(preset.outer);
    setInnerSpeed(preset.inner);
    setSelectedPreset(preset.name);
  }

  function releaseSignal() {
    if (returning || activeIndex === null || !flight || !rootRef.current) return;
    const source = nodeRefs.current.get(activeIndex);
    if (!source) return;

    const rootRect = rootRef.current.getBoundingClientRect();
    const sourceCore = source.querySelector<HTMLElement>('.signal-focus-node-core');
    const sourceRect = (sourceCore ?? source).getBoundingClientRect();
    const left = sourceRect.left - rootRect.left;
    const top = sourceRect.top - rootRect.top;
    setArrived(false);
    setReturning(true);
    setFlight((current) => current ? {
      ...current,
      left,
      top,
      size: sourceRect.width,
    } : current);
  }

  function renderNode(index: number, position: number, total: number, ring: 'outer' | 'inner') {
    const signal = signals[index];
    const angle = ((360 / total) * position + (ring === 'outer' ? -82 : -52)) * Math.PI / 180;
    const radius = 43;
    const x = 50 + Math.cos(angle) * radius;
    const y = 50 + Math.sin(angle) * radius;
    const size = ring === 'outer' ? 31 + (position % 3) * 3 : 34 + (position % 2) * 4;

    return (
      <button
        key={signal.name}
        ref={(node) => {
          if (node) nodeRefs.current.set(index, node);
          else nodeRefs.current.delete(index);
        }}
        type="button"
        className={`signal-focus-node${activeIndex === index ? ' is-source' : ''}`}
        style={{
          '--node-x': `${x}%`,
          '--node-y': `${y}%`,
          '--node-size': `${size}px`,
          '--node-color': signal.color,
          '--node-ink': signal.ink,
        } as CSSProperties}
        aria-label={`Bring ${signal.name} into focus, ${signal.role}`}
        aria-pressed={activeIndex === index}
        onClick={(event) => selectSignal(event, index)}
      >
        <motion.span
          className="signal-focus-node-core"
          style={{ rotate: ring === 'outer' ? outerCounterAngle : innerCounterAngle }}
          aria-hidden="true"
        >
          <span>{signal.name.slice(0, 1)}</span>
          <i />
        </motion.span>
      </button>
    );
  }

  return (
    <div
      key={replayKey}
      ref={rootRef}
      className={`signal-focus-demo${activeSignal ? ' is-focusing' : ''}${returning ? ' is-returning' : ''}`}
    >
      <div ref={visualRef} className="signal-focus-visual">
        <div className="signal-focus-labels" aria-hidden="true">
          <span>LIVE NETWORK</span>
          <span>{activeSignal ? 'IN FOCUS' : 'CHOOSE A SIGNAL'}</span>
        </div>

        <div className="signal-focus-field">
          <motion.div
            className="signal-focus-cloud signal-focus-cloud-outer"
            style={{ rotate: outerAngle }}
          >
            {outerIndexes.map((index, position) => renderNode(index, position, outerIndexes.length, 'outer'))}
          </motion.div>
          <motion.div
            className="signal-focus-cloud signal-focus-cloud-inner"
            style={{ rotate: innerAngle }}
          >
            {innerIndexes.map((index, position) => renderNode(index, position, innerIndexes.length, 'inner'))}
          </motion.div>
        </div>

        <span className="signal-focus-hint">
          {activeSignal ? 'Click anywhere to return' : 'Tap any moving signal'}
        </span>
      </div>

      {activeSignal ? (
        <button
          type="button"
          className="signal-focus-return-surface"
          aria-label={`Return ${activeSignal.name} to the orbit`}
          onClick={releaseSignal}
        />
      ) : null}

      {activeSignal && flight ? (
        <motion.button
          key={activeSignal.name}
          type="button"
          className="signal-focus-flight"
          style={{
            '--node-color': activeSignal.color,
            '--node-ink': activeSignal.ink,
            left: flight.targetLeft,
            top: flight.targetTop,
            width: flight.targetSize,
            height: flight.targetSize,
          } as CSSProperties}
          aria-label={`Return ${activeSignal.name} to the orbit`}
          initial={{
            x: flight.left + flight.size / 2 - (flight.targetLeft + flight.targetSize / 2),
            y: flight.top + flight.size / 2 - (flight.targetTop + flight.targetSize / 2),
            scale: flight.size / flight.targetSize,
            opacity: 1,
          }}
          animate={{
            x: returning
              ? flight.left + flight.size / 2 - (flight.targetLeft + flight.targetSize / 2)
              : 0,
            y: returning
              ? flight.top + flight.size / 2 - (flight.targetTop + flight.targetSize / 2)
              : 0,
            scale: returning ? flight.size / flight.targetSize : 1,
            opacity: 1,
          }}
          transition={reducedMotion
            ? { duration: 0.01 }
            : {
                duration: returning ? 0.54 : 0.58,
                ease: [0.2, 0.84, 0.24, 1],
              }}
          onClick={(event) => {
            event.stopPropagation();
            releaseSignal();
          }}
          onAnimationComplete={() => {
            if (returning) {
              setActiveIndex(null);
              setFlight(null);
              setReturning(false);
            } else {
              setArrived(true);
            }
          }}
        >
          <motion.span
            className="signal-focus-avatar"
            aria-hidden="true"
            initial={{ rotate: -7 }}
            animate={{ rotate: returning ? -3 : 0 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.48, ease: [0.2, 0.84, 0.24, 1] }}
          >
            <span>{activeSignal.name.slice(0, 1)}</span>
            <i />
          </motion.span>
        </motion.button>
      ) : null}

      {activeSignal && flight ? (
        <motion.div
          key={`${activeSignal.name}-copy`}
          className="signal-focus-copy"
          style={{
            left: flight.targetLeft + flight.targetSize + 17,
            top: flight.targetTop + Math.max(0, (flight.targetSize - 73) / 2),
          }}
          initial={{
            opacity: 0,
            x: -15,
            rotate: -18,
            scaleX: 0.28,
            scaleY: 0.9,
          }}
          animate={!returning
            ? {
                opacity: 1,
                x: 0,
                rotate: 0,
                scaleX: 1,
                scaleY: 1,
              }
            : {
                opacity: 0,
                x: -10,
                rotate: -12,
                scaleX: 0.38,
                scaleY: 0.94,
              }}
          transition={{
            duration: reducedMotion ? 0.01 : returning ? 0.38 : 0.52,
            ease: [0.2, 0.84, 0.24, 1],
          }}
        >
          <strong>{activeSignal.name}</strong>
          <span>{activeSignal.role}</span>
          <small>{activeSignal.value}</small>
        </motion.div>
      ) : null}

      <div className="signal-focus-controls">
        <div className="signal-focus-presets" aria-label="Orbit speed presets">
          {speedPresets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className={selectedPreset === preset.name ? 'is-active' : ''}
              aria-pressed={selectedPreset === preset.name}
              onClick={() => applySpeedPreset(preset)}
            >
              {preset.name}
            </button>
          ))}
        </div>

        <div className="signal-focus-speed-bars">
          <div className="signal-focus-speed-control">
            <div className="signal-focus-speed-heading">
              <span>Outer <output>{outerSpeed.toFixed(2)}×</output></span>
              <button
                type="button"
                aria-label={`Reverse outer orbit. Currently ${outerDirection === 1 ? 'clockwise' : 'counterclockwise'}`}
                title="Reverse outer orbit"
                onClick={() => setOuterDirection((direction) => direction === 1 ? -1 : 1)}
              >
                {outerDirection === 1 ? <Redo2 size={14} /> : <Undo2 size={14} />}
              </button>
            </div>
            <input
              type="range"
              min="0.4"
              max="2"
              step="0.05"
              value={outerSpeed}
              aria-label="Outer orbit speed"
              onChange={(event) => {
                setOuterSpeed(Number(event.target.value));
                setSelectedPreset('');
              }}
            />
          </div>
          <div className="signal-focus-speed-control">
            <div className="signal-focus-speed-heading">
              <span>Inner <output>{innerSpeed.toFixed(2)}×</output></span>
              <button
                type="button"
                aria-label={`Reverse inner orbit. Currently ${innerDirection === 1 ? 'clockwise' : 'counterclockwise'}`}
                title="Reverse inner orbit"
                onClick={() => setInnerDirection((direction) => direction === 1 ? -1 : 1)}
              >
                {innerDirection === 1 ? <Redo2 size={14} /> : <Undo2 size={14} />}
              </button>
            </div>
            <input
              type="range"
              min="0.4"
              max="2"
              step="0.05"
              value={innerSpeed}
              aria-label="Inner orbit speed"
              onChange={(event) => {
                setInnerSpeed(Number(event.target.value));
                setSelectedPreset('');
              }}
            />
          </div>
        </div>
      </div>

      <span className="signal-focus-announcement" aria-live="polite">
        {arrived && activeSignal
          ? `${activeSignal.name}. ${activeSignal.role}. ${activeSignal.value}.`
          : activeSignal
            ? `${activeSignal.name} is moving into focus.`
            : 'Choose a moving signal.'}
      </span>
    </div>
  );
}
