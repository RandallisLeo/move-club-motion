'use client';

import { BellOff, Check, GripVertical, MoveHorizontal, Pin, Trash2, Undo2, type LucideIcon } from 'lucide-react';
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { TRAVEL, RADIUS, clamp, bodyWidthAt, bodyLeftAt, centerAt, gapAt, joinedConnections, stepConnections, type DropletGeometry, type Attachment } from './liquid-swipe-physics';
import './liquid-swipe.css';

type Direction = -1 | 0 | 1;
type Action = 'pin' | 'done' | 'mute' | 'clear';
type Droplet = DropletGeometry & { action: Action; label: string; icon: LucideIcon };
const droplets: Droplet[] = [
  { action: 'pin', label: 'Pin', icon: Pin, cx: 62, push: 34, side: -1, attachment: 'droplet' },
  { action: 'done', label: 'Done', icon: Check, cx: 62, push: 96, side: -1, attachment: 'capsule' },
  { action: 'mute', label: 'Mute', icon: BellOff, cx: 298, push: 96, side: 1, attachment: 'capsule' },
  { action: 'clear', label: 'Clear', icon: Trash2, cx: 298, push: 34, side: 1, attachment: 'droplet' },
];

function DropletShape({ drop, neighbor, offset, reducedMotion, joinId }: { drop: Droplet; neighbor: Droplet; offset: MotionValue<number>; reducedMotion: boolean; joinId: string }) {
  const connections = useRef(joinedConnections());
  const recoil = useMotionValue(0);
  const animation = useRef<ReturnType<typeof animate> | null>(null);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [detached, setDetached] = useState(false);
  const [releaseFrom, setReleaseFrom] = useState<Attachment | null>(null);
  const [releaseCount, setReleaseCount] = useState(0);

  useMotionValueEvent(offset, 'change', (x) => {
    const step = stepConnections(x, drop, neighbor, connections.current);
    connections.current = step.connections;
    if (step.release) {
      setDetached(true);
      const pulse = () => {
        pending.current = null;
        setReleaseFrom(step.release);
        setReleaseCount((count) => count + 1);
        animation.current?.stop();
        // Same quiet, circular recoil; the seam that actually breaks triggers it.
        recoil.jump(reducedMotion ? 0 : -0.045);
        if (!reducedMotion) animation.current = animate(recoil, 0, {
          type: 'spring', stiffness: 460, damping: 24, mass: 0.7, velocity: 0,
          restDelta: 0.001, restSpeed: 0.01,
        });
      };
      if (step.delayMs && !reducedMotion) pending.current = setTimeout(pulse, step.delayMs);
      else pulse();
    } else if (step.rejoined) {
      if (pending.current !== null) clearTimeout(pending.current);
      pending.current = null;
      setDetached(false);
      setReleaseFrom(null);
      animation.current?.stop();
      recoil.jump(0);
    }
  });
  useEffect(() => () => {
    animation.current?.stop();
    if (pending.current !== null) clearTimeout(pending.current);
  }, []);

  const cx = useTransform(offset, (x) => centerAt(x, drop));
  const bodyX = useTransform(offset, bodyLeftAt);
  const bodyWidth = useTransform(offset, bodyWidthAt);
  const radius = useTransform(recoil, (value) => RADIUS * clamp(1 + value, 0.95, 1.01));

  // Blend each droplet with the capsule separately. A filter shared by both
  // droplets would build an extra neck between them and prolong the sticky phase.
  // Circles keep equal radii; no crossing Bezier handles or elliptical squash.
  return (
    <g data-droplet={drop.action} data-detached={detached} data-release-from={releaseFrom ?? undefined} data-release-count={releaseCount} filter={reducedMotion ? undefined : `url(#${joinId})`}>
      <motion.rect x={bodyX} y="54" width={bodyWidth} height="72" rx="32" />
      <motion.circle cx={cx} cy="90" r={radius} />
    </g>
  );
}

function DropletButton({ drop, offset, enabled, pressed, onAction, onClose }: {
  drop: Droplet; offset: MotionValue<number>; enabled: boolean; pressed?: boolean;
  onAction: () => void; onClose: () => void;
}) {
  const opacity = useTransform(offset, (x) => clamp((gapAt(x, drop) + 13) / 19));
  const left = useTransform(offset, (x) => centerAt(x, drop) - 27);
  const Icon = drop.icon;
  return (
    <motion.div className="liquid-swipe-action-position" style={{ left, opacity }} inert={!enabled} aria-hidden={!enabled}>
      <button type="button" className="liquid-swipe-action" aria-label={drop.label} aria-pressed={pressed} onClick={onAction}
        onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); onClose(); } }}>
        <Icon size={20} strokeWidth={1.7} />
      </button>
      <span className="liquid-swipe-action-label">{drop.label}</span>
    </motion.div>
  );
}

export function LiquidSwipe({ replayKey }: { replayKey: number }) {
  const id = `liquid-${useId().replace(/:/g, '')}`;
  const scene = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLButtonElement>(null);
  const undo = useRef<HTMLButtonElement>(null);
  const drag = useRef<{
    pointer: number; startX: number; startY: number; start: number;
    lastX: number; lastTime: number; velocity: number; moved: boolean;
  } | null>(null);
  const animation = useRef<ReturnType<typeof animate> | null>(null);
  const suppressClick = useRef(false);
  const offset = useMotionValue(0);
  const reduceMotion = !!useReducedMotion();
  const [scale, setScale] = useState(1);
  const [direction, setDirection] = useState<Direction>(0);
  const [dragging, setDragging] = useState(false);
  const [cleared, setCleared] = useState<'done' | 'clear' | null>(null);
  const [pinned, setPinned] = useState(false);
  const [muted, setMuted] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const cardWidth = useTransform(offset, bodyWidthAt);
  const buttonX = useTransform(offset, (x) => bodyLeftAt(x) - 40);

  useEffect(() => {
    if (!scene.current) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1.2, entry.contentRect.width / 360)));
    observer.observe(scene.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => () => animation.current?.stop(), []);
  useEffect(() => { if (cleared) undo.current?.focus({ preventScroll: true }); }, [cleared]);

  const settle = (next: Direction) => {
    animation.current?.stop();
    setDirection(next);
    if (reduceMotion) offset.set(next * TRAVEL);
    else animation.current = animate(offset, next * TRAVEL, {
      type: 'spring', stiffness: 300, damping: 31, mass: 0.85,
      restDelta: 0.05, restSpeed: 0.1,
    });
  };
  const close = () => { settle(0); card.current?.focus({ preventScroll: true }); };

  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    animation.current?.stop();
    suppressClick.current = false;
    drag.current = {
      pointer: event.pointerId, startX: event.clientX, startY: event.clientY,
      start: offset.get(), lastX: event.clientX, lastTime: event.timeStamp, velocity: 0, moved: false,
    };
  };
  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const state = drag.current;
    if (!state || state.pointer !== event.pointerId) return;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    if (!state.moved) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { drag.current = null; settle(direction); return; }
      if (Math.abs(dx) < 5) return;
      state.moved = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const elapsed = event.timeStamp - state.lastTime;
    if (elapsed > 0) state.velocity = (event.clientX - state.lastX) / elapsed / scale;
    state.lastX = event.clientX;
    state.lastTime = event.timeStamp;
    offset.set(clamp(state.start + dx / scale, -TRAVEL, TRAVEL));
  };
  const endDrag = (event: PointerEvent<HTMLButtonElement>, cancelled = false) => {
    const state = drag.current;
    if (!state || state.pointer !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!state.moved) return;
    suppressClick.current = true;
    if (cancelled) { settle(direction); return; }
    const velocity = event.timeStamp - state.lastTime < 100 ? state.velocity : 0;
    // A flick toward the center closes the current side, rather than jumping across.
    const projected = offset.get() + velocity * 100;
    let next: Direction = projected > 52 ? 1 : projected < -52 ? -1 : 0;
    if (state.start < -52 && offset.get() <= 0 && next === 1) next = 0;
    if (state.start > 52 && offset.get() >= 0 && next === -1) next = 0;
    settle(next);
  };

  const act = (action: Action) => {
    if (action === 'pin') {
      setPinned(!pinned);
      setAnnouncement(pinned ? 'Unpinned.' : 'Pinned.');
      close();
    } else if (action === 'mute') {
      setMuted(!muted);
      setAnnouncement(muted ? 'Sound on.' : 'Muted.');
      close();
    } else {
      animation.current?.stop();
      setCleared(action);
      setAnnouncement(action === 'done' ? 'Marked done. Undo is available.' : 'Cleared. Undo is available.');
    }
  };
  const restore = () => {
    setCleared(null);
    setDirection(0);
    offset.set(0);
    setAnnouncement('Restored. Drag in either direction.');
    requestAnimationFrame(() => card.current?.focus({ preventScroll: true }));
  };

  return (
    <div key={replayKey} className="liquid-swipe-demo">
      <div ref={scene} className="liquid-swipe-scene" data-direction={direction} data-dragging={dragging}>
        <div className="liquid-swipe-control" style={{ '--liquid-scale': scale } as CSSProperties}>
          <motion.div className="liquid-swipe-surface" animate={{ opacity: cleared ? 0 : 1, scale: cleared && !reduceMotion ? 0.94 : 1 }} transition={{ duration: reduceMotion ? 0 : 0.18 }} inert={!!cleared}>
            <svg className="liquid-swipe-shapes" viewBox="0 0 360 180" aria-hidden="true">
              <defs>
                <filter id={`${id}-join`} filterUnits="userSpaceOnUse" x="-160" y="0" width="680" height="180" colorInterpolationFilters="sRGB">
                  <feGaussianBlur stdDeviation="3" />
                  <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" />
                </filter>
                <g id={`${id}-shape`} fill="white">
                  {droplets.map((drop) => <DropletShape key={drop.action} drop={drop} neighbor={droplets.find((item) => item.side === drop.side && item.action !== drop.action)!} offset={offset} reducedMotion={reduceMotion} joinId={`${id}-join`} />)}
                </g>
                <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x="-160" y="0" width="680" height="180"><use href={`#${id}-shape`} /></mask>
              </defs>
              <path d="M-160 0H520V180H-160Z" fill="var(--paper)" mask={`url(#${id}-mask)`} />
            </svg>
            <motion.button ref={card} type="button" className="liquid-swipe-notification" style={{ x: buttonX, width: cardWidth }}
              aria-label="Drag actions" aria-expanded={direction !== 0} aria-describedby={`${id}-hint`} aria-controls={`${id}-actions`}
              onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={(event) => endDrag(event)} onPointerCancel={(event) => endDrag(event, true)} onLostPointerCapture={(event) => endDrag(event, true)}
              onClick={(event) => {
                if (suppressClick.current && event.detail > 0) { suppressClick.current = false; return; }
                suppressClick.current = false;
                settle(direction ? 0 : -1);
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Escape') {
                  event.preventDefault();
                  settle(event.key === 'Escape' ? 0 : event.key === 'ArrowLeft' ? -1 : 1);
                }
              }}>
              <span className="liquid-swipe-grip">
                {pinned ? <Pin size={17} /> : muted ? <BellOff size={17} /> : <GripVertical size={17} />}
                {pinned ? 'Pinned' : muted ? 'Muted' : 'Drag me'}
              </span>
            </motion.button>
            <div id={`${id}-actions`} className="liquid-swipe-actions">
              {droplets.map((drop) => <DropletButton key={drop.action} drop={drop} offset={offset} enabled={direction === -drop.side && !dragging} pressed={drop.action === 'pin' ? pinned : drop.action === 'mute' ? muted : undefined} onAction={() => act(drop.action)} onClose={close} />)}
            </div>
          </motion.div>
          {cleared && <div className="liquid-swipe-empty"><Check size={21} strokeWidth={1.6} /><span>{cleared === 'done' ? 'Done.' : 'All clear.'}</span><button ref={undo} type="button" onClick={restore}><Undo2 size={14} /> Undo</button></div>}
        </div>
      </div>
      <span id={`${id}-hint`} className="liquid-swipe-hint"><MoveHorizontal size={14} />Drag left or right</span>
      <output className="liquid-swipe-sr" aria-live="polite">{announcement}</output>
    </div>
  );
}
