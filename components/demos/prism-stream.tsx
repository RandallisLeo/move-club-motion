'use client';
import { ColorFlow } from './color-flow';
import type { FlowStudy } from './color-flow-engine';
import { createPrismStream } from './prism-stream-engine';

export const prismStudy: FlowStudy = {
  slug: 'prism-stream',
  index: '05',
  title: 'Prism / Stream',
  label: 'Prism stream',
  heading: 'A reflection\nfinds a new path.',
  description: 'Colored light moves along frosted fibers.',
  note: 'Adjust Band width to change the light coverage',
  parameter: 'Band width',
  speedLabel: 'Light pace',
  defaultDetail: 0.63,
  defaultSpeed: 1,
  palettes: [
    { label: 'Aurora', ink: '#22bce9', paper: '#f7fbff', accent: '#ffb94e' },
    { label: 'Opal', ink: '#648cff', paper: '#faf6ff', accent: '#ef8cce' },
    { label: 'Ember', ink: '#ff794a', paper: '#fff5dd', accent: '#30d8cf' },
    { label: 'Silver', ink: '#83b7d6', paper: '#ffffff', accent: '#f0b647' },
  ],
  mount: async (surface) => createPrismStream(surface),
};

export function PrismStream({ replayKey, expanded = false }: { replayKey: number; expanded?: boolean }) {
  return <ColorFlow key={replayKey} study={prismStudy} expanded={expanded} />;
}
