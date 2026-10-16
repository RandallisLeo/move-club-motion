'use client';

import { useEffect, useRef } from 'react';
import type { StickerInstance, StickerOptions } from '../../public/vendor/sticker-forge/sticker-forge';

type Stamp = { image: string; title: string; count: number };
export type StampDrag = { progress: number; direction: -1 | 1; release: 'held' | 'commit' | 'cancel'; failed?: boolean };
export type StampMotion = { sequence: number; incoming: Stamp; outgoing: Stamp | null; drag?: StampDrag; destination?: string; entrySide?: -1 | 1 };

type ForgeLibrary = typeof import('../../public/vendor/sticker-forge/sticker-forge');
let forgeLibrary: Promise<ForgeLibrary> | null = null;
function loadForge() {
  if (!forgeLibrary) forgeLibrary = new Promise<ForgeLibrary>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/vendor/sticker-forge/sticker-forge.iife.js?v=paper-watermark-2'; script.async = true;
    script.onload = () => resolve((window as unknown as { StickerForge: ForgeLibrary }).StickerForge);
    script.onerror = () => { script.remove(); forgeLibrary = null; reject(new Error('Sticker renderer unavailable')); };
    document.head.appendChild(script);
  });
  return forgeLibrary;
}

// Uses CatsJuice's Sticker Forge renderer (MIT), with the documented reverse-paper watermark patch.
// The adapter supplies our postage artwork and drives the public deterministic peel API.
export function TripSticker({ motion, onReady, onComplete }: {
  motion: StampMotion; onReady: () => void; onComplete: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onReady, onComplete });
  callbacks.current = { onReady, onComplete };
  useEffect(() => {
    const root = rootRef.current, stage = root?.parentElement;
    const button = stage?.querySelector<HTMLElement>('.tr-postcard.is-active .tr-cover-select');
    if (!root || !stage || !button) { callbacks.current.onComplete(); return; }
    let disposed = false, frame = 0;
    const instances: StickerInstance[] = [];
    const finish = () => { if (!disposed) callbacks.current.onComplete(); };
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = () => { if (media.matches) finish(); };
    media.addEventListener('change', reduced);
    const stageWidth = stage.clientWidth, stageHeight = stage.clientHeight;
    const resize = new ResizeObserver(() => { if (stage.clientWidth !== stageWidth || stage.clientHeight !== stageHeight) finish(); });
    resize.observe(stage);
    async function start() {
      if (media.matches) { finish(); return; }
      const w = button!.clientWidth, h = button!.clientHeight;
      const style = getComputedStyle(button!);
      const caption = button!.querySelector<HTMLElement>('.tr-cover-caption')!;
      const title = caption.querySelector<HTMLElement>('strong')!;
      const count = caption.querySelector<HTMLElement>('span')!;
      const titleStyle = getComputedStyle(title), countStyle = getComputedStyle(count);
      const paper = style.backgroundColor;
      const textureFor = async (stamp: Stamp) => {
        const image = new Image(); image.src = stamp.image;
        await image.decode();
        const surface = document.createElement('canvas');
        const resolution = 3;
        surface.width = Math.ceil(w * resolution); surface.height = Math.ceil(h * resolution);
        const ctx = surface.getContext('2d')!; ctx.scale(resolution, resolution);
        ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h);
        {
          const side = w - 24, crop = Math.min(image.naturalWidth, image.naturalHeight);
          ctx.drawImage(image, (image.naturalWidth - crop) / 2, (image.naturalHeight - crop) / 2, crop, crop, 12, 12, side, side);
          ctx.textBaseline = 'middle'; ctx.font = titleStyle.font; ctx.fillStyle = titleStyle.color;
          ctx.fillText(stamp.title, title.offsetLeft, title.offsetTop + title.offsetHeight / 2);
          ctx.font = countStyle.font; ctx.fillStyle = countStyle.color;
          ctx.fillText(`${stamp.count} photos`, count.offsetLeft + 16, count.offsetTop + count.offsetHeight / 2);
          ctx.strokeStyle = countStyle.color; ctx.lineWidth = .8;
          ctx.strokeRect(count.offsetLeft + 2, count.offsetTop + count.offsetHeight / 2 - 4, 8, 8);
          ctx.beginPath(); ctx.moveTo(count.offsetLeft, count.offsetTop + count.offsetHeight / 2 - 1); ctx.lineTo(count.offsetLeft, count.offsetTop + count.offsetHeight / 2 + 6); ctx.lineTo(count.offsetLeft + 7, count.offsetTop + count.offsetHeight / 2 + 6); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'destination-out';
        for (let x = 6; x < w; x += 12) for (const y of [0, h]) { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
        for (let y = 6; y < h; y += 12) for (const x of [0, w]) { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
        return surface.toDataURL('image/png');
      };
      const [{ createSticker }, frontIn, frontOut] = await Promise.all([
        loadForge(),
        textureFor(motion.incoming), motion.outgoing ? textureFor(motion.outgoing) : Promise.resolve(null),
      ]);
      if (disposed) return;
      const mount = async (src: string, name: string) => {
        const host = document.createElement('div'); host.className = 'tr-sticker-renderer'; host.dataset.stamp = name;
        // createSticker paints before its promise resolves. Hide BEFORE mounting.
        host.style.opacity = '0'; root!.appendChild(host);
        const options = {
          source: { type: 'image', src, padding: 0, textureMaxEdge: 1024 }, display: { width: w, height: h },
          outline: { width: 0 }, edge: { width: .5, strength: .25 },
          material: { type: 'original' }, back: { color: '#e7e4d8', gloss: .18, roughness: .82 },
          shadow: { opacity: .18, blur: 20, distance: 10 },
          peel: { radius: .12, stiffness: .72, release: 'stay', residue: false },
          sound: { enabled: false }, wind: 0, tilt: 3, quality: 'medium',
        } as StickerOptions;
        const instance = await createSticker(host, options);
        if (disposed) { instance.destroy(); return null; }
        instances.push(instance); host.inert = true;
        return { instance, host };
      };
      const incoming = await mount(frontIn, 'incoming');
      if (disposed || !incoming) return;
      const outgoing = frontOut ? await mount(frontOut, 'outgoing') : null;
      if (disposed || !incoming) return;
      // Normalize to the paper itself; the upstream engine solves the moving crease,
      // curved surface, reverse face and depth-aware shadow from this drag direction.
      const entrySide = motion.entrySide ?? (motion.drag?.direction === 1 ? -1 : 1);
      const drag = entrySide === -1
        ? { origin: { x: 0, y: 0 }, target: { x: 1.65, y: 1.25 } }
        : { origin: { x: 1, y: 0 }, target: { x: -.65, y: 1.25 } };
      incoming.instance.setPeelProgress(0, drag); incoming.host.style.opacity = '0';
      outgoing?.instance.setPeelProgress(0, drag);
      if (outgoing) outgoing.host.style.opacity = '1';
      callbacks.current.onReady();
      let begin = 0, releasedAt: number | null = null, releaseProgress = 0;
      const clamp = (value: number) => Math.max(0, Math.min(1, value));
      const ease = (value: number) => value * value * (3 - 2 * value);
      const draw = (now: number) => {
        if (disposed) return;
        if (!begin) begin = now;
        const elapsed = now - begin;
        let departure = ease(clamp(elapsed / 850));
        let arrival = clamp((elapsed - (outgoing ? 900 : 0)) / 720);
        let complete = elapsed >= (outgoing ? 1620 : 720);
        if (motion.drag && outgoing) {
          const control = motion.drag;
          if (control.release === 'held') {
            outgoing.instance.setPeelProgress(control.progress, drag);
            root!.dataset.peel = control.progress.toFixed(3);
            root!.dataset.phase = 'dragging';
            frame = requestAnimationFrame(draw); return;
          }
          if (releasedAt === null) { releasedAt = now; releaseProgress = control.progress; }
          const releasedTime = now - releasedAt;
          if (control.release === 'cancel') {
            outgoing.instance.setPeelProgress(releaseProgress * (1 - ease(clamp(releasedTime / 260))), drag);
            root!.dataset.phase = 'returning';
            if (releasedTime < 260) frame = requestAnimationFrame(draw); else finish();
            return;
          }
          const remaining = Math.max(160, (1 - releaseProgress) * 500);
          departure = releaseProgress + (1 - releaseProgress) * ease(clamp(releasedTime / remaining));
          arrival = clamp((releasedTime - remaining - 40) / 720);
          complete = releasedTime >= remaining + 760;
          root!.dataset.phase = 'committing';
        }
        // Enter from beyond the phone edge at full opacity, then make contact.
        // Translation is a separate phase from pressing flat; there is no center fade-in.
        const slide = clamp(arrival / .76), contact = clamp((arrival - .76) / .24);
        const glide = 1 - Math.pow(1 - slide, 3);
        const x = entrySide * ((stageWidth + w) / 2 + 16) * (1 - glide);
        const pressScale = contact < .65 ? 1.018 - .024 * ease(contact / .65) : .994 + .006 * ease((contact - .65) / .35);
        incoming.host.style.opacity = arrival > 0 ? '1' : '0';
        incoming.host.style.transform = `translate(${x}px, ${-5 * (1 - ease(contact))}px) scale(${pressScale})`;
        incoming.host.style.filter = `drop-shadow(0 ${5 * (1 - ease(contact))}px ${4 * (1 - ease(contact))}px rgb(38 51 70 / ${.07 * (1 - ease(contact))}))`;
        root!.dataset.entryX = x.toFixed(2);
        if (outgoing) {
          outgoing.instance.setPeelProgress(departure, drag);
          outgoing.host.style.opacity = String(1 - clamp((departure - .85) / .15));
        }
        root!.dataset.progress = arrival.toFixed(3);
        if (!complete) frame = requestAnimationFrame(draw); else finish();
      };
      frame = requestAnimationFrame(draw);
    }
    start().catch(finish);
    return () => { disposed = true; cancelAnimationFrame(frame); resize.disconnect(); media.removeEventListener('change', reduced); instances.forEach(instance => instance.destroy()); root.replaceChildren(); };
  }, [motion]);
  return <div ref={rootRef} className="tr-sticker-canvas" aria-hidden="true"/>;
}
