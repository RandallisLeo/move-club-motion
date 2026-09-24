'use client';

import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { Layers3, Plus, Scan, X } from 'lucide-react';
import {
  CAKES,
  DEFAULT_CAKE_ELEVATION,
  MAX_CAKE_ELEVATION,
  MIRROR_COUNTS,
  createCakeState,
  dragCakeTurn,
  dragCakeView,
  populateCakes,
  type CakeSceneState,
  type MirrorCount,
} from './cake-reflect-model';
import type { CakeSurfaceAction } from './cake-reflect-engine';
import './cake-reflect.css';

function CakeStudio({ expanded }: { expanded: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<
    typeof import('./cake-reflect-engine').createCakeScene
  > | null>(null);
  const state = useRef(createCakeState());
  const [count, setCount] = useState<MirrorCount>(3);
  const [present, setPresent] = useState<boolean[]>(Array(8).fill(true));
  const [topView, setTopView] = useState(false);
  const [mirrors, setMirrors] = useState(true);
  const [emptyAnchors, setEmptyAnchors] = useState<CakeSurfaceAction[]>([]);
  const [hoveredCake, setHoveredCake] = useState<Omit<CakeSurfaceAction, 'key'> | null>(null);
  const hoverTarget = useRef<typeof hoveredCake>(null);
  const pickFrame = useRef(0);
  const pickVersion = useRef(0);
  const pickInFlight = useRef(false);
  const queuedPick = useRef<{ x: number; y: number; touch: boolean } | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>(
    'loading',
  );
  const drag = useRef<{ x: number; y: number; angle: number; elevation: number; id: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cancelPendingPick = () => {
      cancelAnimationFrame(pickFrame.current);
      pickVersion.current++;
      queuedPick.current = null;
    };
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    state.current.reducedMotion = media.matches;
    const motionChanged = () => {
      state.current.reducedMotion = media.matches;
      scene.current?.invalidate();
    };
    media.addEventListener('change', motionChanged);
    import('./cake-reflect-engine')
      .then(({ createCakeScene }) => {
        if (cancelled || !host.current) return;
        try {
          scene.current = createCakeScene(
            host.current,
            () => state.current,
            () => setStatus('failed'),
            setEmptyAnchors,
          );
          setStatus('ready');
        } catch {
          setStatus('failed');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('failed');
      });
    return () => {
      cancelled = true;
      media.removeEventListener('change', motionChanged);
      scene.current?.dispose();
      scene.current = null;
      cancelPendingPick();
    };
  }, []);

  const update = (patch: Partial<CakeSceneState>) => {
    Object.assign(state.current, patch);
    scene.current?.invalidate();
  };
  const chooseCount = (value: MirrorCount) => {
    clearCakeHover();
    setEmptyAnchors([]);
    populateCakes(state.current, value);
    setCount(value);
    setPresent([...state.current.present]);
    scene.current?.invalidate();
  };
  const toggleCake = (index: number, x?: number, y?: number) => {
    clearCakeHover();
    if (x !== undefined && y !== undefined) {
      const anchor = { index, x, y };
      if (present[index]) {
        setEmptyAnchors((previous) => [
          ...previous.filter((item) => item.index !== index), { ...anchor, key: index },
        ]);
      } else {
        setEmptyAnchors((previous) => previous.filter((item) => item.index !== index));
        hoverTarget.current = { ...anchor };
        setHoveredCake({ ...anchor });
      }
    }
    const next = state.current.present.map((value, slot) =>
      slot === index ? !value : value,
    );
    setPresent(next);
    update({ present: next, inspecting: false });
  };
  const toggleSurfaceCake = (event: MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    toggleCake(Number(button.dataset.cakeIndex), parseFloat(button.style.left), parseFloat(button.style.top));
  };
  const cancelCakePick = () => {
    cancelAnimationFrame(pickFrame.current);
    queuedPick.current = null;
    pickVersion.current++;
  };
  const clearCakeHover = () => {
    cancelCakePick();
    hoverTarget.current = null;
    setHoveredCake(null);
  };
  const pickCake = (clientX: number, clientY: number, touch = false) => {
    queuedPick.current = { x: clientX, y: clientY, touch };
    flushCakePick();
  };
  const flushCakePick = () => {
    if (pickInFlight.current || !queuedPick.current) return;
    cancelAnimationFrame(pickFrame.current);
    pickFrame.current = requestAnimationFrame(async () => {
      const point = queuedPick.current;
      queuedPick.current = null;
      if (!host.current || drag.current || !point) return;
      const version = pickVersion.current;
      const previous = hoverTarget.current;
      pickInFlight.current = true;
      try {
        const result = await scene.current?.pick(point.x, point.y);
        if (version !== pickVersion.current || !host.current || drag.current || queuedPick.current) return;
        if (!point.touch && state.current.hovered !== !!result?.overSubject)
          update({ hovered: !!result?.overSubject });
        const target = result?.cake;
        if (!target || !state.current.present[target.index]) {
          clearCakeHover();
          return;
        }
        if (previous?.index === target.index) return;
        hoverTarget.current = target;
        setHoveredCake(target);
        if (point.touch) update({ inspecting: true });
      } catch {
        if (version === pickVersion.current) {
          clearCakeHover();
          update({ hovered: false });
        }
      } finally {
        pickInFlight.current = false;
        if (host.current && !drag.current) flushCakePick();
      }
    });
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const ended = drag.current;
    if (!ended) return;
    drag.current = null;
    update({
      dragging: false,
      hovered: false,
    });
    if (event.type === 'pointerup' && (event.pointerType !== 'touch' || Math.hypot(event.clientX - ended.x, event.clientY - ended.y) < 5))
      pickCake(event.clientX, event.clientY, event.pointerType === 'touch');
  };

  return (
    <div
      className={`cake-reflect-demo${expanded ? ' cake-reflect-expanded' : ''}`}
      onPointerDownCapture={() => {
        if (state.current.focused) update({ focused: false });
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'touch') update({ hovered: false });
        if (event.pointerType !== 'touch') clearCakeHover();
      }}
      onFocusCapture={(event) => {
        update({ focused: event.target.matches(':focus-visible') });
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          update({ focused: false });
      }}
    >
      <div className="cake-reflect-workspace">
        <div className="cake-reflect-scene-column">
          <div className="cake-reflect-heading">
            <span>DRAG TO EXPLORE</span>
          </div>
          {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- This WebGL turntable implements the slider contract and cannot be a native range input. */}
          <div role="slider"
            className="cake-reflect-canvas"
            ref={host}
            tabIndex={0}
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={18}
            aria-label={`Rotating cake stand with ${count} double-sided mirrors. Hover the stand to pause. Drag left or right to turn, up or down to tilt the view. Arrow keys do the same.`}
            onKeyDown={(event) => {
              if (
                ![
                  'ArrowLeft',
                  'ArrowRight',
                  'ArrowUp',
                  'ArrowDown',
                  'Home',
                  'End',
                ].includes(event.key)
              )
                return;
              event.preventDefault();
              clearCakeHover();
              if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                const elevation = dragCakeView(state.current.elevation, event.key === 'ArrowUp' ? -12 : 12);
                setTopView(elevation === MAX_CAKE_ELEVATION);
                update({ focused: true, elevation });
                return;
              }
              update({
                focused: true,
                angle:
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? Math.PI * 2 - 0.001
                      : dragCakeTurn(state.current.angle, event.key === 'ArrowLeft' ? -9 : 9),
              });
            }}
            onPointerDown={(event) => {
              if (event.button !== 0 || status !== 'ready') return;
              event.preventDefault();
              clearCakeHover();
              drag.current = {
                x: event.clientX,
                y: event.clientY,
                angle: state.current.angle,
                elevation: scene.current?.getElevation() ?? state.current.elevation,
                id: event.pointerId,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
              update({ dragging: true, inspecting: false });
            }}
            onPointerMove={(event) => {
              if (drag.current?.id === event.pointerId) {
                const elevation = dragCakeView(drag.current.elevation, event.clientY - drag.current.y);
                setTopView(elevation === MAX_CAKE_ELEVATION);
                update({
                  angle: dragCakeTurn(
                    drag.current.angle,
                    event.clientX - drag.current.x,
                  ),
                  elevation,
                });
              } else if (event.pointerType !== 'touch') pickCake(event.clientX, event.clientY);
            }}
            onPointerEnter={(event) => {
              if (event.pointerType !== 'touch') pickCake(event.clientX, event.clientY);
            }}
            onPointerLeave={(event) => {
              if (!(event.relatedTarget instanceof Element && event.relatedTarget.closest('.cake-reflect-action'))) {
                clearCakeHover();
                update({ hovered: false });
              }
            }}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={endDrag}
          />
          <div className="cake-reflect-surface-actions"
            onPointerEnter={(event) => {
              if (event.pointerType !== 'touch') {
                cancelCakePick();
                update({ hovered: true });
              }
            }}
            onPointerLeave={(event) => {
              if (event.pointerType !== 'touch') {
                update({ hovered: false });
                pickCake(event.clientX, event.clientY);
              }
            }}>
            {status === 'ready' && [
              ...emptyAnchors.filter((anchor) => !present[anchor.index]),
              ...(hoveredCake && present[hoveredCake.index] ? [hoveredCake] : []),
            ].map((anchor) => (
              <button type="button" key={anchor.index}
                data-cake-index={anchor.index}
                className={`cake-reflect-action ${present[anchor.index] ? 'is-remove' : 'is-restore'}`}
                style={{ left: anchor.x, top: anchor.y }} tabIndex={-1}
                aria-label={`${present[anchor.index] ? 'Remove' : 'Restore'} ${CAKES[anchor.index].name}`}
                onPointerEnter={cancelCakePick}
                onPointerDown={(event) => event.preventDefault()}
                onClick={toggleSurfaceCake}>
                {present[anchor.index] ? <X size={15} strokeWidth={1.5} /> : <Plus size={16} strokeWidth={1.5} />}
              </button>
            ))}
            {CAKES.slice(0, count).map((cake, index) => (
              <button key={cake.name} type="button" className="cake-reflect-keyboard-action"
                onClick={() => toggleCake(index)}>
                {`${present[index] ? 'Remove' : 'Restore'} ${cake.name}`}
              </button>
            ))}
          </div>
          {status !== 'ready' && (
            <output className="cake-reflect-fallback">
              {status === 'failed'
                ? 'WebGL is needed to view this mirror study.'
                : 'Setting the table…'}
            </output>
          )}
          <p className="cake-reflect-hint">Hover to pause · click × to remove</p>
        </div>
        <aside
          className="cake-reflect-controls"
          aria-label="Cake and mirror controls"
        >
          <fieldset className="cake-reflect-mirror-control">
            <legend>Mirrors</legend>
            <div className="cake-reflect-segments">
              {MIRROR_COUNTS.map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={count === value}
                  onClick={() => chooseCount(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="cake-reflect-view-tools" aria-label="Scene view">
            <button
              type="button"
              aria-pressed={topView}
              onClick={() => {
                clearCakeHover();
                setTopView(!topView);
                update({ elevation: !topView ? MAX_CAKE_ELEVATION : DEFAULT_CAKE_ELEVATION });
              }}
            >
              <Scan size={14} strokeWidth={1.5} />
              <span>Top view</span>
            </button>
            <button
              type="button"
              aria-pressed={!mirrors}
              onClick={() => {
                clearCakeHover();
                setMirrors(!mirrors);
                update({ mirrors: !mirrors });
              }}
            >
              <Layers3 size={14} strokeWidth={1.5} />
              <span>Reveal slices</span>
            </button>
          </fieldset>
        </aside>
      </div>
    </div>
  );
}

export function CakeReflect({
  replayKey,
  expanded = false,
}: {
  replayKey: number;
  expanded?: boolean;
}) {
  return <CakeStudio key={replayKey} expanded={expanded} />;
}
