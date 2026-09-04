'use client';

import { ArrowUp } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

const flyingPhotos = [
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=300&q=82',
  'https://images.unsplash.com/photo-1483058712412-4245e9b90334?auto=format&fit=crop&w=300&q=82',
  'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=300&q=82',
];

const storedPhotoLayout = [
  { x: 58, y: -125, rotate: -8 },
  { x: 0, y: -122, rotate: 4 },
  { x: -58, y: -126, rotate: -4 },
];

const routeControlLayout = [
  { x: 113, y: -300, rotate: -7, order: 2 },
  { x: 7, y: -270, rotate: 4, order: 1 },
  { x: -123, y: -240, rotate: -5, order: 0 },
];

const routeProgress = [0.16, 0.32, 0.48, 0.64, 0.8, 1];

function quadraticPoint(control: number, end: number, progress: number) {
  return 2 * (1 - progress) * progress * control + progress * progress * end;
}

export function CardFlight({ replayKey }: { replayKey: number }) {
  const [run, setRun] = useState(0);
  const [flying, setFlying] = useState(false);
  const [stored, setStored] = useState(false);
  const [folderCount, setFolderCount] = useState(0);

  useEffect(() => {
    if (!flying) return;
    const countTimers = [900, 960, 1025].map((delay, index) =>
      window.setTimeout(() => setFolderCount(index + 1), delay),
    );
    const storedTimer = window.setTimeout(() => setStored(true), 1080);
    const finishTimer = window.setTimeout(() => setFlying(false), 1240);
    return () => {
      countTimers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(storedTimer);
      window.clearTimeout(finishTimer);
    };
  }, [flying, run]);

  const start = () => {
    if (flying) return;
    setStored(false);
    setFolderCount(0);
    setRun((value) => value + 1);
    setFlying(true);
  };

  const frontAnimation = flying
    ? {
        rotateX: [0, -18, -18, 4, 0],
        y: [0, 4, 4, -2, 0],
        scale: [1, 1, 0.99, 1.018, 1],
      }
    : { rotateX: 0, y: 0, scale: 1 };

  const frontTransition = {
    duration: 1.36,
    times: [0, 0.14, 0.74, 0.88, 1],
    ease: 'easeInOut' as const,
  };

  return (
    <motion.div key={replayKey} className="card-flight-demo" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flight-scene">
        <div className="flight-folder">
          <motion.div
            className="flight-folder-back"
            animate={
              flying
                ? { y: [0, 4, 4, -2, 0], scale: [1, 1, 0.99, 1.018, 1] }
                : { y: 0, scale: 1 }
            }
            transition={{ duration: 1.36, times: [0, 0.14, 0.74, 0.88, 1], ease: 'easeInOut' }}
          />
          <motion.div
            className="flight-folder-front"
            style={{ transformPerspective: 240 }}
            animate={frontAnimation}
            transition={frontTransition}
          />
          <span className="flight-folder-label" aria-live="polite">
            <strong>Art</strong>
            {folderCount > 0 ? (
              <motion.span key={folderCount} initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }}>
                {folderCount}
              </motion.span>
            ) : null}
          </span>
        </div>

        <div className="flight-origin">
          {flyingPhotos.map((src, index) => {
            const control = routeControlLayout[index];
            const storedPosition = storedPhotoLayout[index];
            const routeStart = 0.145 + control.order * 0.055;
            const routeEnd = 0.74 + control.order * 0.055;
            const routeTimes = routeProgress.map(
              (progress) => routeStart + (routeEnd - routeStart) * progress,
            );
            const routeX = routeProgress.map((progress) =>
              quadraticPoint(control.x, storedPosition.x, progress),
            );
            const routeY = routeProgress.map((progress) =>
              quadraticPoint(control.y, storedPosition.y, progress),
            );
            const routeRotate = routeProgress.map(
              (progress) =>
                control.rotate * Math.sin(Math.PI * progress) + storedPosition.rotate * progress,
            );
            const motionTimes = [0, 0.14, routeStart, ...routeTimes, 1];

            return (
              <motion.img
                key={`${run}-${src}`}
                src={src}
                alt=""
                className="flying-card"
                style={{ left: index * 80 }}
                initial={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
                animate={
                  flying || stored
                    ? {
                        x: [0, 0, 0, ...routeX, storedPosition.x],
                        y: [0, 0, 0, ...routeY, storedPosition.y],
                        scale: [1, 0.61, 0.61, 0.61, 0.61, 0.61, 0.61, 0.61, 0.61, 0.61],
                        rotate: [0, 0, 0, ...routeRotate, storedPosition.rotate],
                        opacity: 1,
                      }
                    : { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }
                }
                transition={{
                  duration: 1.2,
                  times: motionTimes,
                  ease: 'linear',
                }}
              />
            );
          })}
        </div>
      </div>
      <button type="button" className="flight-trigger" onClick={start} disabled={flying}>
        <ArrowUp size={14} /> {stored ? 'Send again' : 'Send to Art'}
      </button>
    </motion.div>
  );
}
