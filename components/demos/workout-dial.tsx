'use client';

import { Dumbbell, Pause, Play, X } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { getWorkoutRelease } from './workout-reel-physics';
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
} from 'react';
import {
  DotNumber,
  WatchClock,
  WatchShell,
  useWatchTicker,
} from './watch-shared';

export function WorkoutDial({ replayKey }: { replayKey: number }) {
  return <WorkoutSession key={replayKey} />;
}
const MIN_MINUTES = 1;
const MAX_MINUTES = 60;
const INITIAL_MINUTES = 15;
// Matches the 2.25cqw tick spacing and 25%-wide ruler in the stylesheet.
const STEP_PER_RULER_WIDTH = 0.09;
const clampDuration = (value: number) =>
  Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, value));

// Keep the frame driver outside React: one cancellable, monotonic coast per gesture.
function animateReel(
  start: number,
  target: number,
  duration: number,
  decay: number,
  onUpdate: (position: number) => void,
  onComplete: () => void,
) {
  const startedAt = performance.now();
  const normalization = 1 - Math.exp(-duration / decay);
  let frameId: number;
  function frame(now: number) {
    const elapsed = Math.min(duration, now - startedAt);
    onUpdate(
      start +
        ((target - start) * (1 - Math.exp(-elapsed / decay))) / normalization,
    );
    if (elapsed < duration) frameId = requestAnimationFrame(frame);
    else {
      onUpdate(target);
      onComplete();
    }
  }
  frameId = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(frameId);
}

type WorkoutRulerHandle = { stop: () => number };

function WorkoutRuler({
  onChange,
  disabled,
  ref,
}: {
  onChange: (minutes: number) => void;
  disabled: boolean;
  ref: Ref<WorkoutRulerHandle>;
}) {
  const rulerRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(INITIAL_MINUTES);
  const selectedRef = useRef(INITIAL_MINUTES);
  const onChangeRef = useRef(onChange);
  const dragRef = useRef<{
    id: number;
    y: number;
    position: number;
    step: number;
    samples: { position: number; time: number }[];
  } | null>(null);
  const reduced = useReducedMotion();
  const coastAnimation = useRef<(() => void) | null>(null);
  const [coasting, setCoasting] = useState(false);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [position, setPosition] = useState(INITIAL_MINUTES);
  const [dragging, setDragging] = useState(false);
  const [moving, setMoving] = useState(false);
  const engaged = dragging || moving || coasting;

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const move = useCallback((nextPosition: number) => {
    const next = clampDuration(nextPosition);
    positionRef.current = next;
    setPosition(next);
    const selected = Math.round(next);
    if (selected !== selectedRef.current) {
      selectedRef.current = selected;
      onChangeRef.current(selected);
    }
  }, []);

  const stopCoasting = useCallback(() => {
    coastAnimation.current?.();
    coastAnimation.current = null;
    setCoasting(false);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      stop() {
        stopCoasting();
        if (wheelTimer.current) clearTimeout(wheelTimer.current);
        dragRef.current = null;
        setDragging(false);
        setMoving(false);
        const selected = Math.round(positionRef.current);
        move(selected);
        return selected;
      },
    }),
    [move, stopCoasting],
  );

  const coast = useCallback(
    (velocity = 0, travel = 0) => {
      stopCoasting();
      const start = positionRef.current;
      const { target, throwing } = getWorkoutRelease(start, velocity, travel);
      if (reduced) {
        move(target);
        return;
      }
      const distance = target - start;
      if (Math.abs(distance) < 0.0001) {
        move(target);
        return;
      }
      setCoasting(true);
      const duration = !throwing
        ? 180
        : Math.min(
            1500,
            Math.max(450, 380 * Math.log(1 + Math.abs(distance) / 0.1)),
          );
      const decay = throwing ? 380 : 65;
      coastAnimation.current = animateReel(
        start,
        target,
        duration,
        decay,
        move,
        () => {
          setCoasting(false);
          coastAnimation.current = null;
        },
      );
    },
    [move, stopCoasting, reduced],
  );

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    stopCoasting();
    if (wheelTimer.current) clearTimeout(wheelTimer.current);
    const box = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      id: event.pointerId,
      y: event.clientY,
      position: positionRef.current,
      step: box.width * STEP_PER_RULER_WIDTH,
      samples: [{ position: positionRef.current, time: event.timeStamp }],
    };
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    setMoving(false);
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    const origin = dragRef.current;
    if (origin && origin.id === event.pointerId) {
      move(origin.position - (event.clientY - origin.y) / origin.step);
      origin.samples.push({
        position: positionRef.current,
        time: event.timeStamp,
      });
      // Keep a short release-velocity window, not the average of the whole gesture.
      while (
        origin.samples.length > 2 &&
        origin.samples[1].time < event.timeStamp - 100
      )
        origin.samples.shift();
    }
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    const origin = dragRef.current;
    if (origin?.id !== event.pointerId) return;
    dragRef.current = null;
    if (wheelTimer.current) clearTimeout(wheelTimer.current);
    setDragging(false);
    setMoving(false);
    const first = origin.samples[0];
    const last = origin.samples[origin.samples.length - 1];
    const releaseDelay = Math.max(0, event.timeStamp - last.time);
    // A pause before release removes the throw; cancellation never adds momentum.
    const velocity =
      event.type === 'pointerup' && releaseDelay < 140 && last.time > first.time
        ? ((last.position - first.position) / (last.time - first.time)) *
          1000 *
          Math.exp(-releaseDelay / 80)
        : 0;
    coast(velocity, positionRef.current - origin.position);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const offsets: Record<string, number> = {
      ArrowUp: 1,
      ArrowRight: 1,
      ArrowDown: -1,
      ArrowLeft: -1,
      PageUp: 5,
      PageDown: -5,
    };
    if (!(event.key in offsets) && event.key !== 'Home' && event.key !== 'End')
      return;
    event.preventDefault();
    stopCoasting();
    if (wheelTimer.current) clearTimeout(wheelTimer.current);
    setMoving(!reduced);
    wheelTimer.current = setTimeout(() => setMoving(false), 180);
    move(
      event.key === 'Home'
        ? MIN_MINUTES
        : event.key === 'End'
          ? MAX_MINUTES
          : Math.round(positionRef.current) + offsets[event.key],
    );
  }

  useEffect(() => {
    const ruler = rulerRef.current!;
    function wheel(event: WheelEvent) {
      if (
        event.ctrlKey ||
        dragRef.current ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
      )
        return;
      event.preventDefault();
      stopCoasting();
      const box = ruler.getBoundingClientRect();
      const pixels =
        event.deltaY *
        (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? box.height : 1);
      move(positionRef.current - pixels / (box.width * STEP_PER_RULER_WIDTH));
      setMoving(true);
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
      wheelTimer.current = setTimeout(() => {
        setMoving(false);
        coast();
      }, 140);
    }
    ruler.addEventListener('wheel', wheel, { passive: false });
    return () => {
      ruler.removeEventListener('wheel', wheel);
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
      coastAnimation.current?.();
    };
  }, [coast, move, stopCoasting]);

  return (
    <div
      ref={rulerRef}
      inert={disabled}
      aria-hidden={disabled}
      className={`workout-ruler${dragging ? ' is-dragging' : ''}${coasting ? ' is-coasting' : ''}${engaged ? ' is-energized' : ''}`}
      // A relative-drag reel needs a fixed selection line; native ranges jump to the click position.
      // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label="Workout duration"
      aria-valuemin={MIN_MINUTES}
      aria-valuemax={MAX_MINUTES}
      aria-valuenow={Math.round(position)}
      aria-valuetext={`${Math.round(position)} minutes`}
      aria-orientation="vertical"
      onPointerDown={startDrag}
      onPointerMove={drag}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onLostPointerCapture={finishDrag}
      onKeyDown={onKeyDown}
    >
      <div
        className="workout-tape"
        style={{ '--reel-offset': INITIAL_MINUTES - position } as CSSProperties}
        aria-hidden="true"
      >
        {Array.from({ length: 81 }, (_, index) => {
          const value = 70 - index;
          const inRange = value >= MIN_MINUTES && value <= MAX_MINUTES;
          // A spatial lens: tape position, scale and light update together,
          // without a second animation chasing the moving tick.
          const influence = engaged
            ? Math.exp(-Math.pow((value - position) / 4.5, 2))
            : 0;
          return (
            <div
              className={`workout-tick${value % 5 === 0 ? ' is-major' : ''}`}
              key={value}
              style={
                {
                  top: `calc(var(--workout-marker-y) + ${(value - INITIAL_MINUTES) * 2.25}cqw)`,
                  opacity: inRange ? 0.22 + influence * 0.78 : 0.08,
                  '--tick-swell': influence,
                } as CSSProperties
              }
            >
              <i />
              {inRange && value % 5 === 0 && (
                <span
                  style={{
                    opacity: Math.max(
                      0,
                      Math.min(1, (Math.abs(value - position) - 1) / 2),
                    ),
                  }}
                >
                  {value}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="workout-selection-marker" aria-hidden="true">
        <svg className="workout-pointer" viewBox="0 0 9 12">
          <path d="M1 1L8 6L1 11Z" fill="currentColor" />
        </svg>
        <div className="workout-needle" />
        <span className="workout-selection-value">{Math.round(position)}</span>
      </div>
    </div>
  );
}

function WorkoutSession() {
  const ruler = useRef<WorkoutRulerHandle>(null);
  const [minutes, setMinutes] = useState(INITIAL_MINUTES);
  const [seconds, setSeconds] = useState(INITIAL_MINUTES * 60);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [countIn, setCountIn] = useState(0);
  const root = useWatchTicker(
    () => {
      if (countIn > 0) setCountIn((value) => value - 1);
      else setSeconds((value) => Math.max(0, value - 1));
    },
    running && seconds > 0,
    1000,
  );
  const playing = running && seconds > 0;
  return (
    <WatchShell
      kind="workout-dial"
      rootRef={root}
      hint="Scroll to set duration"
    >
      <div className="watch-badge">
        <Dumbbell />
      </div>
      <WatchClock />
      <div className={`workout-content${started ? ' is-session' : ''}`}>
        <WorkoutRuler
          ref={ruler}
          disabled={started}
          onChange={(next) => {
            setMinutes(next);
            setSeconds(next * 60);
          }}
        />
        <div className="workout-main">
          <span className="watch-label">Workout</span>
          <div className="workout-readout">
            <div
              className="workout-value workout-duration"
              aria-hidden={started}
            >
              <DotNumber
                value={String(minutes).padStart(2, '0')}
                animateChanges={false}
                label={`${minutes} minutes`}
              />
              <span className="workout-unit">m</span>
            </div>
            <div
              className={`workout-value workout-timer${countIn > 0 ? ' is-counting-in' : ''}`}
              aria-hidden={!started}
            >
              <DotNumber
                key={countIn > 0 ? `ready-${countIn}` : 'timer'}
                value={
                  countIn > 0
                    ? String(countIn)
                    : `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
                }
                label={
                  countIn > 0
                    ? `Workout starts in ${countIn} seconds`
                    : `${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds remaining`
                }
              />
            </div>
          </div>
          <output className="workout-status" aria-live="off">
            {started && seconds === 0
              ? 'SESSION COMPLETE'
              : started
                ? playing
                  ? countIn > 0
                    ? 'GET READY'
                    : 'TIME TO MOVE'
                  : 'PAUSED'
                : 'YOUR TIME. YOUR PACE.'}
          </output>
        </div>
        <div className="workout-actions">
          <button
            className="watch-round is-white"
            aria-label="End workout and reset"
            onClick={() => {
              setRunning(false);
              setStarted(false);
              setCountIn(0);
              setSeconds(minutes * 60);
            }}
          >
            <X />
          </button>
          <button
            className="watch-round"
            aria-label={
              playing
                ? 'Pause workout'
                : started && seconds > 0
                  ? 'Resume workout'
                  : 'Start workout'
            }
            onClick={() => {
              if (!started) {
                const selected = ruler.current?.stop() ?? minutes;
                setMinutes(selected);
                setSeconds(selected * 60);
                setStarted(true);
                setCountIn(3);
                setRunning(true);
              } else {
                if (seconds === 0) {
                  setSeconds(minutes * 60);
                  setCountIn(3);
                }
                setRunning(!playing);
              }
            }}
          >
            {playing ? (
              <Pause fill="currentColor" />
            ) : (
              <Play fill="currentColor" />
            )}
          </button>
        </div>
      </div>
    </WatchShell>
  );
}
