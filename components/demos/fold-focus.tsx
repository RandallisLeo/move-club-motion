'use client';

import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { SpatialScene } from './spatial-scene';
import { foldPose } from './spatial-motion';
import { FOLD_WALLPAPERS } from './fold-wallpapers';
import './spatial-studies.css';

function FoldStudy() {
  const [open, setOpen] = useState(100);
  const [wallpaper, setWallpaper] = useState(0);
  const fold = 1 - open / 100;

  return (
    <div className="fold-focus-demo">
      <div className="fold-focus-layout">
        <div className="fold-focus-viewport">
          <SpatialScene kind="fold" pose={{ ...foldPose(fold), wallpaper }}
            label={`Three-surface photo model, ${open}% open. ${FOLD_WALLPAPERS[wallpaper].description} stays on one plane behind the folding windows, which gradually unfold to meet it.`} />
          <div className="fold-focus-wallpapers" role="group" aria-label="Wallpaper">
            {FOLD_WALLPAPERS.map((image, index) => (
              <button key={image.src} type="button" aria-label={`Use ${image.name} wallpaper`} aria-pressed={wallpaper === index} title={image.name} onClick={() => setWallpaper(index)}>
                <img src={image.src} alt="" decoding="async" />
              </button>
            ))}
          </div>
        </div>
        <div className="fold-focus-controls">
          <Slider className="fold-focus-slider" thumbProps={{ 'aria-label': 'Fold angle', 'aria-valuetext': `${Math.round(open * 1.8)} degrees, ${open}% open` }} value={[open]} min={0} max={100} step={1}
            onValueChange={(value) => setOpen(Array.isArray(value) ? value[0] : value)} />
          <span className="fold-focus-hint">Drag to fold</span>
        </div>
      </div>
    </div>
  );
}

export function FoldFocus({ replayKey }: { replayKey: number }) {
  return <FoldStudy key={replayKey} />;
}
