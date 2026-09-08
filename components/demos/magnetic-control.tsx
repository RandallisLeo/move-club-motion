'use client';

import { motion } from 'motion/react';
import { useState } from 'react';

export function MagneticControl() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  return (
    <div
      className="magnetic-area"
      onPointerMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        setPosition({
          x: (event.clientX - bounds.left - bounds.width / 2) * 0.16,
          y: (event.clientY - bounds.top - bounds.height / 2) * 0.16,
        });
      }}
      onPointerLeave={() => setPosition({ x: 0, y: 0 })}
    >
      <motion.button
        type="button"
        className="magnetic-button"
        animate={position}
        transition={{ type: 'spring', stiffness: 180, damping: 14, mass: 0.55 }}
      >
        Explore
      </motion.button>
      <span className="orbit orbit-one" />
      <span className="orbit orbit-two" />
    </div>
  );
}
