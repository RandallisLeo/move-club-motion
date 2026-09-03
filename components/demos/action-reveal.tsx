'use client';

import { FolderInput, Info, Share2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

const image =
  'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=720&q=85';

export function ActionReveal({ replayKey }: { replayKey: number }) {
  const [selected, setSelected] = useState(false);

  return (
    <motion.div key={replayKey} className="action-reveal-demo" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <button
        type="button"
        className="action-photo"
        onClick={() => setSelected((value) => !value)}
        aria-pressed={selected}
        aria-label={selected ? 'Deselect photo' : 'Select photo to reveal actions'}
      >
        <img src={image} alt="A warm creative workspace" />
        <AnimatePresence>
          {selected ? (
            <motion.span
              className="action-photo-state"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
            >
              Selected
            </motion.span>
          ) : null}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {selected ? (
          <motion.div
            className="reveal-dock"
            initial={{ opacity: 0, y: 18, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 27, mass: 0.78 }}
          >
            {[
              { icon: FolderInput, label: 'Move' },
              { icon: Info, label: 'Info' },
              { icon: Share2, label: 'Share' },
            ].map(({ icon: Icon, label }, index) => (
              <motion.button
                type="button"
                key={label}
                aria-label={label}
                initial={{ opacity: 0, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 + index * 0.045 }}
              >
                <Icon size={15} />
                <span>{label}</span>
              </motion.button>
            ))}
            <span className="reveal-divider" />
            <button type="button" aria-label="Close actions" onClick={() => setSelected(false)}>
              <X size={16} />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <span className="mini-demo-hint">Select the photo to reveal its actions</span>
    </motion.div>
  );
}
