'use client';

import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { MenuMaterials } from '@/components/demos/menu-materials';
import { StudyCodeContact } from '@/components/study-code-contact';
import { experiments } from '@/data/experiments';

const study = experiments.find((item) => item.slug === 'menu-materials')!;
export function MenuMaterialReview() {
  const [replayKey, setReplayKey] = useState(0);
  return (
    <div className="mm-review-layout">
      <div className="mm-review-copy">
        <span>043 / ONE MENU, THREE MATERIALS</span>
        <h1>Menu / Material</h1>
        <p>
          A dropdown kept me watching. I wanted to feel what happens when it has
          weight: silk catches at the end of its fall, a row of hinges releases,
          or a beam of light finds its way down.
        </p>
        <p>
          Switch the material below the menu, then open it, choose a vibe, and
          try the next one.
        </p>
        <div className="mm-review-references">
          <span>Motion references</span>
          <a
            href="https://tympanus.net/Tutorials/3DClothSlideshow/"
            target="_blank"
            rel="noreferrer"
          >
            Codrops / Cloth
          </a>
          <a
            href="https://hello-mat.com/design-engineering/split-flap-display"
            target="_blank"
            rel="noreferrer"
          >
            Mathieu Jouhet / Split flap
          </a>
          <a
            href="https://www.solari.it/en/products-type/eng-display-a-palette/"
            target="_blank"
            rel="noreferrer"
          >
            Solari / Hinged displays
          </a>
        </div>
      </div>
      <article className="mm-review-card" id="menu-materials">
        <div className="mm-review-meta">
          <span>043</span>
          <h2>{study.title}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={() => setReplayKey((value) => value + 1)}
            aria-label="Replay Menu / Material"
          >
            <RotateCcw size={16} />
          </button>
        </div>
        <div className="demo-stage demo-stage-paper">
          <MenuMaterials replayKey={replayKey} />
        </div>
        <div className="mm-review-card-footer">
          <span>Silk · Flap · Light</span>
          <StudyCodeContact study={study} />
        </div>
      </article>
    </div>
  );
}
