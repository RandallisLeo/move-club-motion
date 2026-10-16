'use client';

import { Check } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import './nature-studies.css';

const photos = [
  { src: '/nature-motion/forest.jpg', alt: 'Mossy forest fading into the morning mist', label: 'Forest' },
  { src: '/feed-adapt/lake.jpg', alt: 'An alpine lake beneath a mountain range', label: 'Stillness' },
  { src: '/feed-adapt/weekend.jpg', alt: 'A road winding between warm desert cliffs', label: 'Wander' },
];

function EmergingPhoto({ photo, index, run, leaving, reduced, onReady, onFailed }: { photo: typeof photos[number]; index: number; run: number; leaving: boolean; reduced: boolean; onReady: (index: number) => void; onFailed: (index: number) => void }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    let cancelled = false;
    // decode resolves for both cached SSR images and newly loaded assets.
    image.current?.decode().then(() => { if (!cancelled) setReady(true); }).catch(() => { if (!cancelled) { setFailed(true); onFailed(index); } });
    return () => { cancelled = true; };
  }, [run, index, onFailed]);
  const delay = reduced || leaving ? 0 : index * 0.24;
  return <motion.div className="image-emerge-photo" initial={{ opacity: 0, y: reduced ? 0 : 24 }}
    animate={{ opacity: leaving && !reduced ? 0 : 1, y: reduced ? 0 : leaving ? -8 : [24, -3, 0.75, 0] }}
    transition={{
      opacity: { delay, duration: reduced ? 0 : 0.55, ease: [0.2, 0.7, 0.3, 1] },
      // A bounded 3px overshoot, then a tiny return, without changing scale or
      // the final strip alignment. Blur-to-sharp keeps its own slower timing.
      y: { delay, duration: reduced ? 0 : leaving ? 0.55 : 0.95, ease: [0.2, 0.7, 0.3, 1], ...(leaving || reduced ? {} : { times: [0, 0.68, 0.84, 1] }) },
    }}>
    <motion.img ref={image} key={run} src={photo.src} alt={photo.alt} onLoad={() => setReady(true)} onError={() => { setFailed(true); onFailed(index); }}
      initial={{ opacity: 0, filter: reduced ? 'blur(0px)' : 'blur(22px)', scale: reduced ? 1 : 1.12 }}
      animate={{ opacity: ready ? 1 : 0, filter: ready || reduced ? 'blur(0px)' : 'blur(22px)', scale: ready || reduced ? 1 : 1.12 }}
      transition={{ delay: reduced ? 0 : index * 0.28 + 0.12, duration: reduced ? 0 : 1.3, ease: [0.2, 0.7, 0.3, 1] }} onAnimationComplete={() => { if (ready) onReady(index); }} />
    {failed && <span className="image-emerge-failed">Image unavailable</span>}
    <span className="image-emerge-photo-label">0{index + 1} / {photo.label}</span>
  </motion.div>;
}

function EmergeStudy() {
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { amount: 0.35 });
  const [run, setRun] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [complete, setComplete] = useState<number[]>([]);
  const [unavailable, setUnavailable] = useState<number[]>([]);
  const reduced = !!useReducedMotion();
  const markReady = useCallback((index: number) => setComplete(v => v.includes(index) ? v : [...v, index]), []);
  const markFailed = useCallback((index: number) => setUnavailable(v => v.includes(index) ? v : [...v, index]), []);
  useEffect(() => {
    if (reduced || !inView || complete.length !== photos.length || unavailable.length) return;
    // Give the finished composition seven quiet seconds before a soft exit.
    // Unmount, viewport exit, and restarting all cancel pending cycles.
    const timer = window.setTimeout(() => {
      if (leaving) {
        setComplete([]);
        setRun(v => v + 1);
        setLeaving(false);
      } else setLeaving(true);
    }, leaving ? 650 : 7000);
    return () => window.clearTimeout(timer);
  }, [complete.length, inView, leaving, reduced, unavailable.length]);
  return <div ref={root} className="image-emerge-demo" data-cycle={run} data-phase={leaving ? 'leaving' : 'revealing'}>
    <div className="image-emerge-heading"><span>A little more, in focus.</span></div>
    <div className="image-emerge-strip">{photos.map((photo, i) => <EmergingPhoto key={`${i}-${run}`} photo={photo} index={i} run={run} leaving={leaving} reduced={reduced} onReady={markReady} onFailed={markFailed} />)}</div>
    <div className="image-emerge-status" aria-live={unavailable.length ? 'polite' : 'off'}>
      <span className="image-emerge-progress">{unavailable.length > 0 ? <>{complete.length} in view · {unavailable.length} unavailable</> : complete.length === 3 ? <><Check size={12} /> All in view</> : <><span className="image-emerge-dot" /> Finding clarity · {complete.length}/3</>}</span>
      <button type="button" className="image-emerge-playback" aria-label="Restart photo reveals" onClick={() => { setComplete([]); setUnavailable([]); setLeaving(false); setRun(value => value + 1); }}>Restart</button>
    </div>
  </div>;
}
export function ImageEmerge({ replayKey }: { replayKey: number }) { return <EmergeStudy key={replayKey} />; }
