'use client';

import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { experiments } from '@/data/experiments';
import { WatchFaces } from './watch-faces';

export function WatchReview() {
  const [replayKey, setReplayKey] = useState(0);
  const study = experiments.find((item) => item.slug === 'watch-faces')!;
  return (
    <article className="project-card" id={study.slug}>
      <div className="project-meta">
        <div>
          <span className="project-index">{study.index}</span>
          <h3>{study.title}</h3>
        </div>
        <button
          className="icon-button"
          aria-label={`Replay ${study.title}`}
          onClick={() => setReplayKey((value) => value + 1)}
        >
          <RotateCcw size={16} />
        </button>
      </div>
      <WatchFaces replayKey={replayKey} expanded />
      <div className="project-description">
        <p>{study.description}</p>
        <a
          className="project-code-button"
          href="https://github.com/RandallisLeo/move-club-motion/blob/main/components/demos/watch-faces.tsx"
          target="_blank"
          rel="noreferrer"
        >
          Code
        </a>
      </div>
      <div className="project-footer">
        <span>Motion / React</span>
        <span>{study.tags}</span>
      </div>
    </article>
  );
}
