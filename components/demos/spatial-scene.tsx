'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import type { SpatialPose } from './spatial-motion';

export function SpatialScene({ kind, pose, label }: { kind: 'fold' | 'object'; pose: SpatialPose; label: string }) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(pose);
  const reduced = useReducedMotion();
  const reducedRef = useRef(Boolean(reduced));
  const engine = useRef<{ wake: () => void; dispose: () => void } | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    latest.current = pose;
    reducedRef.current = Boolean(reduced);
    engine.current?.wake();
  }, [pose, reduced]);

  useEffect(() => {
    let cancelled = false;
    const element = host.current;
    if (!element) return;
    setStatus('loading');
    import('./spatial-scene-engine').then(async ({ createSpatialScene }) => {
      if (cancelled) return;
      const scene = await createSpatialScene(element, kind, () => latest.current, () => reducedRef.current,
        () => { if (!cancelled) setStatus('error'); });
      if (cancelled) { scene.dispose(); return; }
      engine.current = scene;
      setStatus('ready');
    }).catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; engine.current?.dispose(); engine.current = null; };
  }, [kind]);

  return (
    <div className="spatial-scene" role="img" aria-label={label} data-model={kind} data-surfaces={kind === 'fold' ? 3 : undefined}>
      <div className="spatial-scene-canvas" ref={host} aria-hidden="true" />
      {status !== 'ready' && <div className="spatial-scene-fallback" role="status">{status === 'loading' ? 'Bringing the view into focus…' : '3D preview unavailable. Please enable WebGL and reload.'}</div>}
    </div>
  );
}
