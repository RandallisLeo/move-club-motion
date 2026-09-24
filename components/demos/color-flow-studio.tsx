'use client';
import { useId, useState, type CSSProperties } from 'react';
import { ColorFlow } from './color-flow';
import { sandStudy } from './sand-flow-engine';
import { marbleStudy } from './marble-fold';
import { metalStudy } from './metal-melt';
import { printStudy } from './print-drift';
import { prismStudy } from './prism-stream';

const studies = [sandStudy, marbleStudy, metalStudy, printStudy, prismStudy];
export function ColorFlowStudio({ initial = 'sand-flow', replayKey, expanded = false }: {
  initial?: string; replayKey: number; expanded?: boolean;
}) {
  const railId = useId();
  const [selected, setSelected] = useState(initial);
  const study = studies.find((item) => item.slug === selected) ?? sandStudy;
  return (
    <div className={`color-flow-studio${expanded ? ' color-flow-studio--standalone' : ''}`}>
      <ColorFlow key={`${study.slug}-${replayKey}`} study={study} expanded styleSelector={
        <fieldset className="color-flow-style-rail" aria-label="Base material">
          {studies.map((item, index) => (
            <button key={item.slug} type="button" className={`color-flow-style-tile color-flow-style-tile--${item.slug}`}
              style={{ '--sample-ink': item.palettes[0].ink, '--sample-paper': item.palettes[0].paper, '--sample-accent': item.palettes[0].accent } as CSSProperties}
              aria-label={item.label} title={item.label} aria-pressed={selected === item.slug}
              onClick={() => {
                setSelected(item.slug);
                requestAnimationFrame(() => document.getElementById(`${railId}-${index}`)?.focus({ preventScroll: true }));
              }}
              onKeyDown={(event) => {
                if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? studies.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : studies.length - 1)) % studies.length;
                setSelected(studies[next].slug);
                // The selected renderer remounts; focus is restored on the new rail.
                requestAnimationFrame(() => document.getElementById(`${railId}-${next}`)?.focus({ preventScroll: true }));
              }} id={`${railId}-${index}`}>
              <span aria-hidden="true" />
            </button>
          ))}
        </fieldset>
      } />
    </div>
  );
}
