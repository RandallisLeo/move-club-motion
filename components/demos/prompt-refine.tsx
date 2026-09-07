'use client';

import { ArrowUp, Check, Copy, Pencil } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { flushSync } from 'react-dom';
import { applyIntent, freshIntent, replyFor, SAMPLE, suggestPrompts, type Suggestion, type WritingIntent } from './prompt-refine-intent';
import './prompt-refine.css';

type Phase = 'waiting' | 'answer' | 'settling' | 'prompts' | 'ready';
type Turn = { id: number; message: string; answer: string; intent: WritingIntent; suggestions: Suggestion[]; phase: Phase; retired: boolean };
type Origin = { x: number; y: number; width: number; height: number; label: string; background: string; color: string };
const EASE = 'cubic-bezier(.22,1,.36,1)';
const TIMING = { settle: 280, stagger: 35, flight: 390 };

function updateRailFade(rail: HTMLElement) {
  rail.parentElement?.classList.toggle('at-end', rail.scrollWidth - rail.clientWidth - rail.scrollLeft < 3);
}

function PromptRail({ turn, enabled, onSelect }: { turn: Turn; enabled: boolean; onSelect: (suggestion: Suggestion, button: HTMLButtonElement) => void }) {
  const railRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; id: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const observer = new ResizeObserver(() => updateRailFade(rail));
    observer.observe(rail);
    updateRailFade(rail);
    return () => observer.disconnect();
  }, []);

  function stopDrag() {
    if (drag.current) suppressClick.current = drag.current.moved;
    drag.current = null;
    railRef.current?.classList.remove('is-dragging');
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current) return;
    const delta = event.clientX - current.x;
    if (Math.abs(delta) > 5 && !current.moved) {
      current.moved = true;
      event.currentTarget.setPointerCapture(current.id);
      event.currentTarget.classList.add('is-dragging');
    }
    if (current.moved) {
      event.preventDefault();
      event.currentTarget.scrollLeft = current.left - delta;
    }
  }

  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const rail = event.currentTarget;
    const buttons = [...rail.querySelectorAll<HTMLButtonElement>('button')];
    if (!buttons.length) return;
    event.preventDefault();
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = buttons[Math.max(0, Math.min(buttons.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1)))];
    // Only scroll this horizontal rail; leave the gallery page and chat position alone.
    if (next.offsetLeft < rail.scrollLeft) rail.scrollLeft = next.offsetLeft;
    else if (next.offsetLeft + next.offsetWidth > rail.scrollLeft + rail.clientWidth) rail.scrollLeft = next.offsetLeft + next.offsetWidth - rail.clientWidth;
    next.focus({ preventScroll: true });
  }

  const open = !turn.retired && (turn.phase === 'prompts' || turn.phase === 'ready') && turn.suggestions.length > 0;
  return (
    <div className={`pr-prompt-slot${open ? ' is-open' : ''}`} inert={!enabled}>
      <div className="pr-rail-wrap">
        <div ref={railRef} className="pr-rail" role="group" aria-label="Send a prompt about this reply"
          onScroll={(event) => updateRailFade(event.currentTarget)} onKeyDown={moveFocus}
          onPointerDown={(event) => {
            suppressClick.current = false;
            if (event.pointerType === 'mouse' && event.button === 0) drag.current = { x: event.clientX, left: event.currentTarget.scrollLeft, id: event.pointerId, moved: false };
          }}
          onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onLostPointerCapture={stopDrag}
          onClickCapture={(event) => {
            if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; }
          }}
        >
          {turn.suggestions.map((suggestion) => (
            <button key={suggestion.key} type="button" className="pr-chip" data-prompt={suggestion.key} aria-label={`Send: ${suggestion.label}`} disabled={!enabled} onClick={(event) => onSelect(suggestion, event.currentTarget)}>
              <span className="pr-chip-face" style={{ opacity: turn.phase === 'prompts' || turn.phase === 'ready' ? 1 : 0 }}>{suggestion.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function WritingTurn({ turn, active, onSelect, announce }: { turn: Turn; active: boolean; onSelect: (turn: Turn, suggestion: Suggestion, button: HTMLButtonElement) => void; announce: (message: string) => void }) {
  const [editing, setEditing] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const completed = ['settling', 'prompts', 'ready'].includes(turn.phase);
  const words = turn.answer.split(' ');

  useEffect(() => {
    if (editing) textRef.current?.focus({ preventScroll: true });
  }, [editing]);

  async function copyText() {
    const text = textRef.current;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text.textContent ?? turn.answer);
      announce('Text copied.');
    } catch {
      const range = document.createRange();
      range.selectNodeContents(text);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      announce('Text selected. Use your system copy command.');
    }
  }

  return (
    <section className="pr-turn" data-turn={turn.id} data-ready={turn.phase === 'ready'}>
      <div className="pr-user">{turn.message}</div>
      <div className="pr-reply" aria-busy={!completed}>
        <div className="pr-wait" hidden={turn.phase !== 'waiting'} role="status" aria-label="Generating a response"><span /></div>
        <div className="pr-card" hidden={turn.phase === 'waiting'}>
          <div className="pr-card-inner">
            <div className="pr-card-head">
              <span>{turn.intent.explained ? 'Changes' : 'Writing'}</span>
              <div className="pr-card-actions">
                <button type="button" aria-label={editing ? 'Finish editing' : 'Edit this text'} disabled={!completed} onClick={() => setEditing((value) => !value)}>{editing ? <Check size={20} strokeWidth={1.9} /> : <Pencil size={20} strokeWidth={1.9} />}</button>
                <button type="button" aria-label="Copy this text" disabled={!completed} onClick={copyText}><Copy size={20} strokeWidth={1.9} /></button>
              </div>
            </div>
            <p ref={textRef} className="pr-answer" contentEditable={editing} suppressContentEditableWarning>
              {words.map((word, index) => <Fragment key={`${index}-${word}`}><span className="pr-word" style={{ opacity: completed ? 1 : 0 }}>{word}</span>{index < words.length - 1 ? ' ' : ''}</Fragment>)}
            </p>
          </div>
        </div>
        <PromptRail turn={turn} enabled={active && turn.phase === 'ready' && !turn.retired} onSelect={(suggestion, button) => onSelect(turn, suggestion, button)} />
      </div>
    </section>
  );
}

function PromptSession() {
  const root = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(SAMPLE);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [announcement, announce] = useState('The fictional example is ready to send.');
  const reduced = useReducedMotion();
  const preferences = useRef({ reduced: Boolean(reduced), slow });
  preferences.current = { reduced: Boolean(reduced), slow };
  const generation = useRef(0);
  const nextId = useRef(0);
  const busyNow = useRef(false);
  const follow = useRef(true);
  const animations = useRef(new Set<Animation>());
  const timers = useRef(new Map<number, (valid: boolean) => void>());
  const frames = useRef(new Map<number, (valid: boolean) => void>());

  useEffect(() => () => {
    generation.current += 1;
    for (const [id, resolve] of timers.current) { window.clearTimeout(id); resolve(false); }
    for (const [id, resolve] of frames.current) { cancelAnimationFrame(id); resolve(false); }
    for (const animation of animations.current) animation.cancel();
    timers.current.clear(); frames.current.clear(); animations.current.clear();
  }, []);

  useEffect(() => {
    if (reduced) for (const animation of animations.current) { try { animation.finish(); } catch { /* Already cancelled on replay. */ } }
  }, [reduced]);

  useLayoutEffect(() => {
    const field = input.current;
    if (!field) return;
    function resize() {
      if (!field) return;
      field.style.height = 'auto';
      field.style.height = `${Math.max(36, field.scrollHeight)}px`;
    }
    resize();
    let width = field.clientWidth;
    const observer = new ResizeObserver(() => { if (field.clientWidth !== width) { width = field.clientWidth; resize(); } });
    observer.observe(field);
    return () => observer.disconnect();
  }, [draft]);

  const valid = (token: number) => token === generation.current;
  const duration = (ms: number) => preferences.current.reduced ? 0 : ms * (preferences.current.slow ? 1.7 : 1);

  function wait(ms: number, token: number): Promise<boolean> {
    return new Promise((resolve) => {
      const id = window.setTimeout(() => { timers.current.delete(id); resolve(valid(token)); }, ms * (preferences.current.slow ? 1.7 : 1));
      timers.current.set(id, resolve);
    });
  }

  function animate(element: Element, keyframes: Keyframe[], ms: number, token: number, delay = 0): Promise<boolean> {
    if (!valid(token)) return Promise.resolve(false);
    if (preferences.current.reduced) return Promise.resolve(true);
    const animation = element.animate(keyframes, { duration: duration(ms), delay: duration(delay), easing: EASE, fill: 'backwards' });
    animations.current.add(animation);
    return animation.finished.then(() => valid(token), () => false).finally(() => animations.current.delete(animation));
  }

  function tween(ms: number, token: number, step: (progress: number) => void): Promise<boolean> {
    if (!valid(token)) return Promise.resolve(false);
    if (preferences.current.reduced) { step(1); return Promise.resolve(true); }
    const total = duration(ms);
    return new Promise((resolve) => {
      const start = performance.now();
      let id: number;
      function tick(now: number) {
        frames.current.delete(id);
        if (!valid(token)) { resolve(false); return; }
        const progress = preferences.current.reduced ? 1 : Math.min(1, (now - start) / total);
        step(progress);
        if (progress < 1) { id = requestAnimationFrame(tick); frames.current.set(id, resolve); }
        else resolve(true);
      }
      id = requestAnimationFrame(tick); frames.current.set(id, resolve);
    });
  }

  function scrollLatest(ms: number, token: number) {
    const scroll = viewport.current;
    if (!scroll) return Promise.resolve(false);
    const start = scroll.scrollTop;
    return tween(ms, token, (progress) => {
      if (follow.current) scroll.scrollTop = start + (Math.max(0, scroll.scrollHeight - scroll.clientHeight) - start) * (1 - (1 - progress) ** 3);
    });
  }

  function updateTurn(id: number, patch: Partial<Turn>) {
    flushSync(() => setTurns((current) => current.map((turn) => turn.id === id ? { ...turn, ...patch } : turn)));
  }

  function appendTurn(message: string, intent: WritingIntent) {
    const answer = replyFor(intent);
    const turn: Turn = { id: nextId.current++, message, answer, intent, suggestions: suggestPrompts(intent, answer), phase: 'waiting', retired: false };
    flushSync(() => setTurns((current) => [...current, turn]));
    return turn;
  }

  function turnElement(id: number) { return root.current?.querySelector<HTMLElement>(`[data-turn="${id}"]`); }

  async function showAnswer(turn: Turn, token: number) {
    if (!valid(token)) return false;
    updateTurn(turn.id, { phase: 'answer' });
    const node = turnElement(turn.id);
    const card = node?.querySelector<HTMLElement>('.pr-card');
    if (!card) return false;
    const height = card.getBoundingClientRect().height;
    const motions = [animate(card, [{ height: '24px', opacity: .4 }, { height: `${height}px`, opacity: 1 }], 320, token), scrollLatest(360, token)];
    const words = [...card.querySelectorAll<HTMLElement>('.pr-word')];
    for (let index = 0; index < words.length; index++) {
      words[index].style.opacity = '1';
      motions.push(animate(words[index], [{ opacity: 0 }, { opacity: 1 }], 190, token));
      if (!preferences.current.reduced && index % 3 === 2 && index < words.length - 1 && !await wait(60, token)) return false;
    }
    await Promise.all(motions);
    if (!valid(token)) return false;
    updateTurn(turn.id, { phase: 'settling' });
    announce(turn.answer);
    return true;
  }

  async function showPrompts(turn: Turn, token: number) {
    if (!valid(token)) return;
    if (turn.suggestions.length) {
      if (!await wait(preferences.current.reduced ? 0 : TIMING.settle, token)) return;
      updateTurn(turn.id, { phase: 'prompts' });
      const slot = turnElement(turn.id)?.querySelector<HTMLElement>('.pr-prompt-slot');
      if (!slot) return;
      const motions = [animate(slot, [{ height: '0px' }, { height: '48px' }], 300, token), scrollLatest(390, token)];
      slot.querySelectorAll<HTMLElement>('.pr-chip-face').forEach((face, index) => {
        motions.push(animate(face, [
          { opacity: 0, transform: 'translateY(5px) scale(.985)', clipPath: 'inset(18% 0 0 0 round 13px)' },
          { opacity: 1, transform: 'translateY(0) scale(1)', clipPath: 'inset(0 0 0 0 round 13px)' },
        ], 270, token, 25 + index * TIMING.stagger));
      });
      await Promise.all(motions);
      if (!valid(token)) return;
    }
    updateTurn(turn.id, { phase: 'ready' });
    busyNow.current = false;
    setBusy(false);
  }

  async function receive(turn: Turn, token: number) {
    if (!await wait(670, token) || !await showAnswer(turn, token)) return;
    await showPrompts(turn, token);
  }

  async function flyPrompt(origin: Origin, target: HTMLElement, token: number) {
    if (preferences.current.reduced || !screen.current || !layer.current) return;
    const bounds = layer.current.getBoundingClientRect();
    const clone = document.createElement('div');
    clone.className = 'pr-flight'; clone.textContent = origin.label;
    // Keep the destination appearance underneath WAAPI so its completion cannot flash the old pill.
    Object.assign(clone.style, { left: `${origin.x - bounds.x}px`, top: `${origin.y - bounds.y}px`, width: `${origin.width}px`, height: `${origin.height}px`, fontSize: '17px', background: '#e5f3ff', color: '#006dce', borderRadius: '23px' });
    layer.current.appendChild(clone); target.style.opacity = '0';
    const colors = animate(clone, [
      { backgroundColor: origin.background, color: origin.color, fontSize: '11.52px', borderRadius: '12.48px' },
      { backgroundColor: '#e5f3ff', color: '#006dce', fontSize: '17px', borderRadius: '23px' },
    ], TIMING.flight, token);
    await tween(TIMING.flight, token, (progress) => {
      const base = layer.current?.getBoundingClientRect();
      if (!base) return;
      const rect = target.getBoundingClientRect(), eased = 1 - (1 - progress) ** 3;
      Object.assign(clone.style, { left: `${origin.x - base.x + (rect.x - origin.x) * eased}px`, top: `${origin.y - base.y + (rect.y - origin.y) * eased}px`, width: `${origin.width + (rect.width - origin.width) * eased}px`, height: `${origin.height + (rect.height - origin.height) * eased}px` });
    });
    await colors;
    if (valid(token)) target.style.opacity = '1';
    clone.remove();
  }

  async function sendInitial() {
    if (busyNow.current || !draft) return;
    const token = generation.current;
    busyNow.current = true; follow.current = true;
    const message = draft;
    const composer = root.current?.querySelector<HTMLElement>('.pr-composer-zone');
    input.current?.blur();
    setBusy(true);
    if (composer && !await animate(composer, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-8px)' }], 160, token)) return;
    if (!valid(token)) return;
    flushSync(() => { setBusy(true); setDraft(''); });
    const turn = appendTurn(message, freshIntent());
    announce('Example sent.');
    const user = turnElement(turn.id)?.querySelector<HTMLElement>('.pr-user');
    if (user) void animate(user, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], 280, token);
    void scrollLatest(280, token);
    await receive(turn, token);
  }

  async function sendPrompt(source: Turn, suggestion: Suggestion, button: HTMLButtonElement) {
    if (busyNow.current || source.retired || source.id !== turns.at(-1)?.id) return;
    const token = generation.current;
    busyNow.current = true; follow.current = true; setBusy(true);
    announce(`Sent: ${suggestion.label}.`);
    const face = button.querySelector<HTMLElement>('.pr-chip-face');
    if (!face) return;
    face.style.transform = 'scale(.96)';
    if (!await animate(face, [{ transform: 'scale(1)' }, { transform: 'scale(.96)' }], 85, token)) return;
    if (!valid(token)) return;
    const rect = face.getBoundingClientRect(), style = getComputedStyle(face);
    const origin: Origin = { x: rect.x, y: rect.y, width: rect.width, height: rect.height, label: suggestion.label, background: style.backgroundColor, color: style.color };
    const slot = turnElement(source.id)?.querySelector<HTMLElement>('.pr-prompt-slot');
    const height = slot?.getBoundingClientRect().height ?? 48;
    const rail = slot?.querySelector<HTMLElement>('.pr-rail');
    const turn = appendTurn(suggestion.label, applyIntent(source.intent, suggestion.key));
    face.style.visibility = 'hidden';
    const target = turnElement(turn.id)?.querySelector<HTMLElement>('.pr-user');
    const flight = target ? flyPrompt(origin, target, token) : Promise.resolve();
    updateTurn(source.id, { retired: true });
    if (slot) void animate(slot, [{ height: `${height}px` }, { height: '0px' }], 250, token);
    if (rail) void animate(rail, [{ opacity: 1 }, { opacity: 0 }], 130, token);
    void scrollLatest(TIMING.flight, token);
    await Promise.all([flight, receive(turn, token)]);
  }

  return (
    <div ref={root} className="prompt-refine-demo" aria-label="Prompt refinement motion study">
      <div className="pr-controls"><span>Fictional text · simulated replies</span><button type="button" className="pr-speed" onClick={() => setSlow((value) => !value)} aria-label={slow ? 'Use normal playback speed' : 'Use slow playback speed'}>{slow ? '0.6×' : '1×'}</button></div>
      <div ref={screen} className={`pr-screen${turns.length ? ' has-turns' : ''}`}>
        <div ref={viewport} className="pr-scroll" aria-label="Conversation" hidden={!turns.length} onWheel={() => { follow.current = false; }} onTouchStart={() => { follow.current = false; }}>
          {turns.map((turn) => <WritingTurn key={turn.id} turn={turn} active={!busy && turn.id === turns.at(-1)?.id} onSelect={sendPrompt} announce={announce} />)}
        </div>
        <div className="pr-composer-zone" hidden={!draft}><div className="pr-composer">
          <textarea ref={input} rows={1} readOnly value={draft} disabled={busy} aria-label="Prefilled fictional text. Send to try the study." onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendInitial(); } }} />
          <button type="button" className="pr-send" aria-label="Send message" disabled={busy || !draft} onClick={sendInitial}><span><ArrowUp size={19} strokeWidth={2} /></span></button>
        </div></div>
        <div ref={layer} className="pr-flight-layer" aria-hidden="true" />
      </div>
      <div className="pr-sr" aria-live="polite">{announcement}</div>
    </div>
  );
}

export function PromptRefine({ replayKey }: { replayKey: number }) {
  return <PromptSession key={replayKey} />;
}
