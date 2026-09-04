'use client';

import { Minus, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

const REEL_STEP_EM = 1.12;

function ReelDigit({ position, length }: { position: number; length: number }) {
  return (
    <span className="reel-window" aria-hidden="true">
      <motion.span
        className="reel-track"
        initial={false}
        animate={{ y: `${position * -REEL_STEP_EM}em` }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        {Array.from({ length }, (_, index) => (
          <span key={index}>{index % 10}</span>
        ))}
      </motion.span>
    </span>
  );
}

export function RollingCounter({ replayKey }: { replayKey: number }) {
  const [count, setCount] = useState(8);

  return (
    <motion.div key={replayKey} className="rolling-counter-demo" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="counter-composition">
        <span className="counter-eyebrow">Selected items</span>
        <div className="counter-main-row">
          <motion.div className="rolling-number" layout aria-live="polite" aria-label={`${count} selected items`}>
            <ReelDigit position={Math.floor(count / 10)} length={10} />
            <ReelDigit position={count} length={100} />
          </motion.div>
          <div className="counter-stepper" aria-label="Adjust selected item count">
            <motion.button
              type="button"
              onClick={() => setCount((value) => Math.max(0, value - 1))}
              disabled={count === 0}
              aria-label="Decrease selected item count"
              whileTap={{ scale: 0.9, y: 1, backgroundColor: 'rgba(220, 223, 230, 0.62)' }}
              transition={{ type: 'spring', stiffness: 520, damping: 28 }}
            >
              <Minus size={16} />
            </motion.button>
            <span className="counter-stepper-divider" />
            <motion.button
              type="button"
              onClick={() => setCount((value) => Math.min(99, value + 1))}
              disabled={count === 99}
              aria-label="Increase selected item count"
              whileTap={{ scale: 0.9, y: 1, backgroundColor: 'rgba(220, 223, 230, 0.62)' }}
              transition={{ type: 'spring', stiffness: 520, damping: 28 }}
            >
              <Plus size={16} />
            </motion.button>
          </div>
        </div>
      </div>
      <span className="mini-demo-hint">Use − and + to roll in either direction</span>
    </motion.div>
  );
}
