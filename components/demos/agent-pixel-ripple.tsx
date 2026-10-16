'use client';

import { useEffect, useRef } from 'react';

type PixelRippleProps = {
  x: number;
  y: number;
  radius: number;
  duration: number;
  spacing: number;
  originDuration?: number;
  className: string;
  onComplete: () => void;
};

export function AgentPixelRipple({ x, y, radius, duration, spacing, originDuration = 0, className, onComplete }: PixelRippleProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const finish = useRef(onComplete);
  const size = radius * 2 + spacing * 4;
  useEffect(() => { finish.current = onComplete; }, [onComplete]);
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;
    const density = Math.min(window.devicePixelRatio || 1, 2);
    element.width = Math.ceil(size * density);
    element.height = Math.ceil(size * density);
    context.scale(density, density);
    const center = size / 2;
    const band = Math.max(8, radius * 0.16);
    const origin = Math.min(originDuration, duration * 0.3);
    const extent = Math.ceil(radius / spacing) * spacing;
    let start: number | null = null;
    let frame = 0;
    function draw(now: number) {
      if (!context) return;
      start ??= now;
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      context.clearRect(0, 0, size, size);
      if (progress === 1) { finish.current(); return; }
      const outward = Math.max(0, (elapsed - origin) / (duration - origin));
      const waveRadius = origin ? radius * Math.pow(outward, 1.05) : 5 + (radius - 5) * Math.pow(progress, 0.78);
      const waveBand = origin ? Math.max(spacing * 1.7, band * Math.min(1, outward * 3)) : band;
      const fade = origin ? Math.min(1, 0.3 + elapsed / 45) * Math.min(1, (1 - progress) / 0.28) : Math.pow(Math.sin(Math.PI * progress), 0.7);
      context.fillStyle = '#6b6ff9';
      // The cells stay on a fixed grid. Only the passing wave lights them up.
      for (let row = -extent; row <= extent; row += spacing) {
        for (let column = -extent; column <= extent; column += spacing) {
          const distance = Math.hypot(column, row);
          const intensity = Math.exp(-Math.pow((distance - waveRadius) / waveBand, 2) * 1.9) * fade;
          if (intensity < 0.025) continue;
          const dot = spacing * (origin ? 0.36 + intensity * 0.28 : 0.3 + intensity * 0.22);
          context.globalAlpha = intensity * (origin ? 0.74 + 0.18 * Math.max(0, 1 - outward * 3) : 0.48);
          context.fillRect(center + column - dot / 2, center + row - dot / 2, dot, dot);
        }
      }
      frame = window.requestAnimationFrame(draw);
    }
    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, [duration, radius, size, spacing, originDuration]);
  return <canvas ref={canvas} className={className} data-feedback="pixel-ripple" aria-hidden="true" style={{ left: x - size / 2, top: y - size / 2, width: size, height: size }} />;
}
