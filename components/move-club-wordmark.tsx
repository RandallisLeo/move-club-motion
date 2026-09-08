'use client';

import { animate, cubicBezier, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { useEffect, useRef, type PointerEvent } from 'react';

// One continuous contour lets the open ring become an open palm without an
// icon swap. Each hand curve has a corresponding exact circular arc at rest.
const handCurves = [
  [25, 26, 27, 24, 27, 20],
  [27, 18, 27, 16, 27, 14],
  [27, 11.3, 23, 11.3, 23, 14],
  [23, 14, 23, 16, 23, 16],
  [23, 14, 23, 10, 23, 8],
  [23, 5.3, 19, 5.3, 19, 8],
  [19, 8, 19, 14, 19, 14],
  [19, 12, 19, 7, 19, 5],
  [19, 2.3, 15, 2.3, 15, 5],
  [15, 5, 15, 14, 15, 14],
  [15, 12, 15, 9, 15, 8],
  [15, 5.3, 11, 5.3, 11, 8],
  [11, 10, 11, 16, 11, 20],
  [10, 18.8, 8, 16.5, 7, 15.8],
  [5.2, 14.4, 2.5, 16.5, 4, 18.5],
  [5.5, 20.5, 8, 24.4, 10, 26.2],
  [11.5, 27.7, 13, 28.5, 15, 29],
];
const handPath = `M 22 28 ${handCurves.map(curve => `C ${curve.join(' ')}`).join(' ')}`;
const arcStart = 0.7;
const arcStep = -4.9 / handCurves.length;
const ringPath = `M ${16 + 10 * Math.cos(arcStart)} ${16 + 10 * Math.sin(arcStart)} ${handCurves.map((_, index) => {
  const a = arcStart + index * arcStep;
  const b = a + arcStep;
  const handle = (4 / 3) * Math.tan(arcStep / 4);
  const points = [
    16 + 10 * (Math.cos(a) - handle * Math.sin(a)),
    16 + 10 * (Math.sin(a) + handle * Math.cos(a)),
    16 + 10 * (Math.cos(b) + handle * Math.sin(b)),
    16 + 10 * (Math.sin(b) - handle * Math.cos(b)),
    16 + 10 * Math.cos(b),
    16 + 10 * Math.sin(b),
  ];
  return `C ${points.map(value => value.toFixed(4)).join(' ')}`;
}).join(' ')}`;
const settle = cubicBezier(0.4, 0, 0.2, 1);
// Align the contour's direction with the palm before it unfolds. The inner
// rotation puts the opening back in the original upper-right position at rest.
const restingTurn = 4.2 * 180 / Math.PI - 360;
const restingDotX = 16 + 7.7 * Math.cos(-4.2) + 6.4 * Math.sin(-4.2);
const restingDotY = 16 + 7.7 * Math.sin(-4.2) - 6.4 * Math.cos(-4.2);

export function MoveClubWordmark() {
  const reducedMotion = useReducedMotion();
  const progress = useMotionValue(0);
  const animation = useRef<ReturnType<typeof animate> | null>(null);
  const playing = useRef(false);
  const form = useTransform(progress, [0, 0.23, 0.77, 1], [0, 1, 1, 0], { ease: settle });
  const path = useTransform(form, [0, 1], [ringPath, handPath]);
  const strokeWidth = useTransform(form, [0, 1], [5, 2.6]);
  const scale = useTransform(form, [0, 1], [1, 1.14]);
  const unfold = useTransform(form, [0, 1], [restingTurn, 0]);
  const dotX = useTransform(form, [0, 1], [restingDotX, 18.5]);
  const dotY = useTransform(form, [0, 1], [restingDotY, 28.7]);
  const dotRadius = useTransform(form, [0, 1], [2.8, 1.9]);
  const rotate = useTransform(
    progress,
    [0, 0.23, 0.35, 0.47, 0.59, 0.71, 0.82, 1],
    [0, -9, 14, -11, 11, -5, 0, 0],
    { ease: settle },
  );

  useEffect(() => {
    if (reducedMotion) {
      animation.current?.stop();
      progress.jump(0);
      playing.current = false;
    }
    return () => { animation.current?.stop(); };
  }, [progress, reducedMotion]);

  function greet() {
    if (reducedMotion || playing.current) return;
    playing.current = true;
    progress.jump(0);
    animation.current = animate(progress, 1, {
      duration: 1.6,
      ease: 'linear',
      onComplete: () => { playing.current = false; },
    });
  }

  function onPointerEnter(event: PointerEvent<HTMLAnchorElement>) {
    if (event.pointerType !== 'touch') greet();
  }

  return (
    <a className="wordmark" href="#top" aria-label="Move Club home" onPointerEnter={onPointerEnter} onFocus={greet} onClick={greet}>
      <span className="wordmark-mark" aria-hidden="true">
        <motion.svg viewBox="0 0 32 32" style={{ rotate, scale, transformOrigin: '50% 84%' }}>
          <motion.g style={{ rotate: unfold, transformOrigin: '16px 16px' }}>
            <motion.path className="move-club-ring" d={path} strokeWidth={strokeWidth} />
            <motion.circle className="move-club-dot" cx={dotX} cy={dotY} r={dotRadius} />
          </motion.g>
        </motion.svg>
      </span>
      <span>Move Club</span>
      <span className="byline">By Randall D</span>
    </a>
  );
}
