'use client';

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Custom animated listbox requires styled option buttons; native select cannot render these materials. */

import { Check, ChevronDown } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type RefCallback,
  type FocusEvent,
} from 'react';
import './menu-materials.css';

export const menuVibes = [
  'Aurora Veil',
  'Ember Rite',
  'Obsidian Omen',
  'Tidecaller',
  'Verdant Sigil',
];

export function useMaterialMenu() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(3);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const reduced = useReducedMotion();
  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(true), 550);
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', outside);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerdown', outside);
    };
  }, []);
  function focusOption(index: number) {
    panel.current
      ?.querySelectorAll<HTMLButtonElement>('[role="option"]')
      [index]?.focus();
  }
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  function choose(index: number) {
    setSelected(index);
    close();
  }
  function onTriggerKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      requestAnimationFrame(() =>
        focusOption(event.key === 'ArrowUp' ? menuVibes.length - 1 : selected),
      );
    } else if (event.key === 'Escape') close();
  }
  function onPanelKey(event: KeyboardEvent<HTMLDivElement>) {
    const options = Array.from(
      panel.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ??
        [],
    );
    const index = options.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      focusOption(
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? options.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) %
              options.length,
      );
    }
  }
  function onRootBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null))
      setOpen(false);
  }
  const rootRef = useCallback((node: HTMLDivElement | null) => {
    root.current = node;
  }, []);
  const triggerRef = useCallback((node: HTMLButtonElement | null) => {
    trigger.current = node;
  }, []);
  const panelRef = useCallback((node: HTMLDivElement | null) => {
    panel.current = node;
  }, []);
  return {
    state: {
      open,
      selected,
      setOpen,
      id,
      reduced,
      choose,
      onTriggerKey,
      onPanelKey,
      onRootBlur,
    },
    refs: { rootRef, triggerRef, panelRef },
  };
}
export type MaterialMenu = ReturnType<typeof useMaterialMenu>['state'];

export function MaterialTrigger({
  menu,
  triggerRef,
}: {
  menu: MaterialMenu;
  triggerRef: RefCallback<HTMLButtonElement>;
}) {
  return (
    <button
      className="mm-trigger"
      ref={triggerRef}
      id={`${menu.id}-trigger`}
      type="button"
      aria-haspopup="listbox"
      aria-expanded={menu.open}
      aria-controls={`${menu.id}-list`}
      onClick={() => menu.setOpen(!menu.open)}
      onKeyDown={menu.onTriggerKey}
    >
      <span className="mm-label">Vibe</span>
      <span className="mm-value">{menuVibes[menu.selected]}</span>
      <motion.span
        className="mm-chevron"
        animate={{ rotate: menu.open ? 180 : 0 }}
        transition={{ duration: menu.reduced ? 0 : 0.24 }}
      >
        <ChevronDown size={14} strokeWidth={1.6} />
      </motion.span>
    </button>
  );
}

export function MaterialOption({
  menu,
  index,
}: {
  menu: MaterialMenu;
  index: number;
}) {
  return (
    <button
      type="button"
      className="mm-option"
      role="option"
      aria-selected={menu.selected === index}
      tabIndex={menu.open ? 0 : -1}
      onClick={() => menu.choose(index)}
    >
      <span>{menuVibes[index]}</span>
      <Check
        size={14}
        strokeWidth={1.6}
        aria-hidden="true"
        style={{ opacity: menu.selected === index ? 1 : 0 }}
      />
    </button>
  );
}
