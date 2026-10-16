'use client';

import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect } from 'react';
import {
  MaterialOption,
  menuVibes,
  type MaterialMenu,
} from './menu-material-shared';

// Child hinges belong to the preceding plate: a lower row travels with the
// upper row instead of rotating in an unrelated, fixed slot.
function HingedPlate({ menu, index }: { menu: MaterialMenu; index: number }) {
  const closedAngle = index === 0 ? -94 : index % 2 ? 176 : -176;
  const angle = useMotionValue(menu.reduced && menu.open ? 0 : closedAngle);
  const shade = useTransform(angle, (value) =>
    Math.min(0.62, Math.abs(Math.sin((value * Math.PI) / 180)) * 0.6),
  );
  const shine = useTransform(
    angle,
    (value) => Math.max(0, Math.sin((value * Math.PI) / 180)) * 0.25,
  );
  useEffect(() => {
    const control = animate(
      angle,
      menu.open ? 0 : closedAngle,
      menu.reduced
        ? { duration: 0 }
        : {
            type: 'spring',
            stiffness: menu.open ? 300 : 350,
            damping: menu.open ? 15 : 26,
            mass: 0.82,
            delay: menu.open ? index * 0.085 : (4 - index) * 0.045,
          },
    );
    return () => control.stop();
  }, [angle, closedAngle, index, menu.open, menu.reduced]);
  return (
    <motion.div className="mm-flap-joint" style={{ rotateX: angle }}>
      <div className="mm-flap-front">
        <MaterialOption menu={menu} index={index} />
        <motion.span
          className="mm-flap-shade"
          style={{ opacity: shade }}
          aria-hidden="true"
        />
        <motion.span
          className="mm-flap-shine"
          style={{ opacity: shine }}
          aria-hidden="true"
        />
        <span className="mm-flap-axis" aria-hidden="true" />
        <span className="mm-flap-edge" aria-hidden="true" />
      </div>
      <div className="mm-flap-back" aria-hidden="true">
        <span>MOVE CLUB</span>
      </div>
      {index < menuVibes.length - 1 && (
        <HingedPlate menu={menu} index={index + 1} />
      )}
    </motion.div>
  );
}
export function FlapSurface({ menu }: { menu: MaterialMenu }) {
  return (
    <motion.div
      className="mm-flap-surface"
      initial={{ opacity: 0 }}
      animate={{ opacity: menu.open ? 1 : 0 }}
      transition={{
        duration: menu.reduced ? 0 : 0.14,
        delay: menu.reduced || menu.open ? 0 : 0.66,
      }}
    >
      <HingedPlate menu={menu} index={0} />
    </motion.div>
  );
}
