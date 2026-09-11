'use client';

import { useState, type CSSProperties } from 'react';
import { Box, Scan, Sparkles, PanelRight, Layers3 } from 'lucide-react';
import { SpatialScene } from './spatial-scene';
import type { SpatialPose } from './spatial-motion';
import { ORBIT_SHOTS, type OrbitShot } from './orbit-camera';
import './spatial-studies.css';

const cameraPose = (camera: OrbitShot): SpatialPose => ({ progress: 0, rx: 0, ry: 0, rz: 0, scale: 1, camera });

const views: { name: string; note: string; icon: typeof Box; pose: SpatialPose }[] = [
  { name: 'Form', note: 'One continuous loop, seen as a whole.', icon: Box, pose: cameraPose(ORBIT_SHOTS.form) },
  { name: 'Weave', note: 'Look closer at the curves passing over and under.', icon: Scan, pose: cameraPose(ORBIT_SHOTS.weave) },
  { name: 'Surface', note: 'A close study of the finish, light and curvature.', icon: Sparkles, pose: cameraPose(ORBIT_SHOTS.surface) },
  { name: 'Profile', note: 'The silhouette reveals how much depth the loop holds.', icon: PanelRight, pose: cameraPose(ORBIT_SHOTS.profile) },
  { name: 'Structure', note: 'From above, the openings reveal the whole construction.', icon: Layers3, pose: cameraPose(ORBIT_SHOTS.structure) },
];

function OrbitStudy() {
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const preview = hovered ?? focused ?? selected;
  return (
    <div className="object-orbit-demo">
      <div className="spatial-study-heading"><span>FROM FORM TO DETAIL.</span><span>02 / ORBIT</span></div>
      <div className="object-orbit-layout">
        <div
          className="object-orbit-views"
          role="group"
          aria-label="Sculpture features"
          onPointerLeave={() => setHovered(null)}
          onPointerCancel={() => setHovered(null)}
          style={{
            '--orbit-selected-index': selected,
            '--orbit-preview-index': preview,
            '--orbit-preview-opacity': preview === selected ? 0 : 1,
          } as CSSProperties}
        >
          <span className="object-orbit-highlight object-orbit-highlight-hover" aria-hidden="true" />
          <span className="object-orbit-highlight object-orbit-highlight-selected" aria-hidden="true" />
          {views.map((view, index) => (
            <button
              key={view.name}
              type="button"
              aria-pressed={selected === index}
              onPointerEnter={(event) => {
                if (event.pointerType !== 'touch') { setHovered(index); setFocused(null); }
              }}
              onFocus={(event) => {
                if (event.currentTarget.matches(':focus-visible')) { setFocused(index); setHovered(null); }
              }}
              onBlur={() => setFocused(null)}
              onClick={() => setSelected(index)}
            >
              <view.icon size={14} strokeWidth={1.5} /><span>{view.name}</span>
            </button>
          ))}
        </div>
        <SpatialScene kind="object" pose={views[selected].pose} label={`Continuous loop sculpture, ${views[selected].name.toLowerCase()} camera view`} />
      </div>
      <div className="object-orbit-note" aria-live="polite"><span>{String(selected + 1).padStart(2, '0')}</span><p>{views[selected].note}</p></div>
    </div>
  );
}

export function ObjectOrbit({ replayKey }: { replayKey: number }) {
  return <OrbitStudy key={replayKey} />;
}
