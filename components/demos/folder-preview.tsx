'use client';

import { motion } from 'motion/react';
import { useState } from 'react';

const folders = [
  {
    name: 'Tennis',
    images: [
      'https://images.unsplash.com/photo-1542144582-1ba00456b5e3?auto=format&fit=crop&w=240&q=82',
      'https://images.unsplash.com/photo-1531310197839-ccf54634509e?auto=format&fit=crop&w=240&q=82',
      'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=240&q=82',
    ],
    offsets: [-17, 7, 21],
    angles: [-10, 5, 13],
  },
  {
    name: 'Office',
    images: [
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=240&q=82',
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=240&q=82',
      'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=240&q=82',
    ],
    offsets: [18, -20, 2],
    angles: [11, -8, 2],
  },
  {
    name: 'Art',
    images: [
      'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=240&q=82',
      'https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=240&q=82',
      'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=240&q=82',
    ],
    offsets: [-24, 18, -2],
    angles: [-13, 10, -1],
  },
];

export function FolderPreview({ replayKey }: { replayKey: number }) {
  const [active, setActive] = useState(1);

  return (
    <motion.div key={replayKey} className="folder-preview-demo" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="preview-folder-row">
        {folders.map((folder, folderIndex) => {
          const isActive = active === folderIndex;
          return (
            <button
              type="button"
              className={isActive ? 'preview-folder is-active' : 'preview-folder'}
              key={folder.name}
              onClick={() => setActive(folderIndex)}
              aria-pressed={isActive}
            >
              <span className="preview-folder-back" />
              <span className="preview-photo-stack">
                {folder.images.map((src, index) => (
                  <motion.img
                    src={src}
                    alt=""
                    key={src}
                    animate={{
                      x: isActive ? folder.offsets[index] : folder.offsets[index] * 0.3,
                      y: isActive ? -34 - index * 5 : -10 - index * 2,
                      rotate: isActive ? folder.angles[index] : folder.angles[index] * 0.25,
                      scale: isActive ? 1 : 0.82,
                      opacity: isActive ? 1 : 0.6,
                    }}
                    transition={{ type: 'spring', stiffness: 310, damping: 24, delay: index * 0.035 }}
                  />
                ))}
              </span>
              <motion.span
                className="preview-folder-front"
                animate={{ y: isActive ? 3 : 0, opacity: isActive ? 0.76 : 0.92 }}
              />
              <span className="preview-folder-name">{folder.name}</span>
            </button>
          );
        })}
      </div>
      <span className="mini-demo-hint">Each folder keeps its own composition</span>
    </motion.div>
  );
}
