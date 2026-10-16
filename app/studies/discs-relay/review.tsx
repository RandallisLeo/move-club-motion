'use client';
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { DiscsRelay } from '@/components/demos/discs-relay';
import { RELAY_DEFAULT_PALETTE, RELAY_PALETTES } from '@/components/demos/discs-relay-palettes';
import { StudyCodeContact } from '@/components/study-code-contact';
import { experiments } from '@/data/experiments';

export function DiscsRelayReview() {
  const [replayKey, setReplayKey] = useState(0);
  const [paletteId, setPaletteId] = useState(RELAY_DEFAULT_PALETTE);
  const study = experiments.find(item => item.slug === 'discs-relay')!;
  return <article className="discs-relay-review" id="discs-relay">
    <div className="project-meta"><div><span className="project-index">{study.index}</span><h3>{study.title}</h3></div><button type="button" className="icon-button" aria-label="Replay Discs / Relay" onClick={() => setReplayKey(value => value + 1)}><RotateCcw size={16}/></button></div>
    <div className="dr-palette-picker" role="group" aria-label="Color references">
      {RELAY_PALETTES.map(item => <button type="button" key={item.id} aria-pressed={paletteId === item.id} onClick={() => setPaletteId(item.id)}>
        <span className="dr-palette-name">{item.name}<span>{item.swatches.length} colors</span></span>
        <span className="dr-palette-swatches" aria-hidden="true">{item.swatches.map(color => <i key={color} style={{ backgroundColor: color }}/>)}</span>
        <span className="dr-palette-note">{item.note}</span>
      </button>)}
    </div>
    <div className="demo-stage demo-stage-paper"><DiscsRelay replayKey={replayKey} paletteId={paletteId}/></div>
    <div className="project-description"><p>{study.description}</p><StudyCodeContact study={study}/></div>
    <div className="project-footer"><span>Motion / React</span><span>{study.tags}</span></div>
  </article>;
}
