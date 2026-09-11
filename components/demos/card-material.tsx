'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { CARD_MATERIALS, type CardMaterialId } from './card-material-options';
import type { CardMaterialEngine } from './card-material-engine';
import './card-material.css';

function MaterialStudy() {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<CardMaterialEngine | null>(null);
  const [material, setMaterial] = useState<CardMaterialId>('classic');
  const [chip, setChip] = useState(false);
  const [backs, setBacks] = useState<Partial<Record<CardMaterialId, boolean>>>({});
  const back = Boolean(backs[material]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const reducedMotion = useReducedMotion();
  const settings = useRef({ material, chip, reduced: Boolean(reducedMotion) });
  const selected = CARD_MATERIALS.find((item) => item.id === material)!;

  useEffect(() => {
    settings.current = { material, chip, reduced: Boolean(reducedMotion) };
    engine.current?.update(settings.current);
  }, [material, chip, reducedMotion]);

  useEffect(() => {
    let cancelled = false;
    const element = host.current;
    if (!element) return;
    import('./card-material-engine').then(async ({ createCardMaterialScene }) => {
      await document.fonts.ready;
      if (cancelled) return;
      const scene = createCardMaterialScene(element, settings.current, () => setStatus('error'));
      if (cancelled) { scene.dispose(); return; }
      engine.current = scene;
      setStatus('ready');
    }).catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; engine.current?.dispose(); engine.current = null; };
  }, []);

  function flip() {
    if (!engine.current || status !== 'ready') return;
    engine.current.flip();
    setBacks((value) => ({ ...value, [material]: !value[material] }));
  }

  return (
    <div className="card-material-demo" data-material={material} data-side={back ? 'back' : 'front'}>
      <div className="card-material-layout">
        <div className="card-material-viewport">
          <div className="card-material-canvas" ref={host} aria-hidden="true" />
          {status === 'ready' && <button type="button" className="card-material-hit" aria-label={`Flip ${selected.name.toLowerCase()} card to ${back ? 'front' : 'back'}`} onClick={flip}
            onPointerMove={(event) => {
              if (event.pointerType === 'touch') return;
              const rect = event.currentTarget.getBoundingClientRect();
              engine.current?.point((event.clientX - rect.left) / rect.width * 2 - 1, (event.clientY - rect.top) / rect.height * 2 - 1);
            }}
            onPointerLeave={() => engine.current?.point(0, 0)} onPointerCancel={() => engine.current?.point(0, 0)}
          />}
          {status !== 'ready' && <output className="card-material-fallback">{status === 'loading' ? 'Loading card…' : 'Card preview unavailable. Reload to try again.'}</output>}
        </div>
        <div className="card-material-tools">
          <fieldset className="card-material-picker">
            <legend className="card-material-picker-title">Choose your finish</legend>
            <div className="card-material-swatches">
              {CARD_MATERIALS.map((item) => (
                <button type="button" key={item.id} aria-label={item.name} title={item.name} aria-pressed={material === item.id} onClick={() => setMaterial(item.id)}>
                  <span className={`card-material-swatch card-material-swatch-${item.id}`} aria-hidden="true" />
                </button>
              ))}
            </div>
          </fieldset>
          <button type="button" className="card-material-chip-toggle" role="switch" aria-label="Chip" aria-checked={chip} onClick={() => setChip(!chip)}>
            <span>Chip</span>
            <span className="card-material-chip-track" aria-hidden="true"><span /></span>
            <span className="card-material-chip-state" aria-hidden="true">{chip ? 'On' : 'Off'}</span>
          </button>
        </div>
      </div>
      <p className="card-material-hint">Hover to tilt · Click to flip</p>
    </div>
  );
}

export function CardMaterial({ replayKey }: { replayKey: number }) {
  return <MaterialStudy key={replayKey} />;
}
