'use client';

import { Folder, Mail, Search, Settings, Sparkles, type LucideIcon } from 'lucide-react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { useRef, useState } from 'react';

type SolidIconName = 'folder' | 'mail' | 'search' | 'sparkles' | 'settings';

const actions: Array<{ label: string; icon: LucideIcon; solidIcon: SolidIconName }> = [
  { label: 'Files', icon: Folder, solidIcon: 'folder' },
  { label: 'Inbox', icon: Mail, solidIcon: 'mail' },
  { label: 'Search', icon: Search, solidIcon: 'search' },
  { label: 'Ideas', icon: Sparkles, solidIcon: 'sparkles' },
  { label: 'Settings', icon: Settings, solidIcon: 'settings' },
];

function SolidIcon({ name }: { name: SolidIconName }) {
  if (name === 'search') {
    return (
      <Search
        className="buttons-lift-solid-icon"
        size={19}
        strokeWidth={1.7}
        fill="currentColor"
        aria-hidden="true"
      />
    );
  }

  if (name === 'sparkles') {
    return (
      <Sparkles
        className="buttons-lift-solid-icon"
        size={19}
        strokeWidth={1.7}
        fill="currentColor"
        aria-hidden="true"
      />
    );
  }

  return (
    <svg
      className="buttons-lift-solid-icon"
      width="19"
      height="19"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {name === 'folder' ? (
        <path d="M3 5.75A2.75 2.75 0 0 1 5.75 3h3.9c.72 0 1.4.28 1.9.79L13.76 6h4.49A2.75 2.75 0 0 1 21 8.75v7.5A2.75 2.75 0 0 1 18.25 19H5.75A2.75 2.75 0 0 1 3 16.25V5.75Z" />
      ) : null}
      {name === 'mail' ? (
        <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2Zm8 8.35L20 7.4V6l-8 4.95L4 6v1.4l8 4.95Z" fillRule="evenodd" />
      ) : null}
      {name === 'settings' ? (
        <>
          <path d="M19.43 12.98c.04-.32.07-.65.07-.98s-.03-.66-.07-.98l2.1-1.64c.2-.16.25-.43.13-.65l-2-3.46a.5.5 0 0 0-.61-.22l-2.48 1a7.42 7.42 0 0 0-1.7-.99l-.37-2.64A.5.5 0 0 0 14 2h-4a.5.5 0 0 0-.5.42l-.37 2.64c-.61.25-1.18.58-1.7.99l-2.48-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .13.65l2.1 1.64a7.13 7.13 0 0 0 0 1.96l-2.1 1.64a.5.5 0 0 0-.13.65l2 3.46a.5.5 0 0 0 .61.22l2.48-1c.52.41 1.09.74 1.7.99l.37 2.64A.5.5 0 0 0 10 22h4a.5.5 0 0 0 .5-.42l.37-2.64c.61-.25 1.18-.58 1.7-.99l2.48 1a.5.5 0 0 0 .61-.22l2-3.46a.5.5 0 0 0-.13-.65l-2.1-1.64Z" />
          <circle cx="12" cy="12" r="3" className="buttons-lift-solid-cutout" />
        </>
      ) : null}
    </svg>
  );
}

function LiftButton({
  label,
  icon: Icon,
  solidIcon,
  pointerX,
  onActiveChange,
}: {
  label: string;
  icon: LucideIcon;
  solidIcon: SolidIconName;
  pointerX: MotionValue<number>;
  onActiveChange: (label: string | null) => void;
}) {
  const button = useRef<HTMLButtonElement>(null);
  const distance = useTransform(pointerX, (value) => {
    const bounds = button.current?.getBoundingClientRect();
    return bounds ? value - (bounds.left + bounds.width / 2) : 160;
  });
  const liftTarget = useTransform(distance, [-90, 0, 90], [0, -22, 0]);
  const scaleTarget = useTransform(distance, [-90, 0, 90], [1, 1.13, 1]);
  const y = useSpring(liftTarget, { stiffness: 430, damping: 28, mass: 0.55 });
  const scale = useSpring(scaleTarget, { stiffness: 430, damping: 28, mass: 0.55 });

  const focusButton = () => {
    const bounds = button.current?.getBoundingClientRect();
    if (bounds) pointerX.set(bounds.left + bounds.width / 2);
    onActiveChange(label);
  };

  return (
    <motion.button
      ref={button}
      type="button"
      aria-label={label}
      style={{ y, scale }}
      whileTap={{ scale: 0.94, y: -12 }}
      onPointerEnter={() => onActiveChange(label)}
      onFocus={focusButton}
      onBlur={() => {
        pointerX.set(Number.POSITIVE_INFINITY);
        onActiveChange(null);
      }}
    >
      <span className="buttons-lift-icon-stack">
        <Icon
          className="buttons-lift-outline-icon"
          size={19}
          strokeWidth={1.7}
          aria-hidden="true"
        />
        <SolidIcon name={solidIcon} />
      </span>
    </motion.button>
  );
}

export function ButtonsLift({ replayKey }: { replayKey: number }) {
  const pointerX = useMotionValue(Number.POSITIVE_INFINITY);
  const [active, setActive] = useState<string | null>(null);

  return (
    <div key={replayKey} className="buttons-lift-demo">
      <span className="buttons-lift-label" aria-live="polite">
        {active ?? 'Move across the dock'}
      </span>
      <div
        className="buttons-lift-dock"
        aria-label="Quick actions"
        onPointerMove={(event) => {
          if (event.pointerType !== 'touch') pointerX.set(event.clientX);
        }}
        onPointerLeave={() => {
          pointerX.set(Number.POSITIVE_INFINITY);
          setActive(null);
        }}
      >
        {actions.map((action) => (
          <LiftButton
            key={action.label}
            {...action}
            pointerX={pointerX}
            onActiveChange={setActive}
          />
        ))}
      </div>
    </div>
  );
}
