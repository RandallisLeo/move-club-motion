'use client';
import { ColorFlowStudio } from './color-flow-studio';
export function SandFlow({ replayKey, expanded = false }: { replayKey: number; expanded?: boolean }) {
  return <ColorFlowStudio replayKey={replayKey} expanded={expanded} />;
}
