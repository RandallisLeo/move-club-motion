'use client';

import NextImage from 'next/image';

import { useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import './nature-studies.css';

function MossStudy() {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const hover = useRef<number | null>(null);
  const pinned = useRef<number | null>(null);
  const wake = useRef<() => void>(() => {});
  const [patch, setPatch] = useState<number | null>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = box.current;
    const surface = canvas.current;
    const context = surface?.getContext('2d');
    if (!el || !surface || !context) return;
    let width = 1, height = 1, frame = 0, disposed = false, previousTime = 0;
    const image = new Image();
    const material = new Image();
    const mask = document.createElement('canvas');
    const maskContext = mask.getContext('2d');
    if (!maskContext) return;
    const colonies: { x: number; y: number; radius: number; flatten: number; reach: number; delay: number; growth: number }[] = [];
    const random = (index: number, salt: number) => {
      const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
      return value - Math.floor(value);
    };
    const smooth = (value: number) => {
      const t = Math.max(0, Math.min(1, value));
      return t * t * (3 - 2 * t);
    };
    function draw(time: number) {
      frame = 0;
      if (disposed || !colonies.length || !material.complete || !material.naturalWidth) return;
      const dt = Math.min((time - (previousTime || time - 16.67)) / 1000, 0.05);
      previousTime = time;
      context!.clearRect(0, 0, width, height);
      maskContext!.clearRect(0, 0, width, height);
      let moving = false;
      const center = hover.current ?? pinned.current;
      for (const colony of colonies) {
        const proximity = center === null ? 0 : smooth((0.23 - Math.abs(colony.x - center)) / 0.13);
        const target = smooth((proximity - colony.delay) / (1 - colony.delay));
        colony.growth = reduced ? target : colony.growth + (target - colony.growth) * (1 - Math.exp(-dt * (target > colony.growth ? 5 : 7)));
        if (Math.abs(target - colony.growth) > 0.002) moving = true;
        else colony.growth = target;
        if (colony.growth < 0.003) continue;
        // Root masks wrap the wood; canopy masks extend outwards from those
        // roots. The photographic leaves stay fixed instead of sliding.
        const radius = colony.radius * width * Math.sqrt(colony.growth);
        const extension = colony.reach * height * colony.growth;
        maskContext!.save();
        maskContext!.translate(colony.x * width, colony.y * height - extension * 0.5);
        maskContext!.scale(1, colony.flatten + Math.abs(extension) / (radius * 2));
        const feather = maskContext!.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius);
        feather.addColorStop(0, `rgba(255,255,255,${Math.min(1, colony.growth * 3)})`);
        feather.addColorStop(1, 'rgba(255,255,255,0)');
        maskContext!.fillStyle = feather;
        maskContext!.fillRect(-radius, -radius, radius * 2, radius * 2);
        maskContext!.restore();
      }
      context!.drawImage(material, 0, 0, width, height);
      context!.globalCompositeOperation = 'destination-in';
      context!.drawImage(mask, 0, 0, mask.width, mask.height, 0, 0, width, height);
      context!.globalCompositeOperation = 'source-over';
      if (moving) frame = requestAnimationFrame(draw);
      else previousTime = 0;
    }
    wake.current = () => { if (!frame && !disposed) frame = requestAnimationFrame(draw); };
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width; height = entry.contentRect.height;
      const dpr = Math.min(devicePixelRatio, 2);
      surface.width = Math.round(width * dpr); surface.height = Math.round(height * dpr);
      mask.width = surface.width; mask.height = surface.height;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      maskContext.setTransform(dpr, 0, 0, dpr, 0, 0); wake.current();
    });
    resize.observe(el);
    const prepare = () => {
      if (disposed || colonies.length || !image.complete || !image.naturalWidth || !material.complete || !material.naturalWidth) return;
      const sample = document.createElement('canvas');
      sample.width = image.naturalWidth; sample.height = image.naturalHeight;
      const ctx = sample.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, sample.width, sample.height).data;
      ctx.clearRect(0, 0, sample.width, sample.height);
      ctx.drawImage(material, 0, 0, sample.width, sample.height);
      const grown = ctx.getImageData(0, 0, sample.width, sample.height).data;
      // Sample both sides of the actual branch, rather than growing a row of
      // grass from its top edge. Front-face colonies lead; rims follow later.
      for (let i = 0; i < 112; i++) {
        const x = Math.round((0.045 + i / 111 * 0.91) * (sample.width - 1));
        let top = -1, bottom = -1, grownTop = -1, grownBottom = -1;
        for (let y = 0; y < sample.height; y++) {
          if (data[(y * sample.width + x) * 4 + 3] > 160) {
            if (top < 0) top = y;
            bottom = y;
          }
          if (grown[(y * sample.width + x) * 4 + 3] > 100) {
            if (grownTop < 0) grownTop = y;
            grownBottom = y;
          }
        }
        if (top < 0) continue;
        for (let row = 0; row < 5; row++) {
          const index = i * 5 + row;
          const depth = row / 4;
          colonies.push({
            x: x / sample.width + (random(index, 1) - 0.5) * 0.006,
            y: (top + (bottom - top) * depth + (random(index, 2) - 0.5) * 8) / sample.height,
            radius: 0.015 + random(index, 3) * 0.011,
            flatten: 0.68 + random(index, 4) * 0.45,
            reach: 0,
            delay: (row === 0 || row === 4 ? 0.16 : 0.02) + random(index, 5) * 0.15,
            growth: 0,
          });
        }
        if (grownTop >= 0) {
          // Taller grass first fills its roots, then lengthens into a full
          // canopy. Near-side leaves can also extend below the lower rim.
          colonies.push({ x: x / sample.width, y: top / sample.height, radius: 0.024 + random(i, 6) * 0.008, flatten: 0.85, reach: Math.max(0, top - grownTop) / sample.height, delay: 0.1 + random(i, 7) * 0.15, growth: 0 });
          colonies.push({ x: x / sample.width, y: bottom / sample.height, radius: 0.02, flatten: 0.8, reach: -Math.max(0, grownBottom - bottom) / sample.height, delay: 0.12 + random(i, 8) * 0.13, growth: 0 });
        }
      }
      wake.current();
    };
    image.onload = prepare;
    material.onload = prepare;
    image.src = '/nature-motion/branch.png';
    material.src = '/nature-motion/branch-grown.png?v=lush';
    return () => { disposed = true; cancelAnimationFrame(frame); resize.disconnect(); image.onload = null; material.onload = null; wake.current = () => {}; };
  }, [reduced]);
  return <div className="moss-grow-demo">
    <div className="moss-grow-heading"><span>A LITTLE ATTENTION</span><h4>Something begins to grow.</h4></div>
    <div className="moss-grow-branch" ref={box} onPointerMove={e => { hover.current = (e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.clientWidth; wake.current(); }} onPointerLeave={() => { hover.current = null; wake.current(); }} onPointerDown={e => {
      const x = (e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.clientWidth;
      pinned.current = x; setPatch(null); wake.current();
    }}>
      <NextImage width={1774} height={887} unoptimized src="/nature-motion/branch.png" alt="A weathered branch with lush sage-green grasses growing from cracks around its curved surface" /><canvas ref={canvas} aria-hidden="true" />
    </div>
    <fieldset className="moss-grow-controls" aria-label="Grow a moss patch">{['Left', 'Middle', 'Right'].map((label, i) => <button key={label} type="button" aria-label={`Grow ${label.toLowerCase()} moss patch`} aria-pressed={patch === i} onClick={() => { const next = patch === i ? null : i; setPatch(next); pinned.current = next === null ? null : [0.24, 0.5, 0.76][next]; hover.current = null; wake.current(); }}>{label}</button>)}</fieldset>
    <span className="moss-grow-hint">Hover along the wood · tap to keep a little growth</span>
  </div>;
}
export function MossGrow({ replayKey }: { replayKey: number }) { return <MossStudy key={replayKey} />; }
