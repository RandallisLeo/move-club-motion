'use client';

import { Folder, Grid2X2, Mail, User, type LucideIcon } from 'lucide-react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

const ROW_STEP = 38;
const ORBIT_RADIUS = 42;

const items: Array<{ label: string; icon: LucideIcon }> = [
  { label: 'Files', icon: Folder },
  { label: 'Inbox', icon: Mail },
  { label: 'Tools', icon: Grid2X2 },
  { label: 'Account', icon: User },
];

type OrbitDirection = 1 | -1;
type OrbitPhase = 'active' | 'incoming' | 'outgoing';

function OrbitIcon({
  icon: Icon,
  index,
  phase,
  direction,
  onComplete,
}: {
  icon: LucideIcon;
  index: number;
  phase: OrbitPhase;
  direction: OrbitDirection;
  onComplete?: () => void;
}) {
  const progress = useMotionValue(phase === 'active' ? 1 : 0);
  const x = useTransform(progress, (value) => {
    if (phase === 'active') return 0;
    const angle = phase === 'incoming' ? Math.PI * (1 - value) : Math.PI * value;
    return -ORBIT_RADIUS + ORBIT_RADIUS * Math.cos(angle);
  });
  const y = useTransform(progress, (value) => {
    if (phase === 'active') return 0;
    const angle = phase === 'incoming' ? Math.PI * (1 - value) : Math.PI * value;
    const side = phase === 'incoming' ? -direction : direction;
    return side * ORBIT_RADIUS * Math.sin(angle);
  });
  const scale = useTransform(progress, (value) => {
    if (phase === 'active') return 1;
    return phase === 'incoming' ? 0.68 + value * 0.32 : 1 - value * 0.32;
  });
  const opacity = useTransform(progress, (value) => {
    if (phase === 'active') return 1;
    return phase === 'incoming'
      ? Math.min(1, value * 3.2)
      : Math.min(1, (1 - value) * 3.2);
  });

  useEffect(() => {
    if (phase === 'active') return;
    const controls = animate(progress, 1, {
      duration: 0.62,
      ease: [0.45, 0, 0.2, 1],
      onComplete,
    });
    return () => controls.stop();
  }, [onComplete, phase, progress]);

  return (
    <motion.span
      className="menu-reveal-icon"
      style={{ top: index * ROW_STEP, x, y, scale, opacity }}
      aria-hidden="true"
    >
      <Icon size={18} strokeWidth={1.8} />
    </motion.span>
  );
}

type IconTransition = {
  id: number;
  from: number;
  to: number;
  direction: OrbitDirection;
};

export function MenuReveal({ replayKey }: { replayKey: number }) {
  const [selected, setSelected] = useState(1);
  const [iconTransition, setIconTransition] = useState<IconTransition | null>(null);
  const transitionId = useRef(0);
  const reduceMotion = useReducedMotion();

  const selectItem = (target: number) => {
    if (target === selected) return;

    if (reduceMotion) {
      setSelected(target);
      setIconTransition(null);
      return;
    }

    const nextTransition = {
      id: ++transitionId.current,
      from: selected,
      to: target,
      direction: (target < selected ? -1 : 1) as OrbitDirection,
    };

    setIconTransition(nextTransition);
    setSelected(target);
  };

  const finishTransition = (id: number) => {
    setIconTransition((current) => (current?.id === id ? null : current));
  };

  return (
    <div key={replayKey} className="menu-reveal-demo">
      <div className="menu-reveal-list" aria-label="Workspace menu">
        {iconTransition ? (
          <>
            <OrbitIcon
              key={`outgoing-${iconTransition.id}`}
              icon={items[iconTransition.from].icon}
              index={iconTransition.from}
              phase="outgoing"
              direction={iconTransition.direction}
            />
            <OrbitIcon
              key={`incoming-${iconTransition.id}`}
              icon={items[iconTransition.to].icon}
              index={iconTransition.to}
              phase="incoming"
              direction={iconTransition.direction}
              onComplete={() => finishTransition(iconTransition.id)}
            />
          </>
        ) : (
          <OrbitIcon
            key={`active-${selected}`}
            icon={items[selected].icon}
            index={selected}
            phase="active"
            direction={1}
          />
        )}

        <div className="menu-reveal-labels">
          {items.map(({ label }, index) => {
            const isSelected = selected === index;
            return (
              <motion.button
                type="button"
                key={label}
                className={isSelected ? 'is-selected' : ''}
                aria-pressed={isSelected}
                onClick={() => selectItem(index)}
                whileHover={{ x: 3, y: -1 }}
                whileTap={{ scale: 0.97, x: 2 }}
                transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.65 }}
              >
                {label}
              </motion.button>
            );
          })}
        </div>
      </div>
      <span className="menu-reveal-hint">Hover to lift · Click to select</span>
    </div>
  );
}
