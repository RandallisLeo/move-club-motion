'use client';

import { CarFront, Droplet, Dumbbell, Footprints } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { WorkoutDial } from './workout-dial';
import { WaterStack } from './water-stack';
import { RouteApproach } from './route-approach';
import { StepsOrbit } from './steps-orbit';
import { watchInputMode } from './watch-shared';

const faces = [
  {
    name: 'Workout',
    detail: 'Workout timer',
    Icon: Dumbbell,
    Face: WorkoutDial,
  },
  {
    name: 'Health',
    detail: 'Hydration tracker',
    Icon: Droplet,
    Face: WaterStack,
  },
  {
    name: 'Navigate',
    detail: 'Turn directions',
    Icon: CarFront,
    Face: RouteApproach,
  },
  {
    name: 'Steps',
    detail: 'Step tracker',
    Icon: Footprints,
    Face: StepsOrbit,
  },
];

export function WatchFaces({
  replayKey,
  expanded = false,
}: {
  replayKey: number;
  expanded?: boolean;
}) {
  const [selected, setSelected] = useState(0);
  const [outgoing, setOutgoing] = useState<number | null>(null);
  const [direction, setDirection] = useState(1);
  const reduced = useReducedMotion();

  function selectFace(index: number) {
    if (index === selected || outgoing !== null) return;
    setDirection(index > selected ? 1 : -1);
    if (!reduced) setOutgoing(selected);
    setSelected(index);
  }

  return (
    <div
      className={`watch-faces-demo${expanded ? ' is-expanded' : ''}`}
      aria-label="Everyday watch collection"
      {...watchInputMode}
    >
      <nav className="watch-face-picker" aria-label="Choose a watch face">
        <span className="watch-picker-caption">Everyday / 04</span>
        {faces.map(({ name, detail, Icon }, index) => (
          <button
            type="button"
            key={name}
            className={index === selected ? 'is-selected' : ''}
            aria-label={`Show ${name} watch face`}
            aria-pressed={index === selected}
            disabled={outgoing !== null}
            onClick={() => selectFace(index)}
          >
            <Icon size={20} strokeWidth={1.7} />
            <span>
              <strong>{name}</strong>
              <small>{detail}</small>
            </span>
          </button>
        ))}
      </nav>
      <div
        className="watch-face-viewport"
        aria-label={`${faces[selected].name} watch face`}
      >
        {faces.map(({ name, Face }, index) => {
          const active = index === selected;
          const leaving = index === outgoing;
          const hidden = !active && !leaving;
          return (
            <motion.div
              key={name}
              className="watch-face-orbit"
              inert={!active}
              aria-hidden={!active}
              initial={false}
              animate={{
                rotate: reduced
                  ? 0
                  : active
                    ? outgoing !== null
                      ? [direction * 68, -direction * 1.2, 0]
                      : 0
                    : leaving
                      ? -direction * 68
                      : index < selected
                        ? -68
                        : 68,
                visibility: hidden ? 'hidden' : 'visible',
              }}
              transition={{
                duration: reduced || hidden ? 0 : active ? 0.88 : 0.7,
                ease: [0.4, 0, 0.2, 1],
                ...(active && outgoing !== null && !reduced
                  ? {
                      times: [0, 0.78, 1],
                      ease: [
                        [0.2, 0.7, 0.25, 1],
                        [0.35, 0, 0.2, 1],
                      ] as [number, number, number, number][],
                    }
                  : {}),
                visibility: { duration: 0 },
              }}
              onAnimationComplete={() => {
                if (active && outgoing !== null) setOutgoing(null);
              }}
              style={{
                pointerEvents: active && outgoing === null ? 'auto' : 'none',
              }}
            >
              <div
                className="watch-face-mount"
                style={{ display: hidden ? 'none' : 'grid' }}
              >
                <Face replayKey={replayKey} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
