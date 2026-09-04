'use client';

import { RotateCcw, X } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useState } from 'react';

const reflowPhotos = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=260&q=82',
  'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=260&q=82',
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=260&q=82',
  'https://images.unsplash.com/photo-1483058712412-4245e9b90334?auto=format&fit=crop&w=260&q=82',
  'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=260&q=82',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=260&q=82',
  'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=260&q=82',
  'https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=260&q=82',
];

export function SpringReflow({ replayKey }: { replayKey: number }) {
  const [visible, setVisible] = useState(() => reflowPhotos.map((_, index) => index));

  return (
    <motion.div key={replayKey} className="spring-reflow-demo" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="reflow-toolbar">
        <span>Remove a tile</span>
        <button
          type="button"
          onClick={() => setVisible(reflowPhotos.map((_, index) => index))}
          disabled={visible.length === reflowPhotos.length}
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>
      <LayoutGroup>
        <motion.div className="reflow-grid" layout>
          <AnimatePresence mode="popLayout">
            {visible.map((index) => (
              <motion.button
                type="button"
                layout
                key={reflowPhotos[index]}
                className="reflow-photo"
                onClick={() => setVisible((items) => items.filter((item) => item !== index))}
                aria-label="Remove photo and reflow the grid"
                initial={{ opacity: 0, scale: 0.82 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.64, rotate: index % 2 ? 4 : -4 }}
                transition={{
                  opacity: { duration: 0.16 },
                  scale: { duration: 0.2 },
                  layout: { type: 'spring', stiffness: 330, damping: 23, mass: 0.72 },
                }}
              >
                <img src={reflowPhotos[index]} alt="" />
                <span className="reflow-remove-indicator" aria-hidden="true">
                  <X size={15} strokeWidth={2.2} />
                </span>
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>
      <span className="mini-demo-hint">Same-row movement lands with a quiet rebound</span>
    </motion.div>
  );
}
