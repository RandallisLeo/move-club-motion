'use client';

import { FileText, Folder, Image, CalendarDays, MessagesSquare, GitBranch, PenTool, type LucideIcon } from 'lucide-react';
import { useInView } from 'motion/react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import './agent-studies.css';

export const studyTools: { name: string; detail: string; Icon: LucideIcon }[] = [
  { name: 'Figma', detail: 'A place for the first sketch', Icon: PenTool },
  { name: 'GitHub', detail: 'Small ideas, open source', Icon: GitBranch },
  { name: 'Notes', detail: 'Thoughts worth keeping', Icon: FileText },
  { name: 'Photos', detail: 'Something caught my eye', Icon: Image },
  { name: 'Calendar', detail: 'Make a little time', Icon: CalendarDays },
  { name: 'Messages', detail: 'Keep the conversation going', Icon: MessagesSquare },
];

function subscribeToReducedMotion(onChange: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
function reducedMotionSnapshot() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
// Match the server snapshot during hydration before reading the device preference.
export function useStudyReducedMotion() {
  return useSyncExternalStore(subscribeToReducedMotion, reducedMotionSnapshot, () => false);
}

export function useStudyViewport() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { amount: 0.2 });
  const reduced = useStudyReducedMotion();
  const [size, setSize] = useState({ width: 600, height: 360 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, visible, reduced, ...size };
}

export function ToolGlyph({ index, size = 18 }: { index: number; size?: number }) {
  const Icon = studyTools[index]?.Icon ?? Folder;
  return <Icon size={size} strokeWidth={1.5} aria-hidden="true" />;
}
