'use client';

import Image from 'next/image';
import { Pause, Play, FolderOpen } from 'lucide-react';
import { motion, useAnimationFrame } from 'motion/react';
import { useRef, useState, type MouseEvent } from 'react';
import { useStudyViewport } from './agent-study-shared';
import { AgentPixelRipple } from './agent-pixel-ripple';

const codingTools = [
  { name: 'Cursor', logo: 'cursor', detail: 'An editor for the next small idea.' },
  { name: 'Claude Code', logo: 'claude-color', detail: 'A conversation that finds its way into code.' },
  { name: 'Copilot', logo: 'githubcopilot', detail: 'A little company while the idea takes shape.' },
  { name: 'Windsurf', logo: 'windsurf', detail: 'Keep a small thought moving.' },
  { name: 'Gemini CLI', logo: 'gemini-color', detail: 'Another angle on the same little problem.' },
  { name: 'Replit', logo: 'replit-color', detail: 'A place to try it, then try it again.' },
];
type ToolRipple = { id: number; tool: number; width: number; height: number };

function OrbitStudy() {
  const { ref, visible, reduced, width, height } = useStudyViewport();
  const [playing, setPlaying] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [ripples, setRipples] = useState<ToolRipple[]>([]);
  const rippleId = useRef(0);
  const phase = useRef(0);
  const nodes = useRef<(HTMLButtonElement | null)[]>([]);
  const lastDrawnSize = useRef('');
  function selectTool(index: number, event: MouseEvent<HTMLButtonElement>) {
    setSelected(current => current === index ? null : index);
    if (reduced) return;
    const card = event.currentTarget;
    const id = ++rippleId.current;
    setRipples(current => [...current.slice(-3), { id, tool: index, width: card.clientWidth, height: card.clientHeight }]);
  }
  useAnimationFrame((_, delta) => {
    const sizeKey = `${width}-${height}`;
    if (!visible && lastDrawnSize.current === sizeKey) return;
    lastDrawnSize.current = sizeKey;
    if (visible && playing && !reduced && selected === null) phase.current += Math.min(delta, 40) * 0.00018;
    // Tilt the orbital plane while leaving each logo upright.
    const tilt = -14 * Math.PI / 180;
    const radiusX = Math.min(width * 0.36, 246);
    const verticalRoom = Math.max(54, Math.min(height * 0.47 - 75, height * 0.53 - 112));
    const radiusY = Math.min(height * 0.21, 74);
    const rotatedHeight = Math.hypot(radiusX * Math.sin(tilt), radiusY * Math.cos(tilt));
    const fit = Math.min(1, verticalRoom / rotatedHeight);
    nodes.current.forEach((node, index) => {
      if (!node) return;
      const angle = phase.current + index * Math.PI / 3;
      const depth = Math.sin(angle);
      const orbitX = Math.cos(angle) * radiusX * fit;
      const orbitY = depth * radiusY * fit;
      const x = orbitX * Math.cos(tilt) - orbitY * Math.sin(tilt);
      const y = orbitX * Math.sin(tilt) + orbitY * Math.cos(tilt);
      node.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${0.84 + (depth + 1) * 0.09})`;
      node.style.zIndex = depth > 0 ? '4' : '1';
      node.style.opacity = String(0.72 + (depth + 1) * 0.14);
    });
  });
  return <div className="project-orbit-demo" ref={ref}>
    <motion.div className="project-orbit-core" initial={reduced ? false : { scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.9 }}>
      <span className="project-orbit-folder"><FolderOpen size={22} strokeWidth={1.3} /></span><strong>Move Club</strong><span>A small idea, in motion.</span>
    </motion.div>
    {codingTools.map((tool, index) => <button type="button" key={tool.name} className="project-orbit-tool" ref={element => { nodes.current[index] = element; }} aria-pressed={selected === index} onClick={event => selectTool(index, event)} style={{ left: '50%', top: '47%' }}>
      <Image unoptimized src={`/ai-tool-logos/${tool.logo}.svg`} width={25} height={25} alt="" draggable={false} /><span>{tool.name}</span>
      {!reduced && ripples.filter(ripple => ripple.tool === index).map(ripple => <AgentPixelRipple key={ripple.id} className="project-orbit-pixel-wave" x={ripple.width / 2} y={ripple.height / 2} radius={Math.hypot(ripple.width, ripple.height) / 2 + 6} duration={1100} spacing={3} originDuration={140} onComplete={() => setRipples(current => current.filter(item => item.id !== ripple.id))} />)}
    </button>)}
    <div className="project-orbit-detail" aria-live="polite">{selected === null ? 'A few tools. One small idea.' : codingTools[selected].detail}</div>
    <div className="agent-study-controls"><span>Tap a tool to take a closer look</span>{!reduced && <button type="button" onClick={() => setPlaying(value => !value)} aria-label={playing ? 'Pause tool orbit' : 'Resume tool orbit'}>{playing ? <Pause size={12} /> : <Play size={12} />}</button>}</div>
  </div>;
}
export function ProjectOrbit({ replayKey }: { replayKey: number }) { return <OrbitStudy key={replayKey} />; }
