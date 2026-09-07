'use client';

import { Armchair, ArrowLeftRight, Bookmark, Compass, Heart, Monitor, Mountain, MoveDiagonal2, RotateCcw, Search, Smartphone, Tablet } from 'lucide-react';
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import Image from 'next/image';
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Slider } from '@/components/ui/slider';
import { fitFeedViewport, layoutFeedColumns, planFeedColumns } from './feed-adapt-layout';
import './feed-adapt.css';

type Size = { width: number; height: number };
type Mode = 'Mobile' | 'Tablet' | 'Desktop';
type Section = 'Explore' | 'Spaces' | 'Outside' | 'Saved';
type ResizeAxis = 'width' | 'height' | 'both';

const INITIAL_SIZE = { width: 390, height: 780 };
const LIMITS = { width: [320, 1600], height: [480, 1080] } as const;
const PRESETS = [
  { name: 'Mobile', width: 390, height: 780, icon: Smartphone },
  { name: 'Tablet', width: 768, height: 900, icon: Tablet },
  { name: 'Desktop', width: 1440, height: 900, icon: Monitor },
] as const;
const NAV = [
  { name: 'Explore', icon: Compass },
  { name: 'Spaces', icon: Armchair },
  { name: 'Outside', icon: Mountain },
  { name: 'Saved', icon: Bookmark },
] as const;

// Project-owned, fixed images: changing viewport size never fetches a new crop.
const POSTS = [
  { id: 'weekend', image: 'weekend', title: 'Take the long way home', author: 'Alex Chen', category: 'Outside', ratio: 0.76, color: '#d3d6bb', alt: 'An open road winding between red sandstone mountains' },
  { id: 'curves', image: 'curves', title: 'A different kind of perspective', author: 'Noa Studio', category: 'Spaces', ratio: 1.05, color: '#ddd7cd', alt: 'Sculptural white architectural curves' },
  { id: 'workspace', image: 'workspace', title: 'Somewhere to make things', author: 'Jamie Lee', category: 'Spaces', ratio: 0.84, color: '#c4cec7', alt: 'Light-filled office corridor with black-framed glass walls' },
  { id: 'lake', image: 'lake', title: 'A morning worth waking up for', author: 'Oliver Park', category: 'Outside', ratio: 0.72, color: '#a5bfc3', alt: 'Mountains reflected in a still alpine lake' },
  { id: 'objects', image: 'objects', title: 'Everyday, but a little better', author: 'Mia Wilson', category: 'Spaces', ratio: 1.1, color: '#c9bda6', alt: 'A simple black wall lamp against a muted green wall' },
  { id: 'lines', image: 'lines', title: 'Following the light', author: 'Noa Studio', category: 'Spaces', ratio: 0.78, color: '#d4d7dc', alt: 'Modern building seen from below with geometric lines' },
  { id: 'desk', image: 'desk', title: 'Room for a new idea', author: 'Alex Chen', category: 'Spaces', ratio: 1.14, color: '#c7bdad', alt: 'Minimal desktop arrangement and creative tools' },
  { id: 'art', image: 'art', title: 'Color outside the lines', author: 'Isabel R.', category: 'Spaces', ratio: 0.82, color: '#d6c2a5', alt: 'Flowing abstract forms in vivid violet and magenta' },
  { id: 'open', image: 'open', title: 'Let a little outside in', author: 'Jamie Lee', category: 'Spaces', ratio: 0.9, color: '#c6ccc4', alt: 'Open meeting room with a long table and large windows' },
  { id: 'painting', image: 'painting', title: 'Collected, never planned', author: 'Mia Wilson', category: 'Spaces', ratio: 0.74, color: '#c6b0c6', alt: 'Colorful painting with textured abstract marks' },
  { id: 'escape', image: 'weekend', title: 'No plans for the afternoon', author: 'Oliver Park', category: 'Outside', ratio: 1.14, color: '#d3d6bb', alt: 'A quiet highway through a rugged red-rock landscape' },
  { id: 'still', image: 'lake', title: 'Stay here a little longer', author: 'Isabel R.', category: 'Outside', ratio: 0.88, color: '#a5bfc3', alt: 'Quiet lake and mountains in the distance' },
];

function clamp(value: number, axis: 'width' | 'height') {
  return Math.round(Math.min(LIMITS[axis][1], Math.max(LIMITS[axis][0], value)));
}

function getLayout(width: number) {
  const mode: Mode = width < 640 ? 'Mobile' : width < 1024 ? 'Tablet' : 'Desktop';
  return {
    mode,
    columns: width < 640 ? 2 : width < 900 ? 3 : width < 1200 ? 4 : width < 1480 ? 5 : 6,
    inset: mode === 'Desktop' ? 220 : mode === 'Tablet' ? 26 : 16,
    right: mode === 'Mobile' ? 16 : 26,
    gap: mode === 'Mobile' ? 12 : 18,
    top: mode === 'Mobile' ? 169 : mode === 'Tablet' ? 184 : 158,
  };
}

function DimensionControl({ axis, value, onChange }: { axis: 'width' | 'height'; value: number; onChange: (value: number) => void }) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  const editing = useRef(false);
  useEffect(() => { if (!editing.current) setDraft(String(value)); }, [value]);
  const commit = () => {
    editing.current = false;
    const next = draft.trim() === '' || !Number.isFinite(Number(draft)) ? value : clamp(Number(draft), axis);
    setDraft(String(next));
    onChange(next);
  };
  return (
    <div className="fa-dimension">
      <div className="fa-control-label">
        <label id={`${id}-label`} htmlFor={id}>{axis === 'width' ? 'Width' : 'Height'}</label>
        <div className="fa-number-field">
          <input id={id} type="number" inputMode="numeric" min={LIMITS[axis][0]} max={LIMITS[axis][1]} value={draft}
            onFocus={() => { editing.current = true; }} onChange={(event) => setDraft(event.target.value)} onBlur={commit}
            onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
          <span>px</span>
        </div>
      </div>
      <Slider className="fa-slider" aria-labelledby={`${id}-label`} value={[value]} min={LIMITS[axis][0]} max={LIMITS[axis][1]} step={1}
        onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)} />
      <div className="fa-range-labels"><span>{LIMITS[axis][0]}</span><span>{LIMITS[axis][1]}</span></div>
    </div>
  );
}

export function FeedAdapt({ replayKey }: { replayKey: number }) {
  // A keyed session resets dimensions, filters, saved posts, and scroll together.
  return <FeedAdaptSession key={replayKey} />;
}

function FeedAdaptSession() {
  const [size, setSize] = useState<Size>(INITIAL_SIZE);
  const sizeRef = useRef(size);
  const [canvas, setCanvas] = useState({ width: 850, height: 460 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const [section, setSection] = useState<Section>('Explore');
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState<string[]>(['curves', 'lake']);
  const [resizeAxis, setResizeAxis] = useState<ResizeAxis | null>(null);
  const dragging = resizeAxis !== null;
  const [settledSize, setSettledSize] = useState(size);
  const pendingFrame = useRef<number | null>(null);
  const pendingSize = useRef(size);
  const drag = useRef<{ axis: ResizeAxis; x: number; y: number; size: Size; scale: number; pointer: number; element: HTMLButtonElement } | null>(null);
  const reduced = useReducedMotion();
  const layout = getLayout(size.width);
  const { mode, columns, inset, right, gap, top } = layout;
  const isMobile = mode === 'Mobile';
  const isDesktop = mode === 'Desktop';
  const { scale } = fitFeedViewport(size, canvas);
  const transition = useMemo(() => reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: dragging ? 650 : 280, damping: dragging ? 50 : 34, mass: 0.8 }, [reduced, dragging]);
  const screenWidth = useMotionValue(size.width);
  const screenHeight = useMotionValue(size.height);
  const screenGeometry = useTransform(() => fitFeedViewport({ width: screenWidth.get(), height: screenHeight.get() }, canvas));
  const fittedWidth = useTransform(screenGeometry, (geometry) => geometry.width);
  const fittedHeight = useTransform(screenGeometry, (geometry) => geometry.height);
  const fittedScale = useTransform(screenGeometry, (geometry) => geometry.scale);

  // Animate logical dimensions only. Interpolating their scale separately makes
  // width × scale swell between presets and drift outside the centered wrapper.
  useLayoutEffect(() => {
    if (reduced) {
      screenWidth.jump(size.width);
      screenHeight.jump(size.height);
      return;
    }
    const widthAnimation = animate(screenWidth, size.width, transition);
    const heightAnimation = animate(screenHeight, size.height, transition);
    return () => { widthAnimation.stop(); heightAnimation.stop(); };
  }, [size.width, size.height, reduced, transition, screenWidth, screenHeight]);

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setCanvas({ width: node.clientWidth, height: node.clientHeight }));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => setSettledSize(size), 400);
    return () => clearTimeout(timer);
  }, [size]);
  useEffect(() => () => { if (pendingFrame.current !== null) cancelAnimationFrame(pendingFrame.current); }, []);

  const updateSize = (next: Size) => {
    const bounded = { width: clamp(next.width, 'width'), height: clamp(next.height, 'height') };
    sizeRef.current = bounded;
    setSize(bounded);
  };
  const queueSize = (next: Size) => {
    pendingSize.current = next;
    if (pendingFrame.current !== null) return;
    pendingFrame.current = requestAnimationFrame(() => {
      pendingFrame.current = null;
      updateSize(pendingSize.current);
    });
  };
  const flushResize = () => {
    if (pendingFrame.current !== null) {
      cancelAnimationFrame(pendingFrame.current);
      pendingFrame.current = null;
      updateSize(pendingSize.current);
    }
  };
  const startResize = (event: PointerEvent<HTMLButtonElement>, axis: ResizeAxis) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { axis, x: event.clientX, y: event.clientY, size: sizeRef.current, scale, pointer: event.pointerId, element: event.currentTarget };
    setResizeAxis(axis);
  };
  const moveResize = (event: PointerEvent<HTMLButtonElement>) => {
    const start = drag.current;
    if (!start || start.pointer !== event.pointerId) return;
    // Centered on both axes: the right and bottom edges travel half the size change.
    queueSize({
      width: start.axis === 'height' ? start.size.width : start.size.width + (event.clientX - start.x) * 2 / start.scale,
      height: start.axis === 'width' ? start.size.height : start.size.height + (event.clientY - start.y) * 2 / start.scale,
    });
  };
  const stopResize = () => {
    flushResize();
    const start = drag.current;
    drag.current = null;
    setResizeAxis(null);
    if (start?.element.hasPointerCapture(start.pointer)) start.element.releasePointerCapture(start.pointer);
  };
  const resizeKey = (event: KeyboardEvent<HTMLButtonElement>, axis: ResizeAxis) => {
    const step = event.shiftKey ? 40 : 10;
    const next = { ...sizeRef.current };
    if (axis !== 'height' && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) next.width += event.key === 'ArrowRight' ? step : -step;
    else if (axis !== 'width' && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) next.height += event.key === 'ArrowDown' ? step : -step;
    else return;
    event.preventDefault();
    updateSize(next);
  };


  const posts = useMemo(() => POSTS.filter((post) =>
    (section === 'Explore' || (section === 'Saved' ? saved.includes(post.id) : post.category === section)) &&
    `${post.title} ${post.author} ${post.category}`.toLowerCase().includes(query.toLowerCase())
  ), [section, saved, query]);
  const cardWidth = (size.width - inset - right - gap * (columns - 1)) / columns;
  const cropOffset = isMobile ? 0 : mode === 'Tablet' ? 0.13 : 0.27;
  const columnAssignments = useMemo(
    () => planFeedColumns(posts, columns, cropOffset, gap),
    [posts, columns, cropOffset, gap],
  );
  const masonry = layoutFeedColumns(posts, columnAssignments, columns, cardWidth, cropOffset, gap);
  const arranged = posts.map((post, index) => ({ post, ...masonry.positions[index] }));
  const navBox = isMobile
    ? { x: 0, y: size.height - 67, width: size.width, height: 67 }
    : isDesktop
      ? { x: 14, y: 100, width: 176, height: 238 }
      : { x: 188, y: 10, width: size.width - 208, height: 52 };
  const selectSection = (next: Section) => {
    setSection(next);
    if (feedRef.current) feedRef.current.scrollTop = 0;
  };
  const reset = () => { updateSize(INITIAL_SIZE); setSection('Explore'); setQuery(''); setSaved(['curves', 'lake']); if (feedRef.current) feedRef.current.scrollTop = 0; };

  return (
    <div className="feed-adapt-demo" data-mode={mode.toLowerCase()} data-resizing={dragging} data-resize-axis={resizeAxis}>
      <div className="fa-workbench">
        <div className="fa-canvas" ref={canvasRef}>
          <div className="fa-canvas-meta"><span>CANVAS / {mode.toUpperCase()}</span><span className="fa-canvas-dimensions">{size.width}<span>×</span>{size.height}<span>px</span></span><span>FIT {Math.round(scale * 100)}%</span></div>
          <motion.div className="fa-screen-wrap" style={{ width: fittedWidth, height: fittedHeight }}>
            <motion.div className="fa-screen"
              style={{ width: screenWidth, height: screenHeight, scale: fittedScale, transformOrigin: 'top left' }} aria-label={`${mode} feed preview, ${size.width} by ${size.height} pixels`}>
              <div className="fa-app-brand"><Compass size={25} strokeWidth={2} /><span>roam<span className="fa-brand-period">.</span></span></div>
              <motion.div className="fa-sidebar-line" initial={false} animate={{ opacity: isDesktop ? 1 : 0, height: size.height }} transition={transition} />
              <motion.div className="fa-search" initial={false} animate={{ x: isDesktop ? 220 : isMobile ? 16 : 26, y: isDesktop ? 18 : isMobile ? 67 : 83, width: isDesktop ? Math.min(470, size.width - 410) : size.width - (isMobile ? 32 : 52) }} transition={transition}>
                <Search size={16} /><input aria-label="Search feed" placeholder="A little inspiration, a little discovery…" value={query} onChange={(event) => { setQuery(event.target.value); if (feedRef.current) feedRef.current.scrollTop = 0; }} />
                {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search">×</button>}
              </motion.div>
              <motion.div className="fa-profile" initial={false} animate={{ x: size.width - 56, y: 20, opacity: mode === 'Tablet' ? 0 : 1 }} transition={transition} aria-hidden="true">R</motion.div>
              <motion.div className="fa-feed-heading" initial={false} animate={{ x: inset, y: isDesktop ? 94 : isMobile ? 124 : 142 }} transition={transition}>
                <h4>{section === 'Explore' ? 'For your curious side' : section === 'Saved' ? 'Kept for later' : section === 'Outside' ? 'A little further out' : 'Room to be inspired'}<span>.</span></h4>
                <span className="fa-post-count">{posts.length} finds</span>
              </motion.div>
              <motion.div ref={feedRef} className="fa-feed-scroll" initial={false} animate={{ x: inset, y: top, width: size.width - inset - right, height: size.height - top - (isMobile ? 79 : 14) }} transition={transition} tabIndex={0} aria-label="Scroll inspiration feed">
                <motion.div className="fa-masonry" initial={false} animate={{ height: masonry.height }} transition={transition}>
                  <AnimatePresence initial={false}>
                    {arranged.map(({ post, x, y, imageHeight }) => (
                      <motion.article key={post.id} className="fa-post" data-post-id={post.id}
                        initial={{ opacity: 0 }} animate={{ x, y, width: cardWidth, opacity: 1 }} exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.12 } }} transition={transition}>
                        <motion.div className="fa-post-image" initial={false} animate={{ height: imageHeight }} transition={transition} style={{ background: post.color }}>
                          <Image unoptimized loading="eager" src={`/feed-adapt/${post.image}.jpg`} alt={post.alt} draggable={false} width={640} height={800} decoding="async" />
                          <button className="fa-save" type="button" aria-label={`${saved.includes(post.id) ? 'Unsave' : 'Save'} ${post.title}`} aria-pressed={saved.includes(post.id)}
                            onClick={() => setSaved((current) => current.includes(post.id) ? current.filter((id) => id !== post.id) : [...current, post.id])}>
                            <Heart size={17} strokeWidth={1.7} fill={saved.includes(post.id) ? 'currentColor' : 'none'} />
                          </button>
                        </motion.div>
                        <h5>{post.title}</h5>
                        <div className="fa-post-author"><span style={{ background: post.color }}>{post.author.charAt(0)}</span>{post.author}</div>
                      </motion.article>
                    ))}
                  </AnimatePresence>
                  {posts.length === 0 && <div className="fa-empty"><Bookmark size={24} /><strong>{section === 'Saved' ? 'A little space for your favorites' : 'Nothing here just yet'}</strong><span>{section === 'Saved' ? 'Tap a heart in Explore to keep a find.' : 'Try another word or explore the full feed.'}</span><button type="button" onClick={() => { setQuery(''); selectSection('Explore'); }}>Explore all finds</button></div>}
                </motion.div>
              </motion.div>
              <motion.nav className="fa-app-nav" aria-label="Feed navigation" initial={false} animate={navBox} transition={transition}>
                {NAV.map(({ name, icon: Icon }, index) => {
                  const itemWidth = isDesktop ? 176 : navBox.width / 4;
                  const iconX = isMobile ? (itemWidth - 21) / 2 : isDesktop ? 15 : (itemWidth - name.length * 6 - 28) / 2;
                  return <motion.button key={name} type="button" className="fa-nav-item" aria-pressed={section === name} onClick={() => selectSection(name)}
                    initial={false} animate={{ x: isDesktop ? 0 : index * itemWidth, y: isDesktop ? index * 54 : 0, width: itemWidth, height: isMobile ? 67 : 46 }} transition={transition}>
                    <motion.span className="fa-nav-symbol" initial={false} animate={{ x: iconX, y: 12 }} transition={transition}><Icon size={21} strokeWidth={1.7} /></motion.span>
                    <motion.span className="fa-nav-label" initial={false} animate={{ x: isMobile ? 0 : iconX + 29, y: isMobile ? 39 : 15, width: isMobile ? itemWidth : name.length * 7, fontSize: isMobile ? 10 : isDesktop ? 13 : 12 }} transition={transition}>{name}</motion.span>
                  </motion.button>;
                })}
              </motion.nav>
              <motion.div className="fa-sidebar-note" initial={false} animate={{ opacity: isDesktop ? 1 : 0 }} transition={transition} aria-hidden="true"><span>A place for</span><strong>your next<br />little discovery.</strong><Compass size={24} strokeWidth={1.2} /></motion.div>
            </motion.div>
            <button type="button" className="fa-resize fa-resize-width" aria-label="Resize screen width. Use left and right arrow keys." onPointerDown={(event) => startResize(event, 'width')} onPointerMove={moveResize} onPointerUp={stopResize} onPointerCancel={stopResize} onLostPointerCapture={stopResize} onKeyDown={(event) => resizeKey(event, 'width')}><span /></button>
            <button type="button" className="fa-resize fa-resize-height" aria-label="Resize screen height. Use up and down arrow keys." onPointerDown={(event) => startResize(event, 'height')} onPointerMove={moveResize} onPointerUp={stopResize} onPointerCancel={stopResize} onLostPointerCapture={stopResize} onKeyDown={(event) => resizeKey(event, 'height')}><span /></button>
            <button type="button" className="fa-resize fa-resize-corner" aria-label="Resize screen width and height. Use arrow keys, or Shift for larger steps." onPointerDown={(event) => startResize(event, 'both')} onPointerMove={moveResize} onPointerUp={stopResize} onPointerCancel={stopResize} onLostPointerCapture={stopResize} onKeyDown={(event) => resizeKey(event, 'both')}><MoveDiagonal2 size={15} /></button>
          </motion.div>
          <div className="fa-canvas-hint"><ArrowLeftRight size={13} /><span>Drag an edge. Watch it find its place.</span></div>
        </div>
        <aside className="fa-panel" aria-label="Viewport dimensions and responsive settings">
          <div className="fa-panel-heading"><div><h4>Viewport</h4></div><button type="button" className="fa-reset" onClick={reset} aria-label="Reset responsive playground"><RotateCcw size={15} /></button></div>
          <div className="fa-presets" aria-label="Device presets">
            {PRESETS.map(({ name, width, height, icon: Icon }) => <button key={name} type="button" aria-pressed={size.width === width && size.height === height} onClick={() => updateSize({ width, height })}><Icon size={19} strokeWidth={1.6} /><span>{name}</span></button>)}
          </div>
          <div className="fa-size-readout"><span>{size.width}</span><span className="fa-size-times">×</span><span>{size.height}</span><span className="fa-size-unit">PX</span></div>
          <div className="fa-dimensions">
            <DimensionControl axis="width" value={size.width} onChange={(width) => updateSize({ ...sizeRef.current, width })} />
            <DimensionControl axis="height" value={size.height} onChange={(height) => updateSize({ ...sizeRef.current, height })} />
          </div>
          <div className="fa-layout-info"><div className="fa-info-title"><span>Current layout</span><span className="fa-mode-badge"><span />{mode}</span></div>
            <dl><div><dt>Feed columns</dt><dd>{columns.toString().padStart(2, '0')}<span className="fa-column-glyph" aria-hidden="true">{Array.from({ length: columns }, (_, index) => <i key={index} />)}</span></dd></div><div><dt>Navigation</dt><dd>{isMobile ? 'Bottom bar' : isDesktop ? 'Sidebar' : 'Top bar'}</dd></div><div><dt>Image crop</dt><dd>{isMobile ? 'Portrait' : isDesktop ? 'Open' : 'Balanced'}</dd></div></dl>
          </div>

        </aside>
      </div>
      <span className="fa-sr-only" aria-live="polite">Viewport {settledSize.width} by {settledSize.height} pixels. {getLayout(settledSize.width).mode}, {getLayout(settledSize.width).columns} columns.</span>
    </div>
  );
}
