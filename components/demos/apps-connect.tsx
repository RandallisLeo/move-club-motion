'use client';

import Image from 'next/image';
import { ArrowUp, Check, Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';
import { useStudyReducedMotion } from './agent-study-shared';

const apps = [
  { name: 'Figma', logo: 'figma-color' },
  { name: 'GitHub', logo: 'github' },
  { name: 'Notion', logo: 'notion' },
  { name: 'Google Drive', logo: 'googledrive-color' },
  { name: 'Google Calendar', logo: 'googlecalendar-color' },
  { name: 'Slack', logo: 'slack-color' },
];

function AppLogo({ index, size = 16 }: { index: number; size?: number }) {
  return <Image unoptimized src={`/app-logos/${apps[index].logo}.svg`} width={size} height={size} alt="" draggable={false} />;
}

function ConnectStudy() {
  const reduced = useStudyReducedMotion();
  const [connected, setConnected] = useState([0, 2]);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const id = useId();
  const icons = useRef<HTMLDivElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    function escape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || (!panel.current?.contains(document.activeElement) && document.activeElement !== addButton.current)) return;
      event.stopPropagation();
      setOpen(false);
      addButton.current?.focus();
    }
    function dismissOutside(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node) || panel.current?.contains(target) || addButton.current?.contains(target)) return;
      // Connected logos toggle the picker themselves; keep their click intact.
      if (target instanceof Element && target.closest('.apps-connect-logo') && icons.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', dismissOutside, true);
    return () => {
      document.removeEventListener('keydown', escape);
      document.removeEventListener('pointerdown', dismissOutside, true);
    };
  }, [open]);
  function remove(index: number) {
    const position = connected.indexOf(index);
    const remaining = connected.filter(item => item !== index);
    setConnected(remaining);
    const next = remaining[position] ?? remaining[position - 1];
    const nextButton = next === undefined ? null : icons.current?.querySelector<HTMLButtonElement>(`[data-app="${next}"] .apps-connect-logo`);
    (nextButton ?? addButton.current)?.focus();
  }
  function close() { setOpen(false); addButton.current?.focus(); }
  return <div className="apps-connect-demo">
    <div className="apps-connect-workspace">
      <div className="apps-connect-composer">
        <div className="apps-connect-dock"><div className="apps-connect-icons" ref={icons} aria-label="Connected apps">
          <AnimatePresence initial={false}>{connected.map(index => <motion.div className="apps-connect-app" data-app={index} layout initial={reduced ? false : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.65, opacity: 0 }} transition={{ duration: reduced ? 0 : 0.18 }} key={index}>
            <button className="apps-connect-logo" type="button" aria-label={`Manage ${apps[index].name}, connected`} title={apps[index].name} onClick={() => open ? close() : setOpen(true)}><AppLogo index={index} /></button>
            <button className="apps-connect-remove" type="button" aria-label={`Remove ${apps[index].name}`} onClick={() => remove(index)}><X size={10} strokeWidth={1.5} aria-hidden="true" /></button>
          </motion.div>)}</AnimatePresence>
          <button ref={addButton} type="button" className="apps-connect-add" aria-expanded={open} aria-controls={id} aria-label={open ? 'Close app picker' : 'Add or manage apps'} onClick={() => open ? close() : setOpen(true)}>{open ? <X size={14} /> : <Plus size={14} />}</button>
        </div></div>
        <textarea aria-label="Thought for connected tools" placeholder="A small thought…" value={message} onChange={event => { setMessage(event.target.value); setSaved(false); }} />
        <div className="apps-connect-footer"><span className="apps-connect-status" aria-live="polite">{saved ? 'Thought saved.' : `${connected.length} apps connected`}</span><button type="button" className="apps-connect-send" aria-label="Save thought" disabled={!message.trim()} onClick={() => setSaved(true)}>{saved ? <Check size={14} /> : <ArrowUp size={14} />}</button></div>
      </div>
      <AnimatePresence>{open && <motion.section className="apps-connect-picker" id={id} ref={panel} aria-label="App connections" initial={reduced ? false : { opacity: 0, y: -8, scale: 0.96, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: reduced ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}>
        <div className="apps-connect-picker-heading"><span>Your connections</span><button type="button" onClick={close} aria-label="Close app connections"><X size={12} /></button></div>
        <div className="apps-connect-list">{apps.map((tool, index) => <button type="button" key={tool.name} aria-pressed={connected.includes(index)} onClick={() => setConnected(items => items.includes(index) ? items.filter(item => item !== index) : [...items, index])}><AppLogo index={index} /><span>{tool.name}</span><motion.span className="apps-connect-check" animate={{ scale: connected.includes(index) ? 1 : 0.8 }}>{connected.includes(index) ? <Check size={12} /> : <Plus size={12} />}</motion.span></button>)}</div>
      </motion.section>}</AnimatePresence>
    </div>
  </div>;
}
export function AppsConnect({ replayKey }: { replayKey: number }) { return <ConnectStudy key={replayKey} />; }
