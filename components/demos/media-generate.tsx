'use client';

/* oxlint-disable next/no-img-element -- Native image readiness lets the result arrive as soon as it is ready. */

import { useEffect, useRef, useState } from 'react';
import { createGenerateField, type GenerateStyle } from './media-generate-field';
import './media-generate.css';

const styles: { id: GenerateStyle; label: string }[] = [
  { id: 'flow', label: 'Flow' },
  { id: 'sweep', label: 'Sweep' },
  { id: 'glass', label: 'Glass' },
  { id: 'matrix', label: 'Matrix' },
];
const RESULT = '/media-generate/jelly-flowers.jpg';
const DURATION = 8500;
type Phase = 'idle' | 'generating' | 'done' | 'error';

function MediaGenerateStudy() {
  const [style, setStyle] = useState<GenerateStyle>('glass');
  const [phase, setPhase] = useState<Phase>('idle');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const styleRef = useRef<GenerateStyle>(style);
  const phaseRef = useRef<Phase>(phase);
  const resultReady = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadlinePassed = useRef(false);
  const renderStill = useRef<(() => void) | null>(null);
  const resetAnimation = useRef<(() => void) | null>(null);

  function clearTimers() {
    if (timer.current !== null) clearTimeout(timer.current);
    if (timeout.current !== null) clearTimeout(timeout.current);
    timer.current = null;
    timeout.current = null;
  }
  function changePhase(next: Phase) {
    phaseRef.current = next;
    setPhase(next);
  }
  function showResult() {
    if (phaseRef.current !== 'generating' || !deadlinePassed.current || !resultReady.current) return;
    clearTimers();
    changePhase('done');
  }
  function begin() {
    clearTimers();
    deadlinePassed.current = false;
    resetAnimation.current?.();
    changePhase('generating');
    timer.current = setTimeout(() => { deadlinePassed.current = true; showResult(); }, DURATION);
    timeout.current = setTimeout(() => { if (phaseRef.current === 'generating') changePhase('error'); }, 20000);
  }
  function chooseStyle(next: GenerateStyle) {
    if (next === styleRef.current) return;
    styleRef.current = next;
    setStyle(next);
    renderStill.current?.();
    begin();
  }

  useEffect(() => {
    if (imageRef.current?.complete && imageRef.current.naturalWidth) resultReady.current = true;
    return clearTimers;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const field = createGenerateField(canvas);
    if (!field) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = true, raf = 0, last = 0, time = 0;
    const draw = () => field.render(time, styleRef.current);
    renderStill.current = draw;
    resetAnimation.current = () => { time = 0; last = 0; draw(); };
    const resize = new ResizeObserver(() => { field.resize(); draw(); });
    resize.observe(canvas);
    const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; last = 0; });
    intersection.observe(canvas);
    reduced.addEventListener('change', draw);
    function frame(now: number) {
      if (visible && !document.hidden && !reduced.matches && phaseRef.current === 'generating') {
        const frameInterval = 1000 / (styleRef.current === 'flow' ? 30 : 60);
        if (!last || now - last >= frameInterval - .5) {
          if (last) time += Math.min((now - last) / 1000, .08);
          draw();
          last = now;
        }
      } else last = 0;
      raf = requestAnimationFrame(frame);
    }
    draw();
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      intersection.disconnect();
      reduced.removeEventListener('change', draw);
      renderStill.current = null;
      resetAnimation.current = null;
    };
  }, []);

  return (
    <div className="media-generate-demo" data-phase={phase} data-style={style}>
      <fieldset className="media-generate-styles" aria-label="Loading style">
        {styles.map(item => (
          <button key={item.id} type="button" onClick={() => chooseStyle(item.id)} aria-pressed={style === item.id}>
            <span className={`media-generate-swatch media-generate-swatch-${item.id}`} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        ))}
      </fieldset>
      <div className="media-generate-main">
        <div className="media-generate-preview" aria-busy={phase === 'generating'}>
          <canvas ref={canvasRef} aria-hidden="true" />
          <img
            ref={imageRef}
            className="media-generate-result"
            data-visible={phase === 'done'}
            src={RESULT}
            alt={phase === 'done' ? 'A playful bouquet of translucent blue, lavender, pink, and apricot jelly flowers' : ''}
            aria-hidden={phase !== 'done'}
            onLoad={() => { resultReady.current = true; showResult(); }}
            onError={() => { resultReady.current = false; if (phaseRef.current === 'generating') { clearTimers(); changePhase('error'); } }}
          />
          {phase === 'error' && <span className="media-generate-error">Couldn’t load the sample image.</span>}
        </div>
        <button type="button" className="media-generate-button" onClick={begin} disabled={phase === 'generating'}>{phase === 'generating' ? 'Generating…' : 'Generate'}</button>
        <output className="media-generate-announcement" aria-live="polite">{phase === 'generating' ? 'Generating an image.' : phase === 'done' ? 'Image ready.' : phase === 'error' ? 'The sample image could not be loaded. Try again.' : 'Choose a style and generate.'}</output>
      </div>
    </div>
  );
}

export function MediaGenerate({ replayKey }: { replayKey: number }) {
  return <MediaGenerateStudy key={replayKey} />;
}
