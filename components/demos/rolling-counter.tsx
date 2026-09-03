'use client';

import { Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

function ReelDigit({ value }: { value: number }) {
  return (
    <span className="reel-window" aria-hidden="true">
      <motion.span
        className="reel-track"
        animate={{ y: `${value * -1}em` }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        {Array.from({ length: 10 }, (_, digit) => (
          <span key={digit}>{digit}</span>
        ))}
      </motion.span>
    </span>
  );
}

export function RollingCounter({ replayKey }: { replayKey: number }) {
  const [count, setCount] = useState(8);
  const digits = String(count).padStart(2, '0').split('').map(Number);

  return (
    <motion.div key={replayKey} className="rolling-counter-demo" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <span className="counter-eyebrow">Selected photos</span>
      <motion.div className="rolling-number" layout aria-live="polite" aria-label={`${count} selected photos`}>
        {digits.map((digit, index) => (
          <ReelDigit key={`${index}-${digits.length}`} value={digit} />
        ))}
      </motion.div>
      <button type="button" className="counter-add" onClick={() => setCount((value) => (value + 1) % 100)}>
        <Plus size={15} /> Add one
      </button>
      <span className="mini-demo-hint">Each digit travels inside its own mask</span>
    </motion.div>
  );
}
