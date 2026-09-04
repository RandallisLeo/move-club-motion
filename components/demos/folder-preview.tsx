'use client';

import { motion } from 'motion/react';
import { useState } from 'react';

const folders = [
  {
    name: 'Tennis',
    images: [
      'https://images.unsplash.com/photo-1542144582-1ba00456b5e3?auto=format&fit=crop&w=240&q=82',
      'https://images.unsplash.com/photo-1531310197839-ccf54634509e?auto=format&fit=crop&w=240&q=82',
    ],
    offsets: [-14, 14],
    angles: [-8, 7],
  },
  {
    name: 'Office',
    images: [
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=240&q=82',
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=240&q=82',
      'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=240&q=82',
    ],
    offsets: [-18, 0, 18],
    angles: [-7, 2, 8],
  },
  {
    name: 'Art',
    images: [
      'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=240&q=82',
    ],
    offsets: [0],
    angles: [-3],
  },
];

export function FolderPreview({ replayKey }: { replayKey: number }) {
  const [active, setActive] = useState<number | null>(null);

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
              onMouseEnter={() => setActive(folderIndex)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(folderIndex)}
              onBlur={() => setActive(null)}
              aria-label={`${folder.name}, ${folder.images.length} photos`}
            >
              <span className="preview-folder-back" />
              <span className="preview-photo-stack">
                {folder.images.map((src, index) => (
                  <motion.img
                    src={src}
                    alt=""
                    key={src}
                    animate={{
                      x: isActive ? folder.offsets[index] : folder.offsets[index] * 0.28,
                      y: isActive ? -20 - index * 2 : -16 - index,
                      rotate: isActive ? folder.angles[index] : folder.angles[index] * 0.2,
                      scale: isActive ? 1 : 0.84,
                      opacity: isActive ? 1 : 0.72,
                    }}
                    transition={{ type: 'spring', stiffness: 310, damping: 24, delay: index * 0.035 }}
                  />
                ))}
              </span>
              <motion.span
                className="preview-folder-front"
                style={{ transformPerspective: 240 }}
                animate={{ y: isActive ? 3 : 0, rotateX: isActive ? -9 : 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 25 }}
              />
              <span className="preview-folder-name">
                <strong>{folder.name}</strong>
                <span>{folder.images.length}</span>
              </span>
            </button>
          );
        })}
      </div>
      <span className="mini-demo-hint">Each folder keeps its own composition</span>
    </motion.div>
  );
}
