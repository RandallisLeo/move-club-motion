'use client';

import { motion } from 'motion/react';
import { useLayoutEffect, useRef, useState } from 'react';

const tabs = ['Art', 'Travel', 'Editorial', 'Photography'];

export function FluidFolderHover({ replayKey }: { replayKey: number }) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const [active, setActive] = useState(1);
  const [bubble, setBubble] = useState({ x: 0, width: 0 });

  const moveTo = (index: number, pointerX?: number) => {
    const target = buttons.current[index];
    if (!target) return;
    const bounds = target.getBoundingClientRect();
    const magnet = pointerX === undefined ? 0 : (pointerX - bounds.left - bounds.width / 2) * 0.08;
    setActive(index);
    setBubble({ x: target.offsetLeft + magnet, width: target.offsetWidth });
  };

  useLayoutEffect(() => moveTo(1), []);

  return (
    <motion.div key={replayKey} className="folder-hover-demo" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <span className="folder-hover-label">Select the tab</span>
      <div className="folder-choice-bar" onPointerLeave={() => moveTo(active)}>
        <motion.span
          className="folder-choice-bubble"
          animate={{ x: bubble.x, width: bubble.width }}
          transition={{ type: 'spring', stiffness: 420, damping: 31, mass: 0.72 }}
        />
        {tabs.map((tab, index) => (
          <button
            type="button"
            key={tab}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            className={active === index ? 'is-active' : ''}
            onPointerEnter={(event) => moveTo(index, event.clientX)}
            onPointerMove={(event) => moveTo(index, event.clientX)}
            onFocus={() => moveTo(index)}
          >
            {tab}
          </button>
        ))}
      </div>
      <span className="mini-demo-hint">One shared bubble follows every option</span>
    </motion.div>
  );
}
