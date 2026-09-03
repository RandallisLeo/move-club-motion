import { motion } from 'motion/react';

export function SignalLoader({ replayKey }: { replayKey: number }) {
  return (
    <motion.div key={replayKey} className="signal-loader" initial="rest" animate="active">
      {[0, 1, 2, 3, 4].map((item) => (
        <motion.span
          key={item}
          variants={{
            rest: { scaleY: 0.18, opacity: 0.35 },
            active: { scaleY: [0.18, 1, 0.18], opacity: [0.35, 1, 0.35] },
          }}
          transition={{
            duration: 1.15,
            delay: item * 0.1,
            repeat: Infinity,
            ease: [0.76, 0, 0.24, 1],
          }}
        />
      ))}
    </motion.div>
  );
}
