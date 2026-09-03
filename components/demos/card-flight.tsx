'use client';

import { ArrowUp } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

const flyingPhotos = [
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=300&q=82',
  'https://images.unsplash.com/photo-1483058712412-4245e9b90334?auto=format&fit=crop&w=300&q=82',
  'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=300&q=82',
];

export function CardFlight({ replayKey }: { replayKey: number }) {
  const [run, setRun] = useState(0);
  const [flying, setFlying] = useState(false);
  const [stored, setStored] = useState(false);

  useEffect(() => {
    if (!flying) return;
    const storedTimer = window.setTimeout(() => setStored(true), 760);
    const finishTimer = window.setTimeout(() => setFlying(false), 1120);
    return () => {
      window.clearTimeout(storedTimer);
      window.clearTimeout(finishTimer);
    };
  }, [flying, run]);

  const start = () => {
    if (flying) return;
    setStored(false);
    setRun((value) => value + 1);
    setFlying(true);
  };

  return (
    <motion.div key={replayKey} className="card-flight-demo" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flight-scene">
        <motion.div
          className="flight-folder"
          animate={flying ? { y: [0, 4, -3, 0], scale: [1, 0.985, 1.025, 1] } : { y: 0, scale: 1 }}
          transition={{ duration: 0.72, times: [0, 0.28, 0.68, 1], delay: 0.28 }}
        >
          <div className="flight-folder-back" />
          <AnimatePresenceLite visible={stored} />
          <motion.div
            className="flight-folder-front"
            animate={flying ? { rotateX: [0, -18, -18, 0], y: [0, 5, 5, 0] } : { rotateX: 0, y: 0 }}
            transition={{ duration: 0.75, delay: 0.2, times: [0, 0.22, 0.68, 1] }}
          />
          <span>Art</span>
        </motion.div>

        <div className="flight-origin">
          {flyingPhotos.map((src, index) => (
            <motion.img
              key={`${run}-${src}`}
              src={src}
              alt=""
              className="flying-card"
              style={{ left: index * 68 }}
              initial={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
              animate={
                flying || stored
                  ? {
                      x: 160 - index * 68 + index * 8,
                      y: -126 - index * 7,
                      scale: 0.48,
                      rotate: [-index * 2, index % 2 ? 8 : -7],
                      opacity: stored ? 0 : 1,
                    }
                  : { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }
              }
              transition={{
                duration: 0.62,
                delay: index * 0.07,
                ease: [0.22, 0.75, 0.24, 1],
                opacity: { duration: 0.16 },
              }}
            />
          ))}
        </div>
      </div>
      <button type="button" className="flight-trigger" onClick={start} disabled={flying}>
        <ArrowUp size={14} /> {stored ? 'Send again' : 'Send to Art'}
      </button>
    </motion.div>
  );
}

function AnimatePresenceLite({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <motion.div className="stored-mini-stack" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {flyingPhotos.map((src, index) => (
        <img key={src} src={src} alt="" style={{ transform: `translateX(${index * 10}px) rotate(${index * 7 - 7}deg)` }} />
      ))}
    </motion.div>
  );
}
