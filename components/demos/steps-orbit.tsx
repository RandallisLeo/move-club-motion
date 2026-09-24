'use client';

import { Flame, Footprints, Pause, Play, Route, RotateCcw } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useId, useState } from 'react';
import {
  DotNumber,
  WatchClock,
  WatchShell,
  useWatchTicker,
} from './watch-shared';

const START = 5632;
const GOAL = 13000;
// Clockwise from twelve o'clock, with a small break around the fixed start marker.
const RING_PATH =
  'M136 9H186A65 65 0 0 1 251 74V236A65 65 0 0 1 186 301H74A65 65 0 0 1 9 236V74A65 65 0 0 1 74 9H124';
export function StepsOrbit({ replayKey }: { replayKey: number }) {
  return <StepsSession key={replayKey} />;
}
function StepsSession() {
  const ringId = useId();
  const [steps, setSteps] = useState(START);
  const [running, setRunning] = useState(true);
  const reduced = useReducedMotion();
  const complete = steps >= GOAL;
  const active = running && !reduced && !complete;
  const root = useWatchTicker(
    () => setSteps((value) => Math.min(GOAL, value + 32)),
    active,
    800,
  );
  return (
    <WatchShell
      kind="steps-orbit"
      rootRef={root}
      hint="Simulated step tracking"
    >
      <svg
        className="steps-ring"
        viewBox="0 0 260 310"
        // SVG is the actual image; replacing it with an img would lose its live progress.
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="img"
        aria-label={`${Math.round((steps / GOAL) * 100)} percent of step goal`}
      >
        <defs>
          <mask id={ringId}>
            <path
              className="steps-ring-dashes"
              d={RING_PATH}
              pathLength="100"
              fill="none"
              stroke="white"
            />
          </mask>
        </defs>
        <path
          className="steps-ring-track steps-ring-dashes"
          d={RING_PATH}
          pathLength="100"
        />
        <path
          mask={`url(#${ringId})`}
          className="steps-ring-fill"
          d={RING_PATH}
          pathLength="100"
          strokeDasharray={`${(steps / GOAL) * 100} 100`}
        />
        <path className="steps-ring-start" d="M130 6V12" />
      </svg>
      <button
        className="watch-badge steps-feet"
        aria-label="Add 100 steps"
        onClick={() => setSteps((value) => Math.min(GOAL, value + 100))}
      >
        <Footprints fill="currentColor" />
      </button>
      <WatchClock seconds={Math.floor((steps - START) / 32) * 20} />
      <div className="steps-main">
        <span className="watch-label">Steps</span>
        <DotNumber
          value={steps.toLocaleString('en-US')}
          label={`${steps} steps`}
        />
        <span className="steps-goal">
          <DotNumber value="13,000" label="Goal 13000 steps" />
        </span>
      </div>
      <div className="steps-stats">
        <span>
          <span className="steps-stat-icon" aria-hidden="true">
            <Route />
          </span>
          <DotNumber value={(steps * 0.00076).toFixed(2)} />
          <small>KM</small>
        </span>
        <span>
          <span className="steps-stat-icon" aria-hidden="true">
            <Flame fill="currentColor" />
          </span>
          <DotNumber value={String(Math.round(steps * 0.045))} />
          <small>Kcal</small>
        </span>
      </div>
      {(!reduced || complete) && (
        <button
          className="steps-play"
          aria-label={
            complete
              ? 'Restart walking'
              : running
                ? 'Pause walking'
                : 'Start walking'
          }
          onClick={() => {
            if (complete) {
              setSteps(START);
              setRunning(true);
            } else setRunning((value) => !value);
          }}
        >
          {complete ? <RotateCcw /> : running ? <Pause /> : <Play />}
        </button>
      )}
      <output className="steps-status">
        {complete
          ? 'GOAL COMPLETE'
          : reduced
            ? 'TAP FEET TO ADD STEPS'
            : running
              ? 'ON THE MOVE'
              : 'TAKE A BREATHER'}
      </output>
    </WatchShell>
  );
}
