'use client';
import { ColorFlow } from './color-flow';
import { createMarbleWarp } from './marble-warp-engine';
import type { FlowStudy } from './color-flow-engine';

export const marbleStudy: FlowStudy = {
  slug: 'marble-fold',
  index: '022',
  title: 'Ink / Fold',
  label: 'Marbled ink',
  heading: 'Pigment curls\ninto a little vortex.',
  description: 'Flowing ink with adjustable swirl, speed, and color.',
  note: 'Drag to tilt · adjust Swirl to change the folds',
  parameter: 'Swirl',
  defaultDetail: 0.8,
  defaultSpeed: 1,
  palettes: [
    { label: 'Mint', ink: '#29899d', paper: '#d6f5e9', accent: '#75c8c7' },
    { label: 'Periwinkle', ink: '#727bc2', paper: '#e6edff', accent: '#a3bcec' },
    { label: 'Coral', ink: '#d6536b', paper: '#ffe5b3', accent: '#ff8d82' },
    { label: 'Peach', ink: '#da7d58', paper: '#fff0c7', accent: '#ffb48b' },
  ],
  mount: createMarbleWarp,
  sourceCredit: {
    label: 'Paper · Warp',
    url: 'https://shaders.paper.design/warp',
  },
};
export function MarbleFold({
  replayKey,
  expanded = false,
}: {
  replayKey: number;
  expanded?: boolean;
}) {
  return <ColorFlow key={replayKey} study={marbleStudy} expanded={expanded} />;
}
