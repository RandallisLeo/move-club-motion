'use client';

import { Check } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

const phases = ['Understanding', 'Exploring', 'Composing', 'Refining', 'Complete'];

export function StatusWave({ replayKey }: { replayKey: number }) {
  const [phase, setPhase] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const nextPhase = useRef(1);
  const reduceMotion = useReducedMotion();
  const isComplete = phase === phases.length - 1;

  const advance = useCallback(() => {
    if (isExiting) return;
    nextPhase.current = (phase + 1) % phases.length;
    setIsExiting(true);
  }, [isExiting, phase]);

  useEffect(() => {
    if (isExiting) return;
    const timer = window.setTimeout(advance, isComplete ? 3600 : 2200);
    return () => window.clearTimeout(timer);
  }, [advance, isComplete, isExiting, phase, replayKey]);

  const finishExit = () => {
    setPhase(nextPhase.current);
    setIsExiting(false);
  };

  return (
    <div key={replayKey} className="status-wave-demo">
      <button
        type="button"
        className="status-wave-control"
        onClick={advance}
        aria-label={`${phases[phase]}. Activate to ${isComplete ? 'restart' : 'advance'} the stage.`}
      >
        <motion.span
          className="status-wave-copy"
          layout
          transition={{ layout: { type: 'spring', stiffness: 360, damping: 31, mass: 0.7 } }}
        >
          <motion.span
            className="status-wave-word"
            layout
            aria-live="polite"
            transition={{ layout: { type: 'spring', stiffness: 360, damping: 31, mass: 0.7 } }}
          >
            <motion.span key={phases[phase]} className="status-wave-letters">
              {[...phases[phase]].map((letter, index, letters) => (
                <motion.span
                  key={`${letter}-${index}`}
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                  animate={isExiting ? { opacity: 0, y: reduceMotion ? 0 : -7 } : { opacity: 1, y: 0 }}
                  transition={{
                    duration: reduceMotion ? 0.01 : isExiting ? 0.14 : 0.24,
                    delay: reduceMotion ? 0 : index * (isExiting ? 0.018 : 0.035),
                    ease: isExiting ? 'easeIn' : [0.22, 1, 0.36, 1],
                  }}
                  onAnimationComplete={() => {
                    if (isExiting && index === letters.length - 1) finishExit();
                  }}
                >
                  {letter}
                </motion.span>
              ))}
            </motion.span>
          </motion.span>

          <motion.span
            className="status-wave-indicator"
            layout="position"
            aria-hidden="true"
            transition={{ layout: { type: 'spring', stiffness: 360, damping: 31, mass: 0.7 } }}
          >
            {isComplete ? (
              <motion.span
                className="status-wave-complete"
                initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 460, damping: 24 }}
              >
                <Check size={11} strokeWidth={2.4} />
              </motion.span>
            ) : (
              <span className="status-wave-dots">
                {[0, 1, 2].map((dot) => (
                  <motion.span
                    key={dot}
                    animate={reduceMotion ? { opacity: 0.62 } : { y: [0, -4, 0], opacity: [0.34, 1, 0.34] }}
                    transition={{
                      duration: 1.2,
                      delay: dot * 0.16,
                      repeat: reduceMotion ? 0 : Number.POSITIVE_INFINITY,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </span>
            )}
          </motion.span>
        </motion.span>
      </button>
      <span className="status-wave-hint">{isComplete ? 'Click to restart' : 'Click to advance'}</span>
    </div>
  );
}
