'use client';

import { Pause, Play, MoveHorizontal } from 'lucide-react';
import { animate, useAnimationFrame, useMotionValue } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { ToolGlyph, useStudyViewport } from './agent-study-shared';

const notes = [
  { title: 'A first sketch', body: 'One line becomes a shape.', tag: 'FORM', type: 0 },
  { title: 'A little spring', body: 'A nudge, then a soft landing.', tag: 'FEEDBACK', type: 1 },
  { title: 'An open note', body: 'Leave room for the next idea.', tag: 'SPACE', type: 2 },
  { title: 'Soft focus', body: 'The small detail comes closer.', tag: 'DEPTH', type: 3 },
  { title: 'Room to play', body: 'Try a different arrangement.', tag: 'LAYOUT', type: 2 },
  { title: 'One more fold', body: 'Follow the surface as it turns.', tag: 'TRANSITION', type: 0 },
  { title: 'A quiet pause', body: 'Let the last movement settle.', tag: 'TIMING', type: 1 },
  { title: 'Follow the arc', body: 'Take the long way around.', tag: 'TRAJECTORY', type: 3 },
];

function NotePreview({ type }: { type: number }) {
  return <svg viewBox="0 0 100 28" fill="none" aria-hidden="true">
    {type === 0 ? <><path className="sphere-preview-faint" d="M8 23h84M8 5h84"/><path d="M22 22V7l26 4v14L22 22ZM48 11l28-7v15l-28 6"/></> : type === 1 ? <><path className="sphere-preview-faint" d="M6 21h88"/><path d="M7 20c9 0 12-1 18-14s12 31 22 11S62 9 69 15s14 5 24 5"/></> : type === 2 ? <><rect x="14" y="5" width="25" height="18" rx="3"/><rect x="44" y="5" width="43" height="7" rx="2"/><path className="sphere-preview-faint" d="M46 18h39M46 23h25"/></> : <><ellipse className="sphere-preview-faint" cx="50" cy="14" rx="34" ry="9"/><path d="M17 13c4-10 53-11 65-1"/><circle cx="82" cy="12" r="3" fill="currentColor" stroke="none"/></>}
  </svg>;
}
const points = Array.from({ length: 38 }, (_, index) => {
  const y = 1 - (index / 37) * 2;
  const radius = Math.sqrt(1 - y * y);
  const theta = Math.PI * (3 - Math.sqrt(5)) * index;
  return { x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius };
});
function SphereStudy() {
  const { ref, visible, reduced, width, height } = useStudyViewport();
  const camera = useMotionValue(0);
  const [overview, setOverview] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [manual, setManual] = useState(false);
  const whole = (reduced && !manual) || overview;
  const angle = useRef(0.38);
  const lastDrawnSize = useRef('');
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const tilt = useRef(-0.12);
  useEffect(() => {
    if (!visible || !playing || reduced || manual) return;
    const timer = window.setTimeout(() => setOverview(true), 1500);
    return () => window.clearTimeout(timer);
  }, [visible, playing, reduced, manual]);
  useEffect(() => {
    if (reduced) { camera.set(whole ? 1 : 0); return; }
    if (!playing || !visible) return;
    const playback = animate(camera, whole ? 1 : 0, { duration: 3.6, ease: [0.55, 0, 0.2, 1] });
    return () => playback.stop();
  }, [camera, whole, reduced, playing, visible]);
  useAnimationFrame((_, delta) => {
    const sizeKey = `${width}-${height}`;
    if (!visible && lastDrawnSize.current === sizeKey) return;
    lastDrawnSize.current = sizeKey;
    if (playing && !reduced && !dragging.current) angle.current += Math.min(delta, 40) * 0.00009;
    const zoom = reduced ? whole ? 1 : 0 : camera.get();
    // Frame the full sphere against the stage edge; the floating controls do
    // not create a separate viewport or clip the close-up cards.
    const horizontalRoom = Math.max(55, width / 2 - 60);
    const radius = Math.max(45, Math.min(height * 0.3, width * 0.3, horizontalRoom / 1.25, 142));
    // Move the camera toward the sphere with a wider lens. Keep the overview
    // framing, while letting only the nearest cards grow in the close view.
    const focal = radius * 2.25 + (680 - radius * 2.25) * zoom;
    const distance = radius * 1.48 + (710 - radius * 1.48) * zoom;
    const c = Math.cos(angle.current), s = Math.sin(angle.current), ct = Math.cos(tilt.current), st = Math.sin(tilt.current);
    cards.current.forEach((card, index) => {
      if (!card) return;
      const point = points[index];
      const px = point.x * c + point.z * s;
      const pz = -point.x * s + point.z * c;
      const py = point.y * ct - pz * st;
      const z = point.y * st + pz * ct;
      const perspective = focal / (distance - z * radius);
      // A larger content canvas preserves the existing projected card width.
      const scale = perspective * (0.36 + zoom * 0.19) * Math.min(1, width / 580) * (112 / 144);
      const x = px * radius * perspective, y = py * radius * perspective;
      const depth = (z + 1) / 2;
      const closeOpacity = 0.58 + Math.pow(depth, 1.8) * 0.42;
      const blur = Math.max(0, 0.6 - depth) * (1 - zoom) * 1.2;
      card.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale}) rotate(${px * 5}deg)`;
      card.style.opacity = String(closeOpacity + (0.72 + depth * 0.28 - closeOpacity) * zoom);
      card.style.filter = blur > 0.025 ? `blur(${blur}px)` : 'none';
      card.style.boxShadow = `0 ${4 + depth * (1 - zoom) * 8}px ${10 + depth * (1 - zoom) * 16}px rgb(32 36 43 / ${0.08 + depth * (1 - zoom) * 0.08})`;
      card.style.zIndex = String(Math.round((z + 1) * 50));
    });
  });
  return <div className="cards-sphere-demo" data-view={whole ? 'whole' : 'detail'}>
    <div className="cards-sphere-controls"><fieldset className="cards-sphere-views" aria-label="Card cloud camera"><button type="button" aria-pressed={!whole} onClick={() => { setManual(true); setOverview(false); }}>A detail</button><button type="button" aria-pressed={whole} onClick={() => { setManual(true); setOverview(true); }}>The whole</button></fieldset><button type="button" aria-label="Rotate card sphere left" onClick={() => { angle.current -= 0.3; }}><MoveHorizontal size={12} /><span>Turn</span></button>{!reduced && <button type="button" aria-label={playing ? 'Pause sphere rotation' : 'Resume sphere rotation'} onClick={() => setPlaying(value => !value)}>{playing ? <Pause size={12} /> : <Play size={12} />}<span>{playing ? 'Pause' : 'Resume'}</span></button>}<span className="agent-study-hint">Drag to turn</span></div>
    <div className="cards-sphere-space" ref={ref} onPointerDown={event => { if (event.button !== 0) return; dragging.current = true; lastX.current = event.clientX; lastY.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => { if (!dragging.current) return; angle.current += (event.clientX - lastX.current) * 0.005; tilt.current = Math.max(-0.65, Math.min(0.65, tilt.current - (event.clientY - lastY.current) * 0.003)); lastX.current = event.clientX; lastY.current = event.clientY; }} onPointerUp={() => { dragging.current = false; }} onPointerCancel={() => { dragging.current = false; }}>
      <div className="cards-sphere-cloud" aria-hidden="true">{points.map((_, index) => {
        const note = notes[index % notes.length];
        return <div ref={element => { cards.current[index] = element; }} className={`cards-sphere-card cards-sphere-card-${index % 3}`} key={index}>
          <div className="cards-sphere-card-heading"><span><ToolGlyph index={index % 6} size={9}/>{note.tag}</span><span>{String(index + 1).padStart(2, '0')}</span></div>
          <strong>{note.title}</strong><span className="cards-sphere-excerpt">{note.body}</span>
          <div className="cards-sphere-preview"><NotePreview type={note.type}/></div>
          <span className="cards-sphere-time">MOVE CLUB<span>FIELD NOTES</span></span>
        </div>;
      })}</div>
    </div>
  </div>;
}
export function CardsSphere({ replayKey }: { replayKey: number }) { return <SphereStudy key={replayKey} />; }
