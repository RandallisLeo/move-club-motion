'use client';

import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { animate, motion, useMotionValue } from 'motion/react';

type Photo = { id: string; image: string; alt: string };
const settleSpring = { type: 'spring' as const, stiffness: 360, damping: 30, mass: 1 };

export function TripPhotoFilm({ photos, selectedId, onSelect, onDismiss }: {
  photos: Photo[]; selectedId: string; onSelect: (id: string) => void; onDismiss: () => void;
}) {
  const film = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const x = useMotionValue(0);
  const [reduced, setReduced] = useState(false);
  const index = Math.max(0, photos.findIndex(photo => photo.id === selectedId));
  const step = width * .84 + 10;
  const target = useRef<number | null>(null);
  const previousWidth = useRef(0);
  const animation = useRef<ReturnType<typeof animate> | null>(null);
  const gesture = useRef<{
    id: number; startX: number; startY: number; origin: number; lastX: number;
    lastTime: number; velocity: number; axis: 'pending' | 'x' | 'y'; photoId?: string;
  } | null>(null);

  function settle(nextIndex: number, velocity = 0) {
    animation.current?.stop();
    target.current = -nextIndex * step;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) x.set(target.current);
    else animation.current = animate(x, target.current, { ...settleSpring, velocity });
  }
  useLayoutEffect(() => {
    if (!film.current) return;
    const element = film.current;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => setReduced(media.matches);
    syncPreference(); media.addEventListener('change', syncPreference);
    const measure = () => setWidth(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => { observer.disconnect(); media.removeEventListener('change', syncPreference); animation.current?.stop(); };
  }, []);
  useLayoutEffect(() => {
    if (!width) return;
    if (previousWidth.current !== width) {
      animation.current?.stop(); gesture.current = null;
      previousWidth.current = width; target.current = -index * step; x.set(target.current);
    } else if (target.current !== -index * step || reduced) settle(index);
  }, [index, step, width, reduced]);

  function start(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    animation.current?.stop();
    gesture.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY,
      origin: x.get(), lastX: event.clientX, lastTime: event.timeStamp, velocity: 0, axis: 'pending',
      photoId: (event.target as HTMLElement).closest<HTMLElement>('[data-photo]')?.dataset.photo };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function drag(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.startX, dy = event.clientY - current.startY;
    if (current.axis === 'pending' && Math.max(Math.abs(dx), Math.abs(dy)) > 6) {
      current.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (current.axis !== 'x') return;
    const elapsed = Math.max(1, event.timeStamp - current.lastTime);
    current.velocity = .65 * ((event.clientX - current.lastX) / elapsed * 1000) + .35 * current.velocity;
    current.lastX = event.clientX; current.lastTime = event.timeStamp;
    const requested = current.origin + dx;
    const lower = -(photos.length - 1) * step;
    // Rubber-band only beyond the first/last photo; normal dragging stays 1:1.
    const resistance = (distance: number) => width * .18 * (1 - Math.exp(-distance / (width * .55)));
    x.set(requested > 0 ? resistance(requested) : requested < lower ? lower - resistance(lower - requested) : requested);
    event.preventDefault();
  }
  function end(event: PointerEvent<HTMLDivElement>, canceled = false) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (canceled) { settle(index); return; }
    const dx = event.clientX - current.startX, dy = event.clientY - current.startY;
    if (current.axis === 'x') {
      const velocity = event.timeStamp - current.lastTime > 90 ? 0 : Math.max(-1400, Math.min(1400, current.velocity));
      const projected = dx + velocity * .12;
      const direction = Math.abs(projected) > step * .18 ? (projected < 0 ? 1 : -1) : 0;
      const next = Math.max(0, Math.min(photos.length - 1, index + direction));
      settle(next, velocity);
      if (next !== index) onSelect(photos[next].id);
    } else if (Math.abs(dy) > 70 && Math.abs(dy) > Math.abs(dx)) onDismiss();
    else if (Math.hypot(dx, dy) < 10) {
      settle(index);
      if (!current.photoId) onDismiss();
      else if (current.photoId !== selectedId) onSelect(current.photoId);
    } else settle(index);
  }

  return <div ref={film} className="tr-viewer-film" aria-roledescription="carousel" aria-label="Album photos"
    onPointerDown={start} onPointerMove={drag} onPointerUp={event => end(event)}
    onPointerCancel={event => end(event, true)}
    onLostPointerCapture={event => { if (event.target === event.currentTarget) end(event, true); }}
    onDragStart={event => event.preventDefault()}>
    <motion.div className="tr-viewer-track" style={{ x }}>
      {photos.map((photo, photoIndex) => <div key={photo.id}
        className={`tr-viewer-frame${photo.id === selectedId ? ' is-current' : photoIndex < index ? ' is-before' : ' is-after'}`}
        aria-hidden={photo.id !== selectedId} style={{ transform: `translateX(${photoIndex * step}px)` }}>
        <img data-photo={photo.id} src={photo.image} alt={photo.alt} draggable={false}/>
      </div>)}
    </motion.div>
  </div>;
}
