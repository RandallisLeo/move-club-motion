import { createSandDithering } from './sand-dithering-engine';
import type { FlowStudy } from './color-flow-engine';

// Original ticket material: Paper Dithering, warp shape, random 0.5px grain.
export const sandStudy: FlowStudy = {
  slug: 'sand-flow',
  index: '021',
  title: 'Sand / Flow',
  label: 'Tidal sand',
  heading: 'A tide comes in.\nThe sand gives way.',
  description: 'Animated sand patterns with adjustable scale, speed, and color.',
  note: 'Drag to tilt · press for feedback',
  parameter: 'Flow scale',
  defaultDetail: 0.5,
  defaultSpeed: 1,
  granular: true,
  palettes: [
    { label: 'Apricot', ink: '#f68b5c', paper: '#fff2af', accent: '#ffc471' },
    { label: 'Petal', ink: '#ef7192', paper: '#fff2c8', accent: '#ffa3ae' },
    { label: 'Lagoon', ink: '#2499aa', paper: '#dff6de', accent: '#78cdd0' },
    { label: 'Iris', ink: '#858bd0', paper: '#eef0ff', accent: '#b8c8ed' },
  ],
  mount: createSandDithering,
};
