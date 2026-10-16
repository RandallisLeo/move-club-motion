'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { CardsDrift, CARDS_DRIFT_PALETTES, type CardsDriftPalette } from '@/components/demos/cards-drift';
import { StudyCodeContact } from '@/components/study-code-contact';
import { experiments } from '@/data/experiments';
import './preview.css';

export function CardsDriftReview() {
  const [replayKey, setReplayKey] = useState(0);
  const [palette, setPalette] = useState<CardsDriftPalette>('dawn');
  const study = experiments.find(item => item.slug === 'cards-drift')!;
  return <article className="cards-drift-review" id="cards-drift">
    <div className="project-meta"><div><span className="project-index">044</span><h3>Cards / Drift</h3></div><button type="button" className="icon-button" aria-label="Replay Cards / Drift" onClick={() => setReplayKey(value => value+1)}><RotateCcw size={16}/></button></div>
    <div className="demo-stage demo-stage-paper"><CardsDrift replayKey={replayKey} palette={palette}/></div>
    <div className="cd-palette-picker" role="group" aria-label="Card color palette">
      {CARDS_DRIFT_PALETTES.map(item => <button key={item.id} type="button" aria-pressed={palette===item.id} aria-label={`Use ${item.name} palette`} onClick={() => setPalette(item.id)}><span className="cd-palette-swatches" aria-hidden="true">{item.colors.map(color => <span key={color} style={{background:color}}/>)}</span><span>{item.name}</span></button>)}
    </div>
    <div className="project-description"><p>{study.description}</p><StudyCodeContact study={study}/></div>
    <div className="project-footer"><span>Motion / React</span><span>{study.tags}</span></div>
  </article>;
}
