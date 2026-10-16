'use client';

import { ArrowUp, Check, Plus, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import { ToolGlyph, useStudyReducedMotion } from './agent-study-shared';
import { AgentPixelRipple } from './agent-pixel-ripple';
const sources = [{ name: 'Motion notes', index: 2 }, { name: 'First sketch', index: 0 }];
function BloomStudy() {
  const reduced = useStudyReducedMotion();
  const drop = useRef<HTMLDivElement>(null);
  const [attached, setAttached] = useState<number[]>([]);
  const [bloom, setBloom] = useState<{ key: number; x: number; y: number } | null>(null);
  const [over, setOver] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const clickAfterDrag = useRef(false);
  const bloomCount = useRef(0);
  function clientPoint(point: { x: number; y: number }) { return { x: point.x - window.scrollX, y: point.y - window.scrollY }; }
  function attach(index: number, point?: { x: number; y: number }) {
    if (attached.includes(index)) return;
    const bounds = drop.current?.getBoundingClientRect();
    setAttached(items => [...items, index]);
    setSent(false);
    setBloom({ key: ++bloomCount.current, x: bounds && point ? Math.max(12, Math.min(bounds.width - 12, point.x - bounds.left)) : (bounds?.width ?? 260) / 2, y: bounds && point ? Math.max(12, Math.min(bounds.height - 12, point.y - bounds.top)) : 50 });
    setOver(false);
  }
  return <div className="context-bloom-demo">
    <div className="context-bloom-sources">{sources.map((source, index) => <motion.button type="button" key={source.name} className="context-bloom-source" disabled={attached.includes(index)} drag={!attached.includes(index)} dragSnapToOrigin dragMomentum={false} whileDrag={{ scale: 1.06, rotate: -4, zIndex: 10 }}
      onDragStart={() => { clickAfterDrag.current = true; setSent(false); }}
      onDrag={(_, info) => { const point = clientPoint(info.point); const bounds = drop.current?.getBoundingClientRect(); setOver(!!bounds && point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom); }}
      onDragEnd={(_, info) => { const point = clientPoint(info.point); const bounds = drop.current?.getBoundingClientRect(); if (bounds && point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom) attach(index, point); setOver(false); }}
      onPointerDown={() => { clickAfterDrag.current = false; }} onClick={() => { if (!clickAfterDrag.current) attach(index); }} aria-label={`Attach ${source.name}`}>
      <ToolGlyph index={source.index} /><span>{source.name}</span>{attached.includes(index) ? <Check size={12} /> : <Plus size={12} />}
    </motion.button>)}</div>
    <div className={`context-bloom-composer${over ? ' is-over' : ''}`} ref={drop}>
      {bloom && !reduced && <AgentPixelRipple key={bloom.key} className="context-bloom-pixel-wave" x={bloom.x} y={bloom.y} radius={150} duration={850} spacing={5} onComplete={() => setBloom(current => current?.key === bloom.key ? null : current)} />}
      <div className="context-bloom-attachments">{attached.map(index => <motion.span layout initial={reduced ? false : { scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} key={index}><ToolGlyph index={sources[index].index} size={12} />{sources[index].name}<button type="button" aria-label={`Remove ${sources[index].name}`} onClick={() => { setAttached(items => items.filter(item => item !== index)); setSent(false); }}><X size={11} /></button></motion.span>)}</div>
      <textarea aria-label="A thought to explore" placeholder="What shall we make of this?" value={message} onChange={event => { setMessage(event.target.value); setSent(false); }} />
      <div className="context-bloom-composer-bottom"><span aria-live="polite">{sent ? 'Thought saved with its context.' : attached.length ? `${attached.length} reference${attached.length === 1 ? '' : 's'} added` : over ? 'Let go. Bring it in.' : 'A little context goes a long way.'}</span><button type="button" aria-label="Save thought with context" disabled={!message.trim() && attached.length === 0} onClick={() => setSent(true)}>{sent ? <Check size={15} /> : <ArrowUp size={15} />}</button></div>
    </div>
    <span className="agent-study-hint">Drag a reference into the box · or tap to add</span>
  </div>;
}
export function ContextBloom({ replayKey }: { replayKey: number }) { return <BloomStudy key={replayKey} />; }
