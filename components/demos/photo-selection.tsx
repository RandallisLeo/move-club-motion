'use client';

import { Check } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

const photos = [
  {
    src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=520&q=85',
    alt: 'A quiet mountain landscape',
  },
  {
    src: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=520&q=85',
    alt: 'A bright creative studio',
  },
  {
    src: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=520&q=85',
    alt: 'Modern architecture against the sky',
  },
  {
    src: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=520&q=85',
    alt: 'A colorful modern interior',
  },
];

export function PhotoSelection({ replayKey }: { replayKey: number }) {
  const [selected, setSelected] = useState<number[]>([]);

  return (
    <motion.div
      key={replayKey}
      className="photo-selection-demo"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="mini-demo-heading">
        <span>Select moments</span>
        {selected.length > 0 ? (
          <motion.span
            className="selection-count"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="selection-count-window" aria-hidden="true">
              <motion.span
                className="selection-count-track"
                initial={{ y: '0em' }}
                animate={{ y: `${selected.length * -1}em` }}
                transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
              >
                {Array.from({ length: 10 }, (_, digit) => (
                  <span key={digit}>{digit}</span>
                ))}
              </motion.span>
            </span>
            <span>selected</span>
          </motion.span>
        ) : null}
      </div>

      <div className="selection-grid">
        {photos.map((photo, index) => {
          const isSelected = selected.includes(index);
          return (
            <motion.button
              type="button"
              key={photo.src}
              className="selection-photo"
              aria-label={`${isSelected ? 'Deselect' : 'Select'} ${photo.alt}`}
              aria-pressed={isSelected}
              onClick={() =>
                setSelected((items) =>
                  items.includes(index) ? items.filter((item) => item !== index) : [...items, index],
                )
              }
              animate={{ scale: isSelected ? 0.88 : 1 }}
              whileTap={{ scale: isSelected ? 0.85 : 0.94 }}
              transition={{ type: 'spring', stiffness: 430, damping: 25, mass: 0.72 }}
            >
              <img src={photo.src} alt="" draggable={false} />
              <AnimatePresence>
                {isSelected ? (
                  <motion.span
                    className="selection-check"
                    initial={{ scale: 0.35, opacity: 0, rotate: -25 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.35, opacity: 0, rotate: 20 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 22 }}
                  >
                    <Check size={13} strokeWidth={3} />
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
      <span className="mini-demo-hint">Tap any photo</span>
    </motion.div>
  );
}
