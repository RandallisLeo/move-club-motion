'use client';

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { useCallback, useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import './switch-bounce.css';

// All distances are in the artwork's coordinate space, independent of stage size.
const TRAVEL = 276;
const ART_HEIGHT = 580;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

// Original vector lettering follows the reference's heavy, tightly set lowercase
// forms. The moving counter in the capsule supplies the shared letter “o”.
const nShape = 'M0 8H76V38C94 13 113 3 141 3C186 3 214 34 214 83V224H138V103C138 82 129 71 109 71C90 71 76 86 76 107V224H0Z';
const fShape = 'M0 82H16V77C16 26 45 0 92 0C111 0 126 1 139 6V62C131 60 123 59 116 59C99 59 91 65 91 79V82H139V140H91V292H16V140H0Z';

type Drag = {
  pointer: number;
  startY: number;
  start: number;
  scale: number;
  lastY: number;
  lastTime: number;
  velocity: number;
  moved: boolean;
};

function SwitchStudy({ replayKey }: { replayKey: number }) {
  const hintId = useId();
  const reducedMotion = !!useReducedMotion();
  const [on, setOn] = useState(false);
  const [dragging, setDragging] = useState(false);
  const offset = useMotionValue(TRAVEL);
  const bodyY = useMotionValue(0);
  const animations = useRef<ReturnType<typeof animate>[]>([]);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const previewTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const cy = useTransform(offset, (value) => 152 + clamp(value, -12, TRAVEL));
  // Position owns the color, so a held or reversed drag updates immediately.
  // Keep the palette in CSS; no release-triggered transition trails the hand.
  const trackFill = useTransform(offset, (value) => {
    const green = (1 - clamp(value / TRAVEL, 0, 1)) * 100;
    return `color-mix(in srgb, var(--switch-bounce-on) ${green}%, var(--switch-bounce-ink))`;
  });

  const stopMotion = useCallback(() => {
    animations.current.forEach((animation) => animation.stop());
    animations.current = [];
  }, []);

  const settle = useCallback((next: boolean, velocity?: number) => {
    stopMotion();
    setOn(next);
    const target = next ? 0 : TRAVEL;
    const from = offset.get();
    const distance = Math.abs(target - from);
    if (reducedMotion || distance < 0.5) {
      offset.jump(target);
      if (reducedMotion) bodyY.jump(0);
      else animations.current = [animate(bodyY, 0, { duration: 0.12, ease: 'easeOut' })];
      return;
    }

    const direction = target > from ? 1 : -1;
    const releaseSpeed = Math.max(0, (velocity ?? 0) * direction);
    if (next) {
      const riseTime = clamp(distance / (650 + releaseSpeed * 0.1), 0.16, 0.43);
      const floatPast = Math.min(12, distance * 0.055);
      const duration = riseTime + 0.15;
      // Buoyant ascent: only the circular thumb floats past its resting point
      // and drifts back once. The lettering and capsule receive no impact.
      animations.current = [
        animate(offset, [from, -floatPast, 0], {
          duration,
          times: [0, riseTime / duration, 1],
          ease: [[0.25, 0.05, 0.3, 1], [0.4, 0, 0.3, 1]],
        }),
        animate(bodyY, 0, { duration: 0.1, ease: 'easeOut' }),
      ];
      return;
    }

    const travelTime = clamp(distance / (1600 + releaseSpeed * 0.2), 0.09, 0.18);
    const duration = travelTime + 0.14;
    const impactTime = travelTime / duration;
    const recoil = Math.min(8, distance * 0.04);
    const bodyKick = 10 * clamp(distance / TRAVEL, 0, 1);

    // Weighty descent: accelerate into one firm contact, then settle promptly.
    // Finite keyframes keep the ball rigid and leave no lingering spring tail.
    animations.current = [
      animate(offset, [from, target, target - direction * recoil, target], {
        duration,
        times: [0, impactTime, (travelTime + 0.055) / duration, 1],
        ease: [[0.55, 0, 0.85, 0.6], [0.15, 0.75, 0.25, 1], [0.25, 0.1, 0.25, 1]],
      }),
      // Every letter and the capsule receive the same impulse, preserving the
      // composition's alignment throughout the contact and return.
      animate(bodyY, [bodyY.get(), 0, direction * bodyKick, 0], {
        duration,
        times: [0, impactTime, (travelTime + 0.025) / duration, 1],
        ease: ['easeOut', 'easeOut', [0.2, 0.7, 0.3, 1]],
      }),
    ];
  }, [bodyY, offset, reducedMotion, stopMotion]);

  function stopPreview() {
    previewTimers.current.forEach(clearTimeout);
    previewTimers.current = [];
  }

  useEffect(() => {
    if (replayKey > 0 && !reducedMotion) {
      previewTimers.current = [
        setTimeout(() => settle(true, 0), 120),
        setTimeout(() => settle(false, 0), 900),
      ];
    }
    return () => {
      stopPreview();
      stopMotion();
    };
  }, [replayKey, reducedMotion, settle, stopMotion]);

  // If the system preference changes mid-slide, finish at the chosen state.
  useEffect(() => {
    if (reducedMotion) {
      stopMotion();
      offset.jump(on ? 0 : TRAVEL);
      bodyY.jump(0);
    }
  }, [reducedMotion, on, offset, bodyY, stopMotion]);

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    stopPreview();
    stopMotion();
    bodyY.jump(0);
    suppressClick.current = false;
    drag.current = {
      pointer: event.pointerId,
      startY: event.clientY,
      start: offset.get(),
      scale: event.currentTarget.getBoundingClientRect().height / ART_HEIGHT,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocity: 0,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const state = drag.current;
    if (!state || state.pointer !== event.pointerId) return;
    const dy = event.clientY - state.startY;
    if (!state.moved && Math.abs(dy) < 4) return;
    if (!state.moved) {
      state.moved = true;
      setDragging(true);
    }
    const elapsed = event.timeStamp - state.lastTime;
    if (elapsed > 0) state.velocity = (event.clientY - state.lastY) / elapsed / state.scale * 1000;
    state.lastY = event.clientY;
    state.lastTime = event.timeStamp;
    const next = state.start + dy / state.scale;
    offset.set(clamp(next, -12, TRAVEL));
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const state = drag.current;
    if (!state || state.pointer !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (cancelled) {
      suppressClick.current = true;
      settle(on, 0);
      return;
    }
    if (!state.moved) return; // Native click also covers Enter, Space, and assistive technology.
    suppressClick.current = true;
    const velocity = event.timeStamp - state.lastTime < 100 ? clamp(state.velocity, -1200, 1200) : 0;
    const projected = offset.get() + velocity * 0.09;
    settle(projected < TRAVEL / 2, velocity);
  }

  return (
    <div className="switch-bounce-demo" data-state={on ? 'on' : 'off'} data-dragging={dragging}>
      <div className="switch-bounce-artwork">
        <button
          type="button"
          role="switch"
          className="switch-bounce-control"
          aria-label="On / off"
          aria-checked={on}
          aria-describedby={hintId}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={(event) => endDrag(event)}
          onPointerCancel={(event) => endDrag(event, true)}
          onLostPointerCapture={(event) => endDrag(event, true)}
          onClick={(event) => {
            if (suppressClick.current && event.detail > 0) {
              suppressClick.current = false;
              return;
            }
            suppressClick.current = false;
            stopPreview();
            settle(!on);
          }}
          onKeyDown={(event) => {
            stopPreview();
            if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
              event.preventDefault();
              settle(event.key === 'ArrowUp' || event.key === 'Home', 0);
            }
          }}
        >
          <svg className="switch-bounce-lettering" viewBox="0 0 620 580" fill="currentColor" aria-hidden="true">
            <motion.g className="switch-bounce-body" style={{ y: bodyY }}>
              <motion.rect className="switch-bounce-track" x="12" y="12" width="280" height="556" rx="140" style={{ fill: trackFill }} />
              <motion.circle className="switch-bounce-thumb" cx="152" cy={cy} r="110" />
              <path d={nShape} transform="translate(322 5)" />
              <path d={fShape} transform="translate(320 276)" />
              <path d={fShape} transform="translate(479 276)" />
            </motion.g>
          </svg>
        </button>
      </div>
      <span id={hintId} className="switch-bounce-hint">Tap or drag</span>
    </div>
  );
}

export function SwitchBounce({ replayKey }: { replayKey: number }) {
  return <SwitchStudy key={replayKey} replayKey={replayKey} />;
}
