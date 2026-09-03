'use client';

import { motion } from 'motion/react';
import { useState } from 'react';

const words = ['MOVE', 'WITH', 'INTENT'];

export function TypeShift({ replayKey }: { replayKey: number }) {
  const [active, setActive] = useState(false);

  return (
    <button
      type="button"
      className="type-shift"
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      aria-label="Animate the words Move with intent"
    >
      {words.map((word, index) => (
        <span className="type-line" key={`${word}-${replayKey}`}>
          <motion.span
            animate={{ y: active ? '-100%' : '0%' }}
            transition={{ duration: 0.5, delay: index * 0.055, ease: [0.76, 0, 0.24, 1] }}
          >
            {word}
          </motion.span>
          <motion.span
            aria-hidden="true"
            animate={{ y: active ? '-100%' : '0%' }}
            transition={{ duration: 0.5, delay: index * 0.055, ease: [0.76, 0, 0.24, 1] }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </button>
  );
}
