'use client';

import { ChevronDown, ChevronUp, Droplet, Flame, Moon } from 'lucide-react';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { flushSync } from 'react-dom';
import { DotNumber, WatchClock, WatchShell } from './watch-shared';

const cards = [
  {
    name: 'Water',
    value: '68.5',
    unit: 'oz',
    progress: 64,
    remaining: '32.5 oz',
    detail: 'Remaining',
    color: '#009fee',
    shade: '#002e45',
    Icon: Droplet,
  },
  {
    name: 'Move',
    value: '420',
    unit: 'kcal',
    progress: 70,
    remaining: '180 kcal',
    detail: 'To your goal',
    color: '#f85936',
    shade: '#482016',
    Icon: Flame,
  },
  {
    name: 'Sleep',
    value: '7.5',
    unit: 'hrs',
    progress: 94,
    remaining: '0.5 hrs',
    detail: 'To feel rested',
    color: '#8d6ee9',
    shade: '#292044',
    Icon: Moon,
  },
];
export function WaterStack({ replayKey }: { replayKey: number }) {
  return <WaterSession key={replayKey} />;
}
function WaterCardContent({ card }: { card: (typeof cards)[number] }) {
  return (
    <>
      <span className="water-percent">{card.progress}%</span>
      <div>
        <span className="watch-label">{card.name}</span>
        <div className="water-value">
          <DotNumber key={card.name} value={card.value} />
          <span>{card.unit}</span>
        </div>
      </div>
      <span className="water-grip" />
    </>
  );
}

function WaterSession() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [height, setHeight] = useState(200);
  const [busy, setBusy] = useState(false);
  const frontRef = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef<{ id: number; y: number; offset: number } | null>(
    null,
  );
  const committing = useRef(false);
  const animation = useRef<ReturnType<typeof animate> | null>(null);
  const wheelTime = useRef(0);
  const reduced = useReducedMotion();
  const y = useMotionValue(0);
  // Both layers read the same live displacement, including every frame of the return spring.
  const reveal = useTransform(y, (value) =>
    Math.min(1, Math.abs(value) / (height * 0.8)),
  );
  const backScale = useTransform(reveal, (value) =>
    reduced ? 1 : 0.9 + value * 0.1,
  );
  const backY = useTransform(reveal, (value) =>
    reduced ? 0 : (1 - value) * -height * 0.12,
  );
  const backOpacity = useTransform(reveal, [0, 0.18, 0.8, 1], [0, 0.55, 1, 1]);
  const outgoingSummaryOpacity = useTransform(reveal, [0, 0.65], [1, 0]);
  const incomingSummaryOpacity = useTransform(reveal, [0.3, 1], [0, 1]);
  const outgoingSummaryY = useTransform(reveal, (value) =>
    reduced ? '0%' : `${-value * 100}%`,
  );
  const incomingSummaryY = useTransform(reveal, (value) =>
    reduced ? '0%' : `${(1 - value) * 100}%`,
  );
  const iconTravel = useTransform(y, (value) =>
    Math.max(-1, Math.min(1, value / (height * 0.8))),
  );
  const outgoingIconY = useTransform(iconTravel, (value) =>
    reduced ? '0%' : `${value * 100}%`,
  );
  const incomingIconY = useTransform(iconTravel, (value) => {
    const sign = Math.sign(value) || -direction;
    return reduced ? '0%' : `${(value - sign) * 100}%`;
  });
  const outgoingIconOpacity = useTransform(reveal, (value) =>
    reduced ? 1 - value : 1,
  );
  const incomingIconOpacity = useTransform(reveal, (value) =>
    reduced ? value : 1,
  );
  const card = cards[index];
  const nextCard = cards[(index + direction + cards.length) % cards.length];
  const glowColor = useTransform(reveal, [0, 1], [card.color, nextCard.color]);
  const headerColor = useTransform(
    reveal,
    [0, 1],
    [card.shade, nextCard.shade],
  );

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setHeight(entry.target.getBoundingClientRect().height),
    );
    if (frontRef.current) observer.observe(frontRef.current);
    return () => {
      observer.disconnect();
      animation.current?.stop();
    };
  }, []);

  function settle() {
    animation.current?.stop();
    animation.current = animate(
      y,
      0,
      reduced
        ? { duration: 0 }
        : { type: 'spring', stiffness: 340, damping: 29, mass: 0.85 },
    );
  }

  async function change(delta: number) {
    if (committing.current || dragOrigin.current) return;
    committing.current = true;
    setBusy(true);
    setDirection(delta);
    animation.current?.stop();
    animation.current = animate(
      y,
      -delta * height * 1.3,
      reduced
        ? { duration: 0 }
        : { type: 'spring', stiffness: 250, damping: 30, mass: 0.9 },
    );
    await animation.current;
    // Render the incoming card at rest in the same commit, before a frame can
    // paint its new content with the outgoing card's displacement.
    flushSync(() => {
      y.jump(0);
      setIndex((value) => (value + delta + cards.length) % cards.length);
      setBusy(false);
    });
    committing.current = false;
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (committing.current || !event.isPrimary || event.button !== 0) return;
    animation.current?.stop();
    dragOrigin.current = {
      id: event.pointerId,
      y: event.clientY,
      offset: y.get(),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    const origin = dragOrigin.current;
    if (!origin || origin.id !== event.pointerId) return;
    const offset = origin.offset + event.clientY - origin.y;
    setDirection(offset < 0 ? 1 : -1);
    y.set(Math.max(-height * 1.3, Math.min(height * 1.3, offset)));
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragOrigin.current?.id !== event.pointerId) return;
    dragOrigin.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    // Releasing in the second half completes the same motion instead of returning.
    if (event.type === 'pointerup' && Math.abs(y.get()) >= height * 0.5)
      void change(y.get() < 0 ? 1 : -1);
    else settle();
  }

  return (
    <WatchShell kind="water-stack" hint="Drag past halfway to switch">
      <motion.div
        className="water-glow"
        style={{ backgroundColor: glowColor }}
      />
      <div className="watch-badge water-badge" aria-hidden="true">
        <motion.span
          className="water-badge-icon"
          style={{
            color: card.color,
            y: outgoingIconY,
            opacity: outgoingIconOpacity,
          }}
        >
          <card.Icon fill="currentColor" />
        </motion.span>
        <motion.span
          className="water-badge-icon"
          style={{
            color: nextCard.color,
            y: incomingIconY,
            opacity: incomingIconOpacity,
          }}
        >
          <nextCard.Icon fill="currentColor" />
        </motion.span>
      </div>
      <WatchClock />
      <section
        className="water-deck"
        aria-label="Daily health cards"
        aria-busy={busy}
        onWheel={(event) => {
          if (
            Math.abs(event.deltaY) > 12 &&
            Date.now() - wheelTime.current > 650 &&
            !committing.current &&
            !dragOrigin.current
          ) {
            wheelTime.current = Date.now();
            void change(event.deltaY > 0 ? 1 : -1);
          }
        }}
      >
        <motion.div
          className="water-back-card"
          style={{ backgroundColor: headerColor }}
        >
          <div className="water-summary">
            <motion.div
              className="water-summary-layer"
              style={{ opacity: outgoingSummaryOpacity, y: outgoingSummaryY }}
            >
              <strong>{card.remaining}</strong>
              <span>{card.detail}</span>
            </motion.div>
            <motion.div
              className="water-summary-layer"
              style={{ opacity: incomingSummaryOpacity, y: incomingSummaryY }}
              aria-hidden="true"
            >
              <strong>{nextCard.remaining}</strong>
              <span>{nextCard.detail}</span>
            </motion.div>
          </div>
        </motion.div>
        <motion.div
          className="water-front-card water-under-card"
          aria-hidden="true"
          style={{
            background: nextCard.color,
            y: backY,
            scale: backScale,
            opacity: backOpacity,
          }}
        >
          <WaterCardContent card={nextCard} />
        </motion.div>
        <motion.div
          ref={frontRef}
          className="water-front-card water-active-card"
          style={{ background: card.color, y }}
          onPointerDown={startDrag}
          onPointerMove={drag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
        >
          <WaterCardContent card={card} />
        </motion.div>
      </section>
      <div className="water-pagination" aria-label="Choose health card">
        <button
          disabled={busy}
          onClick={() => void change(-1)}
          aria-label="Previous health card"
        >
          <ChevronUp />
        </button>
        <output>
          {index + 1} / {cards.length} · {card.name}
        </output>
        <button
          disabled={busy}
          onClick={() => void change(1)}
          aria-label="Next health card"
        >
          <ChevronDown />
        </button>
      </div>
    </WatchShell>
  );
}
