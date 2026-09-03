export type Experiment = {
  slug: string;
  index: string;
  title: string;
  category: 'Select' | 'Reveal' | 'Count' | 'Hover' | 'Transfer' | 'Depth' | 'Layout';
  tags: string;
  description: string;
  tone: 'dark' | 'blue' | 'paper';
};

export const experiments: Experiment[] = [
  {
    slug: 'photo-selection',
    index: '001',
    title: 'Photo / Select',
    category: 'Select',
    tags: 'Tap · Spring · State',
    description: 'A tactile selected state built from scale, opacity and a spring-loaded checkmark.',
    tone: 'paper',
  },
  {
    slug: 'action-reveal',
    index: '002',
    title: 'Actions / Reveal',
    category: 'Reveal',
    tags: 'Entrance · Stagger · Dock',
    description: 'A compact action dock that enters only when the selected state creates a reason for it.',
    tone: 'blue',
  },
  {
    slug: 'rolling-counter',
    index: '003',
    title: 'Count / Reel',
    category: 'Count',
    tags: 'Mask · Number · Feedback',
    description: 'A rolling counter where each digit travels through a clipped vertical reel.',
    tone: 'dark',
  },
  {
    slug: 'fluid-folder-hover',
    index: '004',
    title: 'Folder / Hover',
    category: 'Hover',
    tags: 'Pointer · Shared element · Spring',
    description: 'One fluid highlight follows the pointer and reshapes itself around each folder name.',
    tone: 'paper',
  },
  {
    slug: 'card-flight',
    index: '005',
    title: 'Cards / Transfer',
    category: 'Transfer',
    tags: 'Path · Stagger · Choreography',
    description: 'Selected cards peel away in sequence while the destination folder opens to receive them.',
    tone: 'blue',
  },
  {
    slug: 'folder-preview',
    index: '006',
    title: 'Folder / Depth',
    category: 'Depth',
    tags: 'Glass · Stack · Composition',
    description: 'Translucent folder fronts reveal a stable, individual composition for every collection.',
    tone: 'dark',
  },
  {
    slug: 'spring-reflow',
    index: '007',
    title: 'Grid / Reflow',
    category: 'Layout',
    tags: 'FLIP · Spring · Overshoot',
    description: 'Removing a tile lets the grid close the gap with a restrained same-row rebound.',
    tone: 'paper',
  },
];
