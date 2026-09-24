'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
  type HTMLAttributes,
} from 'react';
import './watch-studies.css';

const pixels: Record<string, string[]> = {
  '0': ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  '.': ['0', '0', '0', '0', '0', '0', '1'],
  ',': ['00', '00', '00', '00', '00', '01', '10'],
  ':': ['0', '1', '1', '0', '1', '1', '0'],
};

export function DotNumber({
  value,
  label,
  className = '',
  animateChanges = true,
}: {
  value: string;
  label?: string;
  className?: string;
  animateChanges?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <span
      className={`watch-digits ${className}`}
      // This labeled composite contains independently animated SVG glyphs.
      // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="img"
      aria-label={label ?? value}
    >
      {Array.from(value).map((char, index) => {
        const bitmap = pixels[char] ?? pixels['0'];
        return (
          <span
            className="watch-digit-window"
            key={index}
            style={{ width: `${bitmap[0].length / 7}em` }}
            aria-hidden="true"
          >
            <AnimatePresence initial={false} mode="popLayout">
              <motion.svg
                key={animateChanges ? char : index}
                viewBox={`0 0 ${bitmap[0].length * 6} 42`}
                initial={
                  animateChanges
                    ? { y: reduced ? 0 : '105%', opacity: 0 }
                    : false
                }
                animate={{ y: 0, opacity: 1 }}
                exit={
                  animateChanges
                    ? { y: reduced ? 0 : '-105%', opacity: 0 }
                    : undefined
                }
                transition={{
                  duration: reduced || !animateChanges ? 0 : 0.32,
                  ease: [0.2, 0.7, 0.2, 1],
                }}
              >
                {bitmap.flatMap((row, y) =>
                  Array.from(row).map((pixel, x) =>
                    pixel === '1' ? (
                      <rect
                        key={`${x}-${y}`}
                        x={x * 6}
                        y={y * 6}
                        width="4.4"
                        height="4.4"
                        rx="0.45"
                        fill="currentColor"
                      />
                    ) : null,
                  ),
                )}
              </motion.svg>
            </AnimatePresence>
          </span>
        );
      })}
    </span>
  );
}

// Stop simulation work when a card leaves the viewport or the tab is hidden.
export function useWatchTicker(
  callback: () => void,
  active: boolean,
  delay: number,
) {
  const root = useRef<HTMLDivElement>(null);
  const latest = useRef(callback);
  const [visible, setVisible] = useState(false);
  const [foreground, setForeground] = useState(true);
  useEffect(() => {
    latest.current = callback;
  }, [callback]);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    if (root.current) observer.observe(root.current);
    const onVisibility = () => setForeground(!document.hidden);
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  useEffect(() => {
    if (!active || !visible || !foreground) return;
    const timer = window.setInterval(() => latest.current(), delay);
    return () => window.clearInterval(timer);
  }, [active, visible, foreground, delay]);
  return root;
}

// Programmatic slider focus can inherit keyboard focus styling after a pointer press.
// Keep focus for keyboard access, but draw rings only for keyboard interaction.
export const watchInputMode: HTMLAttributes<HTMLDivElement> = {
  onPointerDownCapture: (event) => {
    event.currentTarget.dataset.pointerFocus = 'true';
  },
  onKeyDownCapture: (event) => {
    delete event.currentTarget.dataset.pointerFocus;
  },
  onBlurCapture: (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      delete event.currentTarget.dataset.pointerFocus;
    }
  },
};

export function WatchShell({
  kind,
  children,
  hint,
  rootRef,
}: {
  kind: string;
  children: ReactNode;
  hint: string;
  rootRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div
      className={`watch-study ${kind}-demo`}
      ref={rootRef}
      {...watchInputMode}
    >
      <div className="watch-face">{children}</div>
      <span className="watch-hint">{hint}</span>
    </div>
  );
}

export function WatchClock({ seconds = 0 }: { seconds?: number }) {
  const minutes = 12 * 60 + 44 + Math.floor(seconds / 60);
  return (
    <span
      className="watch-clock"
      aria-label={`Demo time ${Math.floor(minutes / 60) % 24}:${String(minutes % 60).padStart(2, '0')}`}
    >
      <DotNumber
        value={`${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`}
      />
    </span>
  );
}
