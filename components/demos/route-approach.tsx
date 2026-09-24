'use client';

import {
  ArrowUp,
  CarFront,
  CornerUpRight,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useState } from 'react';
import {
  JOURNEY_DURATION_MS,
  TURN_TRANSITION_MS,
  advanceRouteTimeline,
  readRouteTimeline,
} from './route-approach-timeline';
import {
  DotNumber,
  WatchClock,
  WatchShell,
  useWatchTicker,
} from './watch-shared';

export function RouteApproach({ replayKey }: { replayKey: number }) {
  return <RouteSession key={replayKey} />;
}
function RouteSession() {
  const reduced = useReducedMotion();
  const [running, setRunning] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const route = readRouteTimeline(elapsedMs);
  const leg = route.leg;
  const arrived = route.phase === 'arrived';
  const turning = route.phase === 'turning';
  const active = running && (!reduced || turning) && !arrived;
  const root = useWatchTicker(
    () => setElapsedMs((value) => Math.min(JOURNEY_DURATION_MS, value + 100)),
    active,
    100,
  );
  function toggle() {
    if (arrived) {
      setElapsedMs(0);
      setRunning(true);
    } else setRunning((value) => !value);
  }
  function advance() {
    setElapsedMs(advanceRouteTimeline);
  }
  return (
    <WatchShell
      kind="route-approach"
      rootRef={root}
      hint="Simulated navigation"
    >
      <div className="watch-badge">
        <CarFront />
      </div>
      <WatchClock />
      <div className="route-main">
        <div className="route-value">
          <DotNumber
            value={String(route.meters)}
            label={`${route.meters} meters to ${leg.street}`}
          />
          <span>m</span>
        </div>
        <span className="route-street">
          {arrived ? 'You have arrived' : leg.street}
        </span>
      </div>
      <button
        className="route-turn"
        style={{ opacity: reduced ? 1 : route.signalOpacity }}
        onClick={advance}
        aria-label="Advance route by 25 meters"
        disabled={arrived || turning}
      >
        <span
          className={`route-direction is-${route.turn}`}
          style={{ transitionDuration: `${TURN_TRANSITION_MS}ms` }}
        >
          {route.turn === 'straight' ? <ArrowUp /> : <CornerUpRight />}
        </span>
      </button>
      <div className="route-track">
        <span className="route-eta">
          14:12 <span>ETA</span>
        </span>
        <div className="route-track-line" />
        <div
          className="route-track-progress"
          style={{ height: `${route.remaining * 100}%` }}
        />
        <div
          className="route-position"
          style={{ top: `${route.remaining * 100}%` }}
        >
          <svg viewBox="0 0 24 28" aria-hidden="true">
            <path
              d="M9.8 4.8C10.6 2.3 13.4 2.3 14.2 4.8L22.3 22.5C23.3 25 22.1 26.4 19.9 25.3L13.5 22.2Q12 21.5 10.5 22.2L4.1 25.3C1.9 26.4 .7 25 1.7 22.5Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>
      {(!reduced || arrived) && (
        <button
          className="route-play"
          onClick={toggle}
          aria-label={
            arrived
              ? 'Restart route'
              : running
                ? 'Pause navigation'
                : 'Resume navigation'
          }
        >
          {arrived ? <RotateCcw /> : running ? <Pause /> : <Play />}
        </button>
      )}
      <output className="route-instruction">
        {arrived
          ? 'DESTINATION'
          : turning
            ? `TURNING ${route.turn.toUpperCase()}`
            : reduced
              ? 'TAP ARROW TO ADVANCE'
              : `TURN ${route.turn.toUpperCase()}`}
      </output>
    </WatchShell>
  );
}
