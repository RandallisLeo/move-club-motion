'use client';

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Animated dropdown retains listbox semantics and complete keyboard navigation. */

import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import {
  MaterialOption,
  MaterialTrigger,
  menuVibes,
  useMaterialMenu,
} from './menu-material-shared';
import { SilkSurface } from './menu-materials-silk';
import { FlapSurface } from './menu-materials-flap';

type Material = 'silk' | 'flap' | 'light';
const materials: Material[] = ['silk', 'flap', 'light'];
const captions = {
  silk: 'Fall · Catch · Settle',
  flap: 'Hinge · Release · Settle',
  light: 'Glow · Illuminate · Fade',
};

function MaterialMenu() {
  const {
    state: menu,
    refs: { rootRef, triggerRef, panelRef },
  } = useMaterialMenu();
  const [material, setMaterial] = useState<Material>('silk');
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (switchTimer.current) clearTimeout(switchTimer.current);
    },
    [],
  );
  function changeMaterial(next: Material) {
    if (next === material) return;
    if (switchTimer.current) clearTimeout(switchTimer.current);
    menu.setOpen(false);
    setMaterial(next);
    switchTimer.current = setTimeout(
      () => menu.setOpen(true),
      menu.reduced ? 0 : 180,
    );
  }
  return (
    <div
      className="menu-materials-demo"
      data-material={material}
      ref={rootRef}
      onBlur={menu.onRootBlur}
    >
      <div className="mm-preview">
        <div className="mm-anchor">
          <MaterialTrigger menu={menu} triggerRef={triggerRef} />
          {material === 'light' && (
            <motion.div
              className="mm-light-halo"
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: menu.open ? 0.8 : 0 }}
              transition={{ duration: menu.reduced ? 0 : 0.9 }}
            />
          )}
          <div
            className={`mm-panel mm-${material}-panel`}
            ref={panelRef}
            id={`${menu.id}-list`}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={`${menu.id}-trigger`}
            aria-hidden={!menu.open}
            inert={!menu.open}
            onKeyDown={menu.onPanelKey}
          >
            {material === 'silk' && (
              <>
                <SilkSurface
                  open={menu.open}
                  selected={menu.selected}
                  reduced={!!menu.reduced}
                />
                <div
                  className="mm-silk-hitareas mm-options"
                  data-open={menu.open}
                >
                  {menuVibes.map((vibe, index) => (
                    <MaterialOption key={vibe} menu={menu} index={index} />
                  ))}
                </div>
              </>
            )}
            {material === 'flap' && <FlapSurface menu={menu} />}
            {material === 'light' && (
              <motion.div
                className="mm-light-face"
                initial={{ opacity: 0, filter: 'brightness(.12) blur(4px)' }}
                animate={{
                  opacity: menu.open ? 1 : 0,
                  filter: menu.open
                    ? 'brightness(1) blur(0px)'
                    : 'brightness(.12) blur(4px)',
                }}
                transition={{
                  duration: menu.reduced ? 0 : menu.open ? 0.85 : 0.65,
                  ease: [0.4, 0, 0.2, 1],
                }}
              >
                <motion.span
                  className="mm-light-source"
                  aria-hidden="true"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: menu.open ? 1 : 0 }}
                  transition={{
                    duration: menu.reduced ? 0 : menu.open ? 0.3 : 0.6,
                  }}
                />
                <motion.div
                  className="mm-light-beam"
                  aria-hidden="true"
                  initial={{ opacity: 0, scaleX: 0.82, scaleY: 0.55 }}
                  animate={{
                    opacity: menu.open ? 0.9 : 0,
                    scaleX: menu.open ? 1 : 0.94,
                    scaleY: menu.open ? 1 : 0.92,
                  }}
                  transition={{
                    duration: menu.reduced ? 0 : menu.open ? 1 : 0.7,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                />
                <div className="mm-options">
                  {menuVibes.map((vibe, index) => (
                    <motion.div
                      key={vibe}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: menu.open ? 1 : 0 }}
                      transition={{
                        duration: menu.reduced ? 0 : 0.65,
                        delay:
                          menu.reduced || !menu.open ? 0 : 0.1 + index * 0.11,
                      }}
                    >
                      <MaterialOption menu={menu} index={index} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
      <div className="mm-toolbar" aria-label="Menu material">
        {materials.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={material === value}
            onClick={() => changeMaterial(value)}
          >
            {value[0].toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>
      <span className="mm-caption" aria-live="polite">
        {captions[material]}
      </span>
    </div>
  );
}
export function MenuMaterials({ replayKey }: { replayKey: number }) {
  return <MaterialMenu key={replayKey} />;
}
