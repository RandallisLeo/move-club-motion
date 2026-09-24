'use client';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useId, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import Link from 'next/link';
import {
  createColorFlow,
  type FlowStudy,
  type FlowRenderer,
} from './color-flow-engine';
import './color-flow.css';

export function ColorFlow({
  study,
  expanded = false,
  styleSelector,
}: {
  study: FlowStudy;
  expanded?: boolean;
  styleSelector?: ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLSpanElement>(null);
  const refreshRef = useRef<(() => void) | null>(null),
    resetRef = useRef<(() => void) | null>(null);
  const [paused, setPaused] = useState(false),
    [reduced, setReduced] = useState(false),
    [available, setAvailable] = useState(true);
  const [revision, setRevision] = useState(0),
    [palette, setPalette] = useState(0),
    [grain, setGrain] = useState(0.8);
  const [detail, setDetail] = useState(study.defaultDetail),
    [speed, setSpeed] = useState(study.defaultSpeed);
  const settings = useRef({ paused, reduced, palette, grain, detail, speed });
  const id = useId();
  // Card pose is a DOM transform only. It never changes shader sampling coordinates.
  const tiltX = useMotionValue(0),
    tiltY = useMotionValue(0),
    pressure = useMotionValue(1);
  const rotateX = useSpring(tiltX, { stiffness: 200, damping: 22 });
  const rotateY = useSpring(tiltY, { stiffness: 200, damping: 22 });
  const scale = useSpring(pressure, { stiffness: 420, damping: 20 });
  const resetPose = () => {
    tiltX.set(0);
    tiltY.set(0);
    pressure.set(1);
  };
  useEffect(() => {
    settings.current = { paused, reduced, palette, grain, detail, speed };
    refreshRef.current?.();
  }, [paused, reduced, palette, grain, detail, speed]);
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    const setup = async () => {
      let engine: FlowRenderer | null;
      if (study.mount && surfaceRef.current) {
        engine = await study.mount(surfaceRef.current);
      } else {
        const nativeCanvas = canvasRef.current;
        if (!nativeCanvas || !study.fragment) return;
        const native = createColorFlow(nativeCanvas, study.fragment);
        engine = native ? { ...native, canvas: nativeCanvas } : null;
      }
      if (cancelled) {
        engine?.dispose();
        return;
      }
      setAvailable(!!engine);
      if (!engine) return;
      const canvas = engine.canvas;
      const preference = matchMedia('(prefers-reduced-motion: reduce)');
      let frame = 0,
        last = 0,
        elapsed = 0,
        visible = true,
        lost = false;
      const paint = () =>
        engine.draw(
          elapsed,
          settings.current.grain,
          settings.current.detail,
          study.palettes[settings.current.palette],
        );
      const canMove = () =>
        visible &&
        !document.hidden &&
        !lost &&
        !settings.current.paused &&
        !settings.current.reduced;
      const tick = (now: number) => {
        frame = 0;
        if (!canMove()) {
          last = 0;
          return;
        }
        const delta = last ? Math.min((now - last) / 1000, 0.05) : 0;
        last = now;
        elapsed += delta * settings.current.speed;
        paint();
        frame = requestAnimationFrame(tick);
      };
      const refresh = () => {
        cancelAnimationFrame(frame);
        frame = 0;
        last = 0;
        if (!lost) paint();
        if (engine.setPlayback)
          engine.setPlayback(canMove() ? settings.current.speed : 0);
        else if (canMove()) frame = requestAnimationFrame(tick);
      };
      const onPreference = () => {
        settings.current.reduced = preference.matches;
        setReduced(preference.matches);
        refresh();
      };
      const onLost = (event: Event) => {
        event.preventDefault();
        lost = true;
        setAvailable(false);
        refresh();
      };
      const onRestored = () => setRevision((value) => value + 1);
      const resize = new ResizeObserver(() => {
        engine.resize();
        refresh();
      });
      const intersection = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        refresh();
      });
      refreshRef.current = refresh;
      resetRef.current = () => {
        elapsed = 0;
        engine.restart?.();
        refresh();
      };
      engine.resize();
      onPreference();
      resize.observe(canvas);
      intersection.observe(canvas);
      preference.addEventListener('change', onPreference);
      document.addEventListener('visibilitychange', refresh);
      canvas.addEventListener('webglcontextlost', onLost);
      canvas.addEventListener('webglcontextrestored', onRestored);
      cleanup = () => {
        cancelAnimationFrame(frame);
        resize.disconnect();
        intersection.disconnect();
        preference.removeEventListener('change', onPreference);
        document.removeEventListener('visibilitychange', refresh);
        canvas.removeEventListener('webglcontextlost', onLost);
        canvas.removeEventListener('webglcontextrestored', onRestored);
        refreshRef.current = null;
        resetRef.current = null;
        engine.dispose();
      };
    };
    void setup().catch((error) => {
      if (!cancelled) {
        setAvailable(false);
        console.error(error);
      }
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [study, revision]);
  const colors = study.palettes[palette];
  const speedLabel = study.speedLabel ?? 'Flow speed';
  const pauseButton = (
    <button
      type="button"
      className="color-flow-button"
      disabled={reduced || !available}
      onClick={() => setPaused(!paused)}
      aria-label={paused ? 'Play color flow' : 'Pause color flow'}
      aria-pressed={paused}
    >
      {paused || reduced ? <Play size={14} /> : <Pause size={14} />}
      <span>{reduced ? 'Still' : paused ? 'Play' : 'Pause'}</span>
    </button>
  );
  return (
    <div
      className={`color-flow-demo ${study.slug}-demo${expanded ? ' color-flow-demo--expanded' : ''}`}
      style={
        {
          '--flow-ink': colors.ink,
          '--flow-paper': colors.paper,
        } as CSSProperties
      }
    >
      {styleSelector}
      {expanded && !styleSelector && (
        <label className="color-flow-mobile-speed">
          <span>{speedLabel}</span>
          <input
            aria-label={`Quick ${speedLabel.toLowerCase()}`}
            type="range"
            min=".25"
            max="5"
            step=".05"
            value={speed}
            disabled={reduced || !available}
            onChange={(event) => setSpeed(Number(event.target.value))}
          />
          <output>{speed.toFixed(2)}×</output>
        </label>
      )}
      <div className="color-flow-window">
        <motion.button
          type="button"
          className="color-flow-card"
          aria-label={`Press ${study.title} card`}
          aria-describedby={`${id}-hint`}
          style={{
            rotateX: reduced ? 0 : rotateX,
            rotateY: reduced ? 0 : rotateY,
            scale: reduced ? 1 : scale,
            transformPerspective: 900,
          }}
          onPointerMove={(event) => {
            if (reduced) return;
            const rect =
              event.currentTarget.parentElement!.getBoundingClientRect();
            const x = Math.max(
              -1,
              Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1),
            );
            const y = Math.max(
              -1,
              Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1),
            );
            event.currentTarget.style.setProperty('--flow-light-x', `${(x + 1) * 50}%`);
            event.currentTarget.style.setProperty('--flow-light-y', `${(y + 1) * 50}%`);
            tiltX.set(-y * 10);
            tiltY.set(x * 10);
          }}
          onPointerDown={() => {
            if (!reduced) pressure.set(0.965);
          }}
          onPointerUp={(event) => {
            pressure.set(1);
            if (event.pointerType === 'touch') resetPose();
          }}
          onPointerLeave={resetPose}
          onPointerCancel={resetPose}
          onBlur={resetPose}
          onKeyDown={(event) => {
            if (reduced) return;
            if (event.key === 'Enter' || event.key === ' ') {
              pressure.set(0.965);
              return;
            }
            if (
              [
                'ArrowLeft',
                'ArrowRight',
                'ArrowUp',
                'ArrowDown',
                'Home',
              ].includes(event.key)
            ) {
              event.preventDefault();
              if (event.key === 'Home') {
                resetPose();
                return;
              }
              const axis =
                event.key === 'ArrowLeft' || event.key === 'ArrowRight'
                  ? tiltY
                  : tiltX;
              axis.set(
                Math.max(
                  -10,
                  Math.min(
                    10,
                    axis.get() +
                      (event.key === 'ArrowLeft' || event.key === 'ArrowDown'
                        ? -3
                        : 3),
                  ),
                ),
              );
            }
          }}
          onKeyUp={(event) => {
            if (event.key === 'Enter' || event.key === ' ') pressure.set(1);
          }}
        >
          {study.mount ? (
            <span
              ref={surfaceRef}
              className="color-flow-surface"
              aria-hidden="true"
              style={{ opacity: available ? 1 : 0 }}
            />
          ) : (
            <canvas
              ref={canvasRef}
              aria-hidden="true"
              style={{ opacity: available ? 1 : 0 }}
            />
          )}
        </motion.button>
        <span id={`${id}-hint`} className="color-flow-sr">
          Move across the card to tilt it. Press and release for a soft rebound.
          Keyboard: arrow keys tilt, Home centers, Enter or Space presses.
        </span>
      </div>
      {expanded ? (
        <div className="color-flow-panel">
          {!styleSelector && <div className="color-flow-panel-heading">
            <span className="color-flow-kicker">
              {study.index} / {study.label.toUpperCase()}
            </span>
            <h2>
              {study.heading.split('\n').map((line, i) => (
                <span key={i}>{line}</span>
              ))}
            </h2>
            <p>{study.description}</p>
          </div>}
          <fieldset className="color-flow-palettes">
            <legend className={styleSelector ? 'color-flow-sr' : undefined}>Palette</legend>
            <div>
              {study.palettes.map((color, i) => (
                <button
                  type="button"
                  key={color.label}
                  title={color.label}
                  aria-label={`${color.label} palette`}
                  aria-pressed={palette === i}
                  onClick={() => setPalette(i)}
                >
                  <i aria-hidden="true" style={{ background: color.ink }} />
                  {!styleSelector && color.label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="color-flow-range">
            <span>
              {speedLabel} <output>{speed.toFixed(2)}×</output>
            </span>
            <input
              aria-label={speedLabel}
              type="range"
              min=".25"
              max="5"
              step=".05"
              value={speed}
              disabled={reduced || !available}
              onChange={(event) => setSpeed(Number(event.target.value))}
            />
            <small>
              Slow <span>Fast</span>
            </small>
          </label>
          <label className="color-flow-range">
            <span>
              {study.parameter}
              <output>{Math.round(detail * 100)}%</output>
            </span>
            <input
              aria-label={study.parameter}
              type="range"
              min="0"
              max="1"
              step=".01"
              value={detail}
              onChange={(event) => setDetail(Number(event.target.value))}
            />
          </label>
          {study.granular && (
            <label className="color-flow-range">
              <span>
                Grain<output>{Math.round(grain * 100)}%</output>
              </span>
              <input
                aria-label="Grain"
                type="range"
                min="0"
                max="1"
                step=".01"
                value={grain}
                onChange={(event) => setGrain(Number(event.target.value))}
              />
            </label>
          )}
          {!styleSelector && <div className="color-flow-actions">
            {pauseButton}
            <button
              type="button"
              className="color-flow-button"
              disabled={!available}
              onClick={() => {
                resetPose();
                resetRef.current?.();
              }}
            >
              <RotateCcw size={14} />
              Restart
            </button>
          </div>}
          {!styleSelector && <p className="color-flow-note">
            {!available
              ? 'Static preview · WebGL is unavailable.'
              : reduced
                ? 'Still composition · reduced motion is enabled.'
                : study.note}
            {study.sourceCredit && (
              <a
                className="color-flow-source"
                href={study.sourceCredit.url}
                target="_blank"
                rel="noreferrer"
              >
                {study.sourceCredit.label}
              </a>
            )}
          </p>}
        </div>
      ) : (
        <div className="color-flow-compact">
          {pauseButton}
          <button
            type="button"
            className="color-flow-speed"
            aria-label={`Change ${speedLabel.toLowerCase()}, currently ${speed} times`}
            disabled={reduced || !available}
            onClick={() =>
              setSpeed(speed < 2 ? 2 : speed < 3 ? 3 : speed < 5 ? 5 : 1)
            }
          >
            {speed}×
          </button>
          <Link href={`/studies/${study.slug}`}>Explore</Link>
          {!available && <span>Static</span>}
        </div>
      )}
    </div>
  );
}
