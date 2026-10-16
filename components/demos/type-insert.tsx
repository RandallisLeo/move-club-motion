'use client';

import Image from 'next/image';
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import './nature-studies.css';

const scenes = [
  { src: '/nature-motion/forest.jpg', alt: 'Morning light over a quiet forest' },
  { src: '/feed-adapt/lake.jpg', alt: 'An alpine lake beneath misty peaks' },
  { src: '/feed-adapt/weekend.jpg', alt: 'A road winding through desert cliffs' },
];
const sentences = [
  { before: ['Make', 'room'], after: ['for', 'a', 'little', 'wonder.'], label: 'Quiet' },
  { before: ['Let', 'the', 'day', 'unfold.'], after: [], label: 'Daylight' },
  { before: [], after: ['Take', 'the', 'long', 'way', 'home.'], label: 'Wander' },
];
const ease = [0.22, 0.8, 0.24, 1] as [number, number, number, number];
// Read the words first; insert one scene at a time; leave time to look.
const holds = [2400, 700, 700, 6500, 1800, 1100];

function FloatingWord({ word, visible, delay, playing, inView, reduced }: {
  word: string; visible: boolean; delay: number; playing: boolean; inView: boolean; reduced: boolean;
}) {
  const progress = useMotionValue(reduced ? 1 : 0);
  const y = useTransform(progress, [0, 1], [14, 0]);
  const filter = useTransform(progress, value => `blur(${(1 - value) * 5}px)`);
  const playback = useRef<ReturnType<typeof animate> | null>(null);
  useEffect(() => {
    if (reduced) { progress.set(1); return; }
    playback.current = animate(progress, visible ? 1 : 0, { duration: visible ? 1.05 : 0.65, ease, delay: visible ? delay : 0 });
    return () => { playback.current?.stop(); playback.current = null; };
  }, [visible, delay, reduced, progress]);
  useEffect(() => {
    const animation = playback.current;
    if (!animation) return;
    if ((!playing || !inView) && animation.state === 'running') animation.pause();
    else if (playing && inView && animation.state === 'paused') animation.play();
  }, [playing, inView, visible, reduced]);
  return <motion.span style={{ opacity: progress, y, filter }}>{word}</motion.span>;
}

function Sentence({ index, step, started, playing, inView, reduced, advance }: {
  index: number; step: number; started: boolean; playing: boolean; inView: boolean; reduced: boolean; advance: () => void;
}) {
  const row = useRef<HTMLParagraphElement>(null);
  const progress = useMotionValue(0);
  const fontSize = useMotionValue(24);
  const playback = useRef<ReturnType<typeof animate> | null>(null);
  const sentence = sentences[index];
  const gapCount = Number(sentence.before.length > 0) + Number(sentence.after.length > 0);
  const slotWidth = useTransform(() => fontSize.get() * ((gapCount === 2 ? 0.24 : 0) + progress.get() * (2.65 + 0.24)));
  const opacity = useTransform(progress, [0, 0.15, 0.65, 1], [0, 0, 1, 1]);
  const bubbleWidth = useTransform(() => progress.get() * fontSize.get() * 2.65);
  const bubbleLeft = useTransform(() => sentence.before.length ? progress.get() * fontSize.get() * 0.24 : 0);
  const labelOpacity = useTransform(progress, [0, 0.7, 1], [0, 0, 1]);
  const inserted = started && step > index && step < 4;
  const textVisible = reduced || (started && step !== 5);

  useEffect(() => {
    const element = row.current;
    if (!element) return;
    const observer = new ResizeObserver(() => fontSize.set(parseFloat(getComputedStyle(element).fontSize)));
    observer.observe(element);
    fontSize.set(parseFloat(getComputedStyle(element).fontSize));
    return () => observer.disconnect();
  }, [fontSize]);
  useEffect(() => {
    if (reduced) { progress.set(inserted ? 1 : 0); return; }
    playback.current = animate(progress, inserted ? 1 : 0, { duration: 1.2, ease, delay: inserted ? 0 : index * 0.18 });
    return () => { playback.current?.stop(); playback.current = null; };
  }, [inserted, index, progress, reduced]);
  useEffect(() => {
    const animation = playback.current;
    if (!animation) return;
    if ((!playing || !inView) && animation.state === 'running') animation.pause();
    else if (playing && inView && animation.state === 'paused') animation.play();
  }, [playing, inView, step]);

  const words = (list: string[], offset: number) => <span className="type-insert-chunk">{list.map((word, i) => <FloatingWord key={`${offset}-${i}`} word={word} visible={textVisible} delay={index * 0.2 + (offset + i) * 0.045} {...{ playing, inView, reduced }} />)}</span>;
  return <p ref={row} className="type-insert-sentence" aria-label={[...sentence.before, ...sentence.after].join(' ')}>
    {sentence.before.length > 0 && words(sentence.before, 0)}
    <motion.span className="type-insert-slot" style={{ width: slotWidth }} data-placement={sentence.before.length ? sentence.after.length ? 'middle' : 'end' : 'start'}>
      <motion.button className="type-insert-bubble" style={{ opacity, width: bubbleWidth, left: bubbleLeft, pointerEvents: inserted ? 'auto' : 'none' }} type="button" disabled={!inserted} tabIndex={inserted ? 0 : -1} aria-label={`Advance the sequence from ${sentence.label}`} onClick={advance}>
        <Image width={180} height={90} src={scenes[index].src} alt={scenes[index].alt} className="is-current" />
        <motion.span style={{ opacity: labelOpacity }}>{sentence.label}</motion.span>
      </motion.button>
    </motion.span>
    {sentence.after.length > 0 && words(sentence.after, sentence.before.length)}
  </p>;
}

function InsertStudy() {
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { amount: 0.45 });
  const reduced = !!useReducedMotion();
  const started = useInView(root, { amount: 0.45, once: true });
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [manual, setManual] = useState(false);
  const advance = () => {
    setManual(true);
    setStep(value => reduced && value === 4 ? 0 : (value + 1) % holds.length);
  };
  useEffect(() => {
    if (reduced || !started || !playing || !inView) return;
    const timer = window.setTimeout(() => { setManual(false); setStep(value => (value + 1) % holds.length); }, holds[step]);
    return () => window.clearTimeout(timer);
  }, [step, started, playing, inView, reduced]);
  return <div ref={root} className="type-insert-demo" data-step={step} data-playing={playing}>
    <button type="button" className="type-insert-step" aria-label="Advance to the next text insertion step" onClick={advance} />
    <span className="type-insert-eyebrow">A LITTLE ROOM, IN EVERY LINE</span>
    <div className="type-insert-lines">{sentences.map((sentence, index) => <Sentence key={sentence.label} {...{ index, step, started, inView, reduced, advance }} playing={playing || manual} />)}</div>
    <div className="type-insert-controls"><span>Tap to advance · words make room.</span>{!reduced && <button type="button" aria-label={playing ? 'Pause text and insertions' : 'Resume text and insertions'} aria-pressed={!playing} onClick={() => { setManual(false); setPlaying(value => !value); }}>{playing ? 'Pause' : 'Resume'}</button>}</div>
  </div>;
}
export function TypeInsert({ replayKey }: { replayKey: number }) { return <InsertStudy key={replayKey} />; }
