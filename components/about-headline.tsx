'use client';

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useRef, useState, type FocusEvent, type PointerEvent as ReactPointerEvent } from 'react';
import './about-headline.css';

const foldText = 'A soft fold.';
const glassText = 'Light moving across glass.';
const tangibleText = 'I love when a screen feels tangible.';
const symbols = [
  'reference-daisy', 'mylar-cursor', 'velvet-star', 'striped-torus',
  'reference-asterisk', 'mint-spiral', 'pearl-heart', 'gingham-bang',
  'plush-daisy', 'reference-foil', 'satin-asterisk', 'reference-mylar',
];
// Equalize the visible silhouettes, including padding in the supplied cutouts.
const symbolOpticalScales: Record<string, number> = {
  'reference-daisy': 1.31, 'mylar-cursor': 1.09, 'velvet-star': 1.08,
  'striped-torus': 1.12, 'reference-asterisk': 1.08, 'mint-spiral': 1.12,
  'pearl-heart': 1.08, 'gingham-bang': 1.10, 'plush-daisy': 1.07,
  'reference-foil': 1.34, 'satin-asterisk': 1.09, 'reference-mylar': 1.88,
};
type TactileLayout = Array<{ weight: number; x: number }>;
const symbolSize = (weight: number) => .4 + .9 * Math.pow(Math.max(0, Math.min(1, weight)), 1.3);

function useTextInteraction() {
  const [active, setActive] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => {
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = null;
  };
  useEffect(() => () => {
    if (timeout.current) clearTimeout(timeout.current);
  }, []);
  return {
    active,
    handlers: {
      onPointerEnter: (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (event.pointerType !== 'touch') { clear(); setActive(true); }
      },
      onPointerLeave: (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (!event.currentTarget.matches(':focus-visible')) setActive(false);
      },
      onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (event.pointerType === 'touch') { clear(); setActive(true); }
      },
      onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (event.pointerType === 'touch') timeout.current = setTimeout(() => setActive(false), 850);
      },
      onPointerCancel: () => { clear(); setActive(false); },
      onFocus: (event: FocusEvent<HTMLButtonElement>) => {
        if (event.currentTarget.matches(':focus-visible')) setActive(true);
      },
      onBlur: () => { clear(); setActive(false); },
    },
  };
}

function FoldSentence() {
  const { active, handlers } = useTextInteraction();
  const reduced = useReducedMotion();
  const fold = useSpring(0, { stiffness: 135, damping: 19, mass: .8 });
  const leftAngle = useTransform(fold, [0, 1], [0, -38]);
  const rightAngle = useTransform(fold, [0, 1], [0, 66]);
  const tilt = useTransform(fold, [0, 1], [0, -18]);
  const turn = useTransform(fold, [0, 1], [0, -5]);
  const lift = useTransform(fold, [0, 1], [0, -4]);
  const rightColor = useTransform(fold, [0, 1], ['#20242b', '#45516b']);
  useEffect(() => {
    if (reduced) fold.jump(0);
    else fold.set(active ? 1 : 0);
  }, [active, reduced, fold]);
  return (
    <button type="button" className="about-text-action about-fold" aria-label={foldText} aria-description="Fold the words like a folding screen." data-active={active} data-reduced={!!reduced} {...handlers}>
      <span className="about-fold-measure" aria-hidden="true">{foldText}</span>
      <motion.span className="about-fold-panels" aria-hidden="true" style={{ rotateX: tilt, rotateZ: turn, y: lift }}>
        <motion.span className="about-fold-panel about-fold-left" style={{ rotateY: leftAngle }}>
          <motion.span className="about-fold-surface" style={{ opacity: fold }} />
          <span className="about-fold-clip"><span className="about-fold-print">{foldText}</span></span>
        </motion.span>
        <motion.span className="about-fold-panel about-fold-right" style={{ rotateY: rightAngle, color: rightColor }}>
          <motion.span className="about-fold-surface" style={{ opacity: fold }} />
          <span className="about-fold-clip"><span className="about-fold-print">{foldText}</span></span>
        </motion.span>
        <motion.span className="about-fold-hinge" style={{ opacity: fold }} />
      </motion.span>
    </button>
  );
}

function GlassSentence() {
  const { active, handlers } = useTextInteraction();
  const reduced = !!useReducedMotion();
  const ref = useRef<HTMLButtonElement>(null);
  const dimensions = useMotionValue({ width: 0, height: 0 });
  const targetX = useMotionValue(.5);
  const targetY = useMotionValue(.5);
  const springX = useSpring(targetX, { stiffness: 390, damping: 34, mass: .65 });
  const springY = useSpring(targetY, { stiffness: 390, damping: 34, mass: .65 });
  const x = reduced ? targetX : springX;
  const y = reduced ? targetY : springY;
  const zoom = 1.32;
  const width = useTransform(() => Math.min(dimensions.get().width, dimensions.get().height * 1.85));
  const height = useTransform(() => dimensions.get().height * 1.24);
  const centerX = useTransform(() => Math.max(width.get() / 2, Math.min(dimensions.get().width - width.get() / 2, x.get() * dimensions.get().width)));
  const centerY = useTransform(() => dimensions.get().height * (.5 + (y.get() - .5) * .4));
  const left = useTransform(() => centerX.get() - width.get() / 2);
  const top = useTransform(() => centerY.get() - height.get() / 2);
  // Counter-translate a single magnified copy: the lens moves, the sentence stays put.
  const printX = useTransform(() => -left.get() + (1 - zoom) * x.get() * dimensions.get().width);
  const printY = useTransform(() => height.get() / 2 - centerY.get() * zoom);
  const printWidth = useTransform(() => dimensions.get().width);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      dimensions.set({ width: rect.width, height: rect.height });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [dimensions]);
  function position(event: ReactPointerEvent<HTMLButtonElement>, enter = false) {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const py = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    targetX.set(px); targetY.set(py);
    if (enter) { springX.jump(px); springY.jump(py); }
  }
  return (
    <button ref={ref} type="button" className="about-text-action about-glass" aria-label={glassText}
      aria-description="Move a glass lens over the words. Arrow keys move the lens." data-active={active}
      {...handlers}
      onPointerEnter={event => { position(event, true); handlers.onPointerEnter(event); }}
      onPointerDown={event => { position(event, true); handlers.onPointerDown(event); }}
      onPointerMove={event => position(event)}
      onFocus={event => {
        handlers.onFocus(event);
        if (event.currentTarget.matches(':focus-visible')) { targetX.set(.5); targetY.set(.5); springX.jump(.5); springY.jump(.5); }
      }}
      onKeyDown={event => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(event.key)) {
          event.preventDefault();
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') targetY.set(Math.max(0, Math.min(1, targetY.get() + (event.key === 'ArrowUp' ? -.15 : .15))));
          else targetX.set(Math.max(0, Math.min(1, targetX.get() + (event.key === 'ArrowLeft' ? -.07 : .07))));
        }
      }}>
      <span className="about-glass-source" aria-hidden="true">{glassText}</span>
      <motion.span className="about-glass-lens" aria-hidden="true"
        initial={false} animate={{ opacity: active ? 1 : 0 }} transition={{ duration: reduced ? 0 : .16 }}
        style={{ width, height, x: left, y: top }}>
        <motion.span className="about-glass-print" style={{ x: printX, y: printY, width: printWidth, scale: zoom }}>{glassText}</motion.span>
        <span className="about-glass-polish" />
      </motion.span>
    </button>
  );
}

function ResponsiveLetter({ character, index, layout, reduced }: {
  character: string; index: number; layout: MotionValue<TactileLayout>; reduced: boolean;
}) {
  const target = useTransform(layout, letters => letters[index]?.weight ?? 0);
  const weight = useSpring(target, { stiffness: 280, damping: 24, mass: .65 });
  const strength = reduced ? target : weight;
  const scale = useTransform(strength, value => reduced ? .8 : symbolSize(value));
  const spreadTarget = useTransform(layout, letters => reduced ? 0 : letters[index]?.x ?? 0);
  const spread = useSpring(spreadTarget, { stiffness: 280, damping: 24, mass: .65 });
  const canSwap = character !== '.';
  // Restore the ink after the symbol has shrunk, keeping the two silhouettes separate.
  const inkOpacity = useTransform(strength, [.035, .075], [1, canSwap ? 0 : 1]);
  const symbolOpacity = useTransform(strength, [.085, .15], [0, canSwap ? 1 : 0]);
  const rotate = useTransform(strength, value => reduced ? 0 : value * ((index % 3 - 1) * 5));
  const symbolName = symbols[index % symbols.length];
  return (
    <span className="about-letter-slot" data-letter={index} data-symbolic={canSwap}>
      <motion.span className="about-letter-content" style={{ x: spread }}>
        <motion.span className="about-letter-ink" style={{ opacity: inkOpacity }}>{character}</motion.span>
        {canSwap && <motion.span className="about-letter-symbol" style={{ opacity: symbolOpacity, rotate, scale }}>
          <img src={`/images/about-symbols/${symbolName}.webp`} alt="" width="256" height="256" draggable="false" decoding="async" style={{ transform: `scale(${symbolOpticalScales[symbolName]})` }} />
        </motion.span>}
      </motion.span>
    </span>
  );
}

function TangibleSentence() {
  const text = tangibleText;
  const { active, handlers } = useTextInteraction();
  const reduced = !!useReducedMotion();
  const layout = useMotionValue<TactileLayout>([]);
  const ref = useRef<HTMLButtonElement>(null);
  const keyboardIndex = useRef(0);
  const words = text.split(' ');
  let characterIndex = 0;
  useEffect(() => {
    if (!active) layout.set([]);
  }, [active, layout]);
  function position(point: { clientX: number; clientY: number }) {
    const element = ref.current;
    if (!element) return;
    const fontSize = Number.parseFloat(getComputedStyle(element).fontSize);
    // The hit targets retain their original positions while the visual row makes room.
    const letters = Array.from(element.querySelectorAll<HTMLElement>('.about-letter-slot'));
    const rects = letters.map(letter => letter.getBoundingClientRect());
    const candidates = rects.map((rect, index) => {
      const dx = (point.clientX - rect.left - rect.width / 2) / (fontSize * 1.08);
      const dy = (point.clientY - rect.top - rect.height / 2) / (fontSize * .85);
      return { index, distance: dx * dx + dy * dy, canSwap: letters[index].dataset.symbolic === 'true' };
    }).filter(letter => letter.canSwap).sort((a, b) => a.distance - b.distance).slice(0, 3);
    const next = rects.map(() => ({ weight: 0, x: 0 }));
    for (const candidate of candidates) {
      const proximity = Math.exp(-3.8 * candidate.distance);
      next[candidate.index].weight = proximity > .03 ? Math.max(.18, proximity) : 0;
    }
    if (!reduced) {
      const rows = new Map<number, number[]>();
      rects.forEach((rect, index) => {
        const row = Math.round(rect.top);
        rows.set(row, [...(rows.get(row) ?? []), index]);
      });
      for (const indices of rows.values()) {
        const extra = indices.map(index => next[index].weight > 0
          ? Math.max(0, fontSize * (symbolSize(next[index].weight) + .09) - rects[index].width)
          : 0);
        let offset = -extra.reduce((sum, value) => sum + value, 0) / 2;
        indices.forEach((index, rowIndex) => {
          next[index].x = offset + extra[rowIndex] / 2;
          offset += extra[rowIndex];
        });
      }
    }
    layout.set(next);
  }
  function focusLetter(index: number) {
    const letters = ref.current?.querySelectorAll<HTMLElement>('.about-letter-slot');
    if (!letters?.length) return;
    keyboardIndex.current = Math.max(0, Math.min(letters.length - 1, index));
    const rect = letters[keyboardIndex.current].getBoundingClientRect();
    position({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });
  }
  return (
    <button ref={ref} type="button" className="about-text-action about-tangible" aria-label={text}
      aria-description="Brush the letters into tactile symbols. Arrow keys move the effect."
      data-active={active} {...handlers}
      onPointerEnter={event => { position(event); handlers.onPointerEnter(event); }}
      onPointerDown={event => { position(event); handlers.onPointerDown(event); }}
      onPointerMove={position}
      onFocus={event => {
        handlers.onFocus(event);
        if (event.currentTarget.matches(':focus-visible')) focusLetter(Math.floor(text.replaceAll(' ', '').length / 2));
      }}
      onKeyDown={event => {
        if (['ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(event.key)) {
          event.preventDefault();
          focusLetter(keyboardIndex.current + (event.key === 'ArrowLeft' ? -1 : 1));
        }
      }}>
      {words.map((word, wordIndex) => <span className="about-text-word" key={wordIndex} aria-hidden="true">
        {Array.from(word).map(character => {
          const index = characterIndex++;
          return <ResponsiveLetter key={index} character={character} index={index} layout={layout} reduced={reduced} />;
        })}
        {wordIndex < words.length - 1 && <span className="about-word-space"> </span>}
      </span>)}
    </button>
  );
}

export function AboutHeadline() {
  return (
    <h1 id="intro-title" className="about-headline about-motion-headline" aria-label={`${foldText} ${glassText} ${tangibleText}`}>
      <span className="about-first-line"><FoldSentence /><GlassSentence /></span>
      <TangibleSentence />
    </h1>
  );
}
