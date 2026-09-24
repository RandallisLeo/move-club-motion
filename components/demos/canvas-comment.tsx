'use client';

import {
  ArrowUp,
  Check,
  FolderOpen,
  ImagePlus,
  Link2,
  MessageSquare,
  Minus,
  MoveDiagonal2,
  Paperclip,
  Plus,
  Upload,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { createGenerateField } from './media-generate-field';
import './canvas-comment.css';

type NodeKey = 'source' | 'result' | `result-${number}`;
type Point = { x: number; y: number };
type Position = { x: number; y: number };
type PendingComment = { id: number; target: NodeKey; point: Point };
type BranchTheme = 'green' | 'purple' | 'red';
type ExtraResult = {
  id: `result-${number}`;
  parent: NodeKey;
  position: Position;
  width: number;
  prompt: string;
  commentId: number;
  status: 'loading' | 'ready';
  theme: BranchTheme;
  portOffset: number;
};

const SAMPLE_SOURCE = '/canvas-comment/lamp-source.jpg';
const SAMPLE_REFERENCE = '/canvas-comment/room-reference.jpg';
const SAMPLE_RESULT = '/canvas-comment/lamp-result.jpg';
const SAMPLE_PROMPT = '把米白色棚拍背景替换成参考图里的雾林阅读角，保留蓝色台灯和石台的造型、位置与比例。';
const SURFACE_WIDTH = 3000;
const SURFACE_HEIGHT = 1000;
const BRANCH_THEMES: BranchTheme[] = ['green', 'purple', 'red'];
const BRANCH_COLORS: Record<BranchTheme, string> = {
  green: '#62ad83',
  purple: '#8178df',
  red: '#dc7777',
};

function nodeHeight(width: number) {
  return width / 1.5 + 28;
}

function connectorGeometry(source: Position, sourceWidth: number, result: Position, resultWidth: number, portOffset = 0) {
  const a = { x: source.x + sourceWidth / 2, y: source.y + nodeHeight(sourceWidth) / 2 };
  const b = { x: result.x + resultWidth / 2, y: result.y + nodeHeight(resultWidth) / 2 };
  const direction = b.x >= a.x ? 1 : -1;
  const imageHeight = sourceWidth / 1.5;
  const startY = Math.max(source.y + 48, Math.min(source.y + 28 + imageHeight - 20, a.y + portOffset));
  const start = { x: a.x + direction * sourceWidth / 2, y: startY };
  const end = { x: b.x - direction * resultWidth / 2, y: b.y };

  if (Math.abs(start.y - end.y) < 1) {
    return {
      path: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
    };
  }

  const bendX = (start.x + end.x) / 2;
  const radius = Math.min(14, Math.abs(end.y - start.y) / 2, Math.abs(end.x - start.x) / 4);
  const verticalDirection = end.y > start.y ? 1 : -1;
  return {
    path: [
      `M ${start.x} ${start.y}`,
      `L ${bendX - direction * radius} ${start.y}`,
      `Q ${bendX} ${start.y} ${bendX} ${start.y + verticalDirection * radius}`,
      `L ${bendX} ${end.y - verticalDirection * radius}`,
      `Q ${bendX} ${end.y} ${bendX + direction * radius} ${end.y}`,
      `L ${end.x} ${end.y}`,
    ].join(' '),
  };
}

function ResizeHandle({ width, setWidth, label }: { width: number; setWidth: (width: number) => void; label: string }) {
  const start = useRef<{ x: number; width: number } | null>(null);

  return (
    <button
      type="button"
      className="canvas-comment-resize-handle"
      aria-label={label}
      onPointerDown={(event) => {
        event.stopPropagation();
        start.current = { x: event.clientX, width };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!start.current) return;
        setWidth(Math.max(260, Math.min(570, start.current.width + (event.clientX - start.current.x))));
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
        start.current = null;
      }}
      onPointerCancel={() => { start.current = null; }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); setWidth(Math.min(570, width + 16)); }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); setWidth(Math.max(260, width - 16)); }
      }}
    ><MoveDiagonal2 size={14} strokeWidth={2} /></button>
  );
}

function DotSweepLoader() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const field = createGenerateField(element, { sweepColor: [107, 111, 249] });
    if (!field) return;
    let frame = 0;
    let last = 0;
    let time = 0;
    const draw = () => field.render(reducedMotion ? 1.1 : time * 2.4, 'sweep');
    const resize = new ResizeObserver(() => { field.resize(); draw(); });
    resize.observe(element);
    field.resize();
    draw();
    if (!reducedMotion) {
      const tick = (now: number) => {
        if (last) time += Math.min((now - last) / 1000, .08);
        last = now;
        draw();
        frame = window.requestAnimationFrame(tick);
      };
      frame = window.requestAnimationFrame(tick);
    }
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      resize.disconnect();
    };
  }, [reducedMotion]);

  return <canvas aria-hidden="true" />;
}

export function CanvasComment({ replayKey }: { replayKey: number }) {
  const [source, setSource] = useState(SAMPLE_SOURCE);
  const [reference, setReference] = useState(SAMPLE_REFERENCE);
  const [referenceName, setReferenceName] = useState('room-reference.jpg');
  const [sourcePosition, setSourcePosition] = useState<Position>({ x: 66, y: 88 });
  const [resultPosition, setResultPosition] = useState<Position>({ x: 790, y: 88 });
  const [sourceWidth, setSourceWidth] = useState(440);
  const [resultWidth, setResultWidth] = useState(440);
  const [commentMode, setCommentMode] = useState(false);
  const [zoom, setZoom] = useState(82);
  const [pending, setPending] = useState<PendingComment | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState(SAMPLE_PROMPT);
  const [firstPrompt, setFirstPrompt] = useState(SAMPLE_PROMPT);
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [extraResults, setExtraResults] = useState<ExtraResult[]>([]);
  const [historyOpen, setHistoryOpen] = useState<NodeKey | null>(null);
  const [savingFollowup, setSavingFollowup] = useState(false);
  const [draggingFile, setDraggingFile] = useState(false);
  const sourceInput = useRef<HTMLInputElement>(null);
  const referenceInput = useRef<HTMLInputElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  const nextCommentId = useRef(1);
  const nextGeneratedId = useRef(2);
  const pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const nodeDrag = useRef<{ key: NodeKey; x: number; y: number; origin: Position; moved: boolean; pressed: HTMLElement } | null>(null);
  const dragFrame = useRef<number | null>(null);
  const queuedNodePosition = useRef<{ key: NodeKey; position: Position } | null>(null);
  const objectUrls = useRef<string[]>([]);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;

    const zoomWithTrackpad = (event: globalThis.WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();

      const bounds = element.getBoundingClientRect();
      const pointerX = event.clientX - bounds.left;
      const pointerY = event.clientY - bounds.top;
      const wheelAmount = Math.max(1, Math.min(6, Math.abs(event.deltaY) * .7));

      setZoom((currentZoom) => {
        const nextZoom = Math.max(64, Math.min(112, currentZoom + (event.deltaY < 0 ? wheelAmount : -wheelAmount)));
        if (nextZoom === currentZoom) return currentZoom;

        const contentX = (element.scrollLeft + pointerX) / (currentZoom / 100);
        const contentY = (element.scrollTop + pointerY) / (currentZoom / 100);
        window.requestAnimationFrame(() => {
          element.scrollLeft = Math.max(0, contentX * (nextZoom / 100) - pointerX);
          element.scrollTop = Math.max(0, contentY * (nextZoom / 100) - pointerY);
        });
        return nextZoom;
      });
    };

    element.addEventListener('wheel', zoomWithTrackpad, { passive: false });
    return () => element.removeEventListener('wheel', zoomWithTrackpad);
  }, []);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
    if (dragFrame.current !== null) window.cancelAnimationFrame(dragFrame.current);
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function setNodePosition(key: NodeKey, position: Position) {
    if (key === 'source') setSourcePosition(position);
    else if (key === 'result') setResultPosition(position);
    else setExtraResults((items) => items.map((item) => item.id === key ? { ...item, position } : item));
  }

  function nodePosition(key: NodeKey) {
    if (key === 'source') return sourcePosition;
    if (key === 'result') return resultPosition;
    return extraResults.find((item) => item.id === key)?.position ?? resultPosition;
  }

  function nodeWidth(key: NodeKey) {
    if (key === 'source') return sourceWidth;
    if (key === 'result') return resultWidth;
    return extraResults.find((item) => item.id === key)?.width ?? resultWidth;
  }

  function focusNode(position: Position, width: number) {
    const element = viewport.current;
    if (!element) return;
    const scale = zoom / 100;
    const left = Math.max(0, (position.x + width / 2) * scale - element.clientWidth / 2);
    const top = Math.max(0, (position.y + nodeHeight(width) / 2) * scale - element.clientHeight / 2);
    window.requestAnimationFrame(() => {
      element.scrollTo({ left, top, behavior: reducedMotion ? 'auto' : 'smooth' });
    });
  }

  function beginNodeDrag(key: NodeKey, event: PointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest('button, textarea, .canvas-comment-resize-handle')) return;
    nodeDrag.current = { key, x: event.clientX, y: event.clientY, origin: nodePosition(key), moved: false, pressed: event.target as HTMLElement };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add('is-dragging');
  }

  function moveNode(event: PointerEvent<HTMLElement>) {
    const drag = nodeDrag.current;
    if (!drag) return;
    const dx = (event.clientX - drag.x) / (zoom / 100);
    const dy = (event.clientY - drag.y) / (zoom / 100);
    if (!drag.moved && Math.hypot(dx, dy) > 3) drag.moved = true;
    if (!drag.moved) return;
    const width = nodeWidth(drag.key);
    queuedNodePosition.current = { key: drag.key, position: {
      x: Math.max(8, Math.min(SURFACE_WIDTH - width - 8, drag.origin.x + dx)),
      y: Math.max(58, Math.min(SURFACE_HEIGHT - nodeHeight(width) - 8, drag.origin.y + dy)),
    } };
    if (dragFrame.current === null) {
      dragFrame.current = window.requestAnimationFrame(() => {
        const next = queuedNodePosition.current;
        if (next) setNodePosition(next.key, next.position);
        queuedNodePosition.current = null;
        dragFrame.current = null;
      });
    }
  }

  function finishNodeDrag(key: NodeKey, event: PointerEvent<HTMLElement>) {
    const drag = nodeDrag.current;
    if (!drag || drag.key !== key) return;
    if (dragFrame.current !== null) {
      window.cancelAnimationFrame(dragFrame.current);
      dragFrame.current = null;
    }
    const queued = queuedNodePosition.current;
    if (queued?.key === key) setNodePosition(key, queued.position);
    queuedNodePosition.current = null;
    if (!drag.moved && drag.pressed.closest('.canvas-comment-image')) {
      const image = event.currentTarget.querySelector<HTMLElement>('.canvas-comment-image');
      if (image) {
        const bounds = image.getBoundingClientRect();
        const point = {
          x: Math.max(4, Math.min(96, ((event.clientX - bounds.left) / bounds.width) * 100)),
          y: Math.max(7, Math.min(94, ((event.clientY - bounds.top) / bounds.height) * 100)),
        };
        const id = nextCommentId.current;
        setPending({ id, target: key, point });
        setDraft(id === 1 ? SAMPLE_PROMPT : key === 'result' ? '把台灯向右移动一点，让它更靠近窗边。' : '保留台灯，再试一个更安静的室内背景。');
        setComposerOpen(true);
      }
    }
    event.currentTarget.classList.remove('is-dragging');
    nodeDrag.current = null;
  }

  function cancelNodeDrag(event: PointerEvent<HTMLElement>) {
    if (dragFrame.current !== null) window.cancelAnimationFrame(dragFrame.current);
    dragFrame.current = null;
    queuedNodePosition.current = null;
    nodeDrag.current = null;
    event.currentTarget.classList.remove('is-dragging');
  }

  function imageKeyDown(key: NodeKey, event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const id = nextCommentId.current;
      setPending({ id, target: key, point: { x: 68, y: 30 } });
      setDraft(id === 1 ? SAMPLE_PROMPT : key === 'result' ? '把台灯向右移动一点，让它更靠近窗边。' : '保留台灯，再试一个更安静的室内背景。');
      setComposerOpen(true);
      return;
    }
    const directions: Record<string, Position> = { ArrowLeft: { x: -12, y: 0 }, ArrowRight: { x: 12, y: 0 }, ArrowUp: { x: 0, y: -12 }, ArrowDown: { x: 0, y: 12 } };
    const delta = directions[event.key];
    if (!commentMode && delta) {
      event.preventDefault();
      const current = nodePosition(key);
      const width = nodeWidth(key);
      setNodePosition(key, {
        x: Math.max(8, Math.min(SURFACE_WIDTH - width - 8, current.x + delta.x)),
        y: Math.max(58, Math.min(SURFACE_HEIGHT - nodeHeight(width) - 8, current.y + delta.y)),
      });
    }
  }

  function useFile(file: File | undefined, kind: 'source' | 'reference') {
    if (!file?.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    if (kind === 'source') {
      setSource(url);
      setGenerated(false);
      setBusy(false);
      setPending(null);
      setComposerOpen(false);
      setHistoryOpen(null);
      setExtraResults([]);
      nextCommentId.current = 1;
      nextGeneratedId.current = 2;
    } else {
      setReference(url);
      setReferenceName(file.name);
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>, kind: 'source' | 'reference') {
    useFile(event.target.files?.[0], kind);
    event.target.value = '';
  }

  function beginPan(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('.canvas-comment-node, .canvas-comment-toolbar, .canvas-comment-corner-add, .canvas-comment-zoom, .canvas-comment-relationship')) return;
    pan.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add('is-panning');
  }

  function movePan(event: PointerEvent<HTMLDivElement>) {
    if (pan.current) {
      event.currentTarget.scrollLeft = pan.current.left - (event.clientX - pan.current.x);
      event.currentTarget.scrollTop = pan.current.top - (event.clientY - pan.current.y);
    }
  }

  function endPan(event: PointerEvent<HTMLDivElement>) {
    pan.current = null;
    event.currentTarget.classList.remove('is-panning');
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDraggingFile(false);
    useFile(event.dataTransfer.files?.[0], 'source');
  }

  function submitComment() {
    if (!pending || !draft.trim() || busy || savingFollowup) return;
    setComposerOpen(false);
    if (!generated) {
      const nextPosition = { ...resultPosition, y: sourcePosition.y };
      setFirstPrompt(draft);
      setResultWidth(sourceWidth);
      setResultPosition(nextPosition);
      setBusy(true);
      focusNode(nextPosition, sourceWidth);
      timer.current = window.setTimeout(() => {
        setBusy(false);
        setGenerated(true);
        setPending(null);
        nextCommentId.current = 2;
      }, reducedMotion ? 220 : 1350);
    } else {
      const parentPosition = nodePosition(pending.target);
      const parentWidth = nodeWidth(pending.target);
      const siblingCount = extraResults.filter((item) => item.parent === pending.target).length;
      const sourceChildCount = 1 + extraResults.filter((item) => item.parent === 'source').length;
      const nextPosition = pending.target === 'source'
        ? { x: 790, y: sourcePosition.y + sourceChildCount * (nodeHeight(parentWidth) + 86) }
        : { x: parentPosition.x + parentWidth + 230, y: parentPosition.y + siblingCount * (nodeHeight(parentWidth) + 86) };
      const parentTheme = pending.target === 'result'
        ? 'green'
        : extraResults.find((item) => item.id === pending.target)?.theme;
      const theme = pending.target === 'source'
        ? BRANCH_THEMES[sourceChildCount % BRANCH_THEMES.length]
        : parentTheme ?? 'green';
      const id = `result-${nextGeneratedId.current}` as const;
      const newResult: ExtraResult = {
        id,
        parent: pending.target,
        position: nextPosition,
        width: parentWidth,
        prompt: draft,
        commentId: pending.id,
        status: 'loading',
        theme,
        portOffset: pending.target === 'source' ? sourceChildCount * 54 : siblingCount * 54,
      };
      nextGeneratedId.current += 1;
      setExtraResults((items) => [...items, newResult]);
      setSavingFollowup(true);
      focusNode(nextPosition, parentWidth);
      timer.current = window.setTimeout(() => {
        setExtraResults((items) => items.map((item) => item.id === id ? { ...item, status: 'ready' } : item));
        setPending(null);
        setSavingFollowup(false);
        nextCommentId.current += 1;
      }, reducedMotion ? 220 : 1350);
    }
  }

  function composerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitComment();
    }
  }

  function boardKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setCommentMode(false);
      setComposerOpen(false);
      setHistoryOpen(null);
      return;
    }
    if ((event.target as HTMLElement).matches('textarea, input')) return;
    if (event.key.toLowerCase() === 'c') setCommentMode((active) => !active);
  }

  function renderCommentComposer(target: NodeKey) {
    if (!pending || pending.target !== target || !composerOpen) return null;
    return (
      <motion.div className="canvas-comment-composer" initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }} onPointerDown={(event) => event.stopPropagation()}>
        <div className="canvas-comment-composer-head">
          <span><b>R</b> Comment {pending.id}</span>
          <button type="button" onClick={() => setComposerOpen(false)} aria-label="Close comment"><X size={13} /></button>
        </div>
        <textarea autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={composerKeyDown} rows={3} aria-label="Describe the edit" />
        <div className="canvas-comment-linked-reference">
          <img src={reference} alt="Linked background reference" />
          <span><strong>Reference attached</strong><small>{referenceName}</small></span>
          <button type="button" onClick={() => referenceInput.current?.click()} aria-label="Replace reference"><Paperclip size={13} /></button>
        </div>
        <div className="canvas-comment-composer-actions">
          <span>Enter to send · Shift Enter for a new line</span>
          <button type="button" onClick={submitComment} disabled={!draft.trim()}>{savingFollowup ? 'Saving' : 'Send'} <ArrowUp size={13} strokeWidth={2} /></button>
        </div>
      </motion.div>
    );
  }

  function renderPins(target: NodeKey, width: number) {
    const pinPosition = (point: Point) => ({
      left: `${point.x}%`,
      top: 28 + (width / 1.5) * (point.y / 100),
    });

    return (
      <>
        {pending?.target === target && (
          <button type="button" className={`canvas-comment-pin${savingFollowup ? ' is-saving' : ''}`} style={pinPosition(pending.point)} onPointerDown={(event) => event.stopPropagation()} onClick={() => setComposerOpen((open) => !open)} aria-label={`Open comment ${pending.id}`}>{savingFollowup ? '…' : pending.id}</button>
        )}
      </>
    );
  }

  const submitted = busy || generated;
  const preparedResult = source === SAMPLE_SOURCE && reference === SAMPLE_REFERENCE;
  const connection = connectorGeometry(sourcePosition, sourceWidth, resultPosition, resultWidth);
  const extraConnections = extraResults.map((item) => ({
    item,
    connection: connectorGeometry(nodePosition(item.parent), nodeWidth(item.parent), item.position, item.width, item.portOffset),
  }));
  const commentCount = (key: NodeKey) => (key === 'source' && submitted ? 1 : 0) + extraResults.filter((item) => item.parent === key).length;
  const commentCountLabel = (key: NodeKey) => {
    const count = commentCount(key);
    return `${count} ${count === 1 ? 'comment' : 'comments'}`;
  };
  const surfaceStyle = { '--canvas-comment-zoom': zoom / 100 } as CSSProperties;

  return (
    <div
      className={`canvas-comment-demo${commentMode ? ' is-comment-mode' : ''}`}
      data-replay={replayKey}
      tabIndex={0}
      onKeyDown={boardKeyDown}
      onDragEnter={(event) => { event.preventDefault(); setDraggingFile(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDraggingFile(false); }}
      onDrop={onDrop}
    >
      <div className="canvas-comment-toolbar" aria-label="Canvas toolbar">
        <button type="button" className={commentMode ? 'is-active' : ''} onClick={() => setCommentMode((active) => !active)} aria-pressed={commentMode} aria-label="Comment tool">
          <MessageSquare size={14} strokeWidth={1.8} /><span>Comment</span><kbd>C</kbd>
        </button>
        <span className="canvas-comment-toolbar-divider" />
        <button type="button" className="canvas-comment-add" onClick={() => sourceInput.current?.click()}><Upload size={13} strokeWidth={1.8} /> Add image</button>
        <span className="canvas-comment-drag-status">Images always move</span>
      </div>

      <button type="button" className="canvas-comment-corner-add" onClick={() => sourceInput.current?.click()} aria-label="Add an image to the canvas"><Plus size={15} strokeWidth={1.8} /><span>Add</span></button>
      <input ref={sourceInput} type="file" accept="image/*" onChange={(event) => onFileChange(event, 'source')} hidden />
      <input ref={referenceInput} type="file" accept="image/*" onChange={(event) => onFileChange(event, 'reference')} hidden />

      <div ref={viewport} className="canvas-comment-viewport" onPointerDown={beginPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan}>
        <div className="canvas-comment-surface" style={surfaceStyle}>
          <svg className="canvas-comment-connections" viewBox={`0 0 ${SURFACE_WIDTH} ${SURFACE_HEIGHT}`} aria-hidden="true">
            <motion.path d={connection.path} style={{ stroke: BRANCH_COLORS.green }} initial={{ opacity: 0 }} animate={{ opacity: submitted ? 1 : 0 }} />
            {extraConnections.map(({ item, connection: extraConnection }) => (
              <motion.path key={item.id} d={extraConnection.path} style={{ stroke: BRANCH_COLORS[item.theme] }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
            ))}
          </svg>

          <section
            className="canvas-comment-node canvas-comment-source-node"
            style={{ left: sourcePosition.x, top: sourcePosition.y, width: sourceWidth }}
            onPointerDown={(event) => beginNodeDrag('source', event)}
            onPointerMove={moveNode}
            onPointerUp={(event) => finishNodeDrag('source', event)}
            onPointerCancel={cancelNodeDrag}
          >
            <header><span><i /> Original input</span>{commentCount('source') > 0 && <small>{commentCountLabel('source')}</small>}</header>
            <div className="canvas-comment-image" role="button" tabIndex={0} aria-label="Original image. Drag to move, or turn on comments and click to annotate." onKeyDown={(event) => imageKeyDown('source', event)}>
              <img src={source} alt="A blue table lamp photographed against a warm studio background" draggable={false} />
            </div>
            {renderPins('source', sourceWidth)}
            <ResizeHandle width={sourceWidth} setWidth={setSourceWidth} label="Resize original image" />
            <AnimatePresence>{renderCommentComposer('source')}</AnimatePresence>
          </section>

          <AnimatePresence>
            {submitted && (
              <div className="canvas-comment-relationship branch-green" style={{ left: resultPosition.x, top: resultPosition.y - 36 }}>
                <button type="button" onClick={() => setHistoryOpen((open) => open === 'result' ? null : 'result')} aria-expanded={historyOpen === 'result'}>
                  {busy ? <span className="canvas-comment-tag-pulse" /> : <Check size={11} strokeWidth={2.4} />} Comment 1
                </button>
                <AnimatePresence>
                  {historyOpen === 'result' && (
                    <motion.div className="canvas-comment-history" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}>
                      <div><span><b>R</b> Generation note</span><button type="button" onClick={() => setHistoryOpen(null)} aria-label="Close generation note"><X size={12} /></button></div>
                      <p>{firstPrompt}</p>
                      <figure><img src={reference} alt="Reference used for this generation" /><figcaption><Link2 size={10} /> Based on {referenceName}</figcaption></figure>
                      <small>{busy ? 'Generating output…' : 'Applied to generated output'}</small>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            {extraResults.map((item) => (
              <div key={`relationship-${item.id}`} className={`canvas-comment-relationship branch-${item.theme}`} style={{ left: item.position.x, top: item.position.y - 36 }}>
                <button type="button" onClick={() => setHistoryOpen((open) => open === item.id ? null : item.id)} aria-expanded={historyOpen === item.id}>
                  {item.status === 'loading' ? <span className="canvas-comment-tag-pulse" /> : <Check size={11} strokeWidth={2.4} />} Comment {item.commentId}
                </button>
                <AnimatePresence>
                  {historyOpen === item.id && (
                    <motion.div className="canvas-comment-history" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}>
                      <div><span><b>R</b> Generation note</span><button type="button" onClick={() => setHistoryOpen(null)} aria-label="Close generation note"><X size={12} /></button></div>
                      <p>{item.prompt}</p>
                      <figure><img src={reference} alt="Reference used for this generation" /><figcaption><Link2 size={10} /> Based on {referenceName}</figcaption></figure>
                      <small>{item.status === 'loading' ? 'Generating output…' : 'Applied to generated output'}</small>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {busy && (
              <motion.section key="loading" className="canvas-comment-node canvas-comment-result-node branch-green is-loading" style={{ left: resultPosition.x, top: resultPosition.y, width: resultWidth }} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                <header><span><i /> Generating output</span>{commentCount('result') > 0 && <small>{commentCountLabel('result')}</small>}</header>
                <div className="canvas-comment-result-skeleton"><DotSweepLoader /></div>
              </motion.section>
            )}
            {generated && (
              <motion.section
                key="result"
                className="canvas-comment-node canvas-comment-result-node branch-green"
                style={{ left: resultPosition.x, top: resultPosition.y, width: resultWidth }}
                initial={{ opacity: 0, x: 34, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: reducedMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
                onPointerDown={(event) => beginNodeDrag('result', event)}
                onPointerMove={moveNode}
                onPointerUp={(event) => finishNodeDrag('result', event)}
                onPointerCancel={cancelNodeDrag}
              >
                <header><span><i /> Generated output</span>{commentCount('result') > 0 && <small>{commentCountLabel('result')}</small>}</header>
                <div className="canvas-comment-image" role="button" tabIndex={0} aria-label="Generated image. Drag to move, or turn on comments and click to annotate." onKeyDown={(event) => imageKeyDown('result', event)}>
                  {preparedResult ? <img src={SAMPLE_RESULT} alt="The blue lamp placed in the referenced misty forest room" draggable={false} /> : <div className="canvas-comment-fallback-result"><img src={reference} alt="" /><img src={source} alt="Generated edit preview" /></div>}
                </div>
                {renderPins('result', resultWidth)}
                <ResizeHandle width={resultWidth} setWidth={setResultWidth} label="Resize generated image" />
                <AnimatePresence>{renderCommentComposer('result')}</AnimatePresence>
              </motion.section>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {extraResults.map((item) => item.status === 'loading' ? (
              <motion.section key={`${item.id}-loading`} className={`canvas-comment-node canvas-comment-result-node branch-${item.theme} is-loading`} style={{ left: item.position.x, top: item.position.y, width: item.width }} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                <header><span><i /> Generating output</span>{commentCount(item.id) > 0 && <small>{commentCountLabel(item.id)}</small>}</header>
                <div className="canvas-comment-result-skeleton"><DotSweepLoader /></div>
              </motion.section>
            ) : (
              <motion.section
                key={`${item.id}-ready`}
                className={`canvas-comment-node canvas-comment-result-node branch-${item.theme}`}
                style={{ left: item.position.x, top: item.position.y, width: item.width }}
                initial={{ opacity: 0, x: 34, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: reducedMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
                onPointerDown={(event) => beginNodeDrag(item.id, event)}
                onPointerMove={moveNode}
                onPointerUp={(event) => finishNodeDrag(item.id, event)}
                onPointerCancel={cancelNodeDrag}
              >
                <header><span><i /> Generated output</span>{commentCount(item.id) > 0 && <small>{commentCountLabel(item.id)}</small>}</header>
                <div className="canvas-comment-image" role="button" tabIndex={0} aria-label="Generated image. Drag to move, or click to annotate." onKeyDown={(event) => imageKeyDown(item.id, event)}>
                  {preparedResult ? <img src={SAMPLE_RESULT} alt="A later generated version of the blue lamp scene" draggable={false} /> : <div className="canvas-comment-fallback-result"><img src={reference} alt="" /><img src={source} alt="Generated edit preview" /></div>}
                </div>
                {renderPins(item.id, item.width)}
                <ResizeHandle width={item.width} setWidth={(width) => setExtraResults((items) => items.map((node) => node.id === item.id ? { ...node, width } : node))} label="Resize generated image" />
                <AnimatePresence>{renderCommentComposer(item.id)}</AnimatePresence>
              </motion.section>
            ))}
          </AnimatePresence>

          {!submitted && <div className="canvas-comment-empty-result"><span>02</span><p>Generated output appears here</p></div>}
          <div className="canvas-comment-canvas-note"><FolderOpen size={12} /><span>Drag to move · corners to resize · background to pan</span></div>
        </div>
      </div>

      <div className="canvas-comment-zoom" aria-label="Canvas zoom controls">
        <button type="button" onClick={() => setZoom((value) => Math.max(64, value - 8))} aria-label="Zoom out"><Minus size={12} /></button>
        <span>{Math.round(zoom)}%</span>
        <button type="button" onClick={() => setZoom((value) => Math.min(112, value + 8))} aria-label="Zoom in"><Plus size={12} /></button>
      </div>

      <AnimatePresence>{draggingFile && <motion.div className="canvas-comment-drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><ImagePlus size={21} strokeWidth={1.6} /><span>Drop image onto the board</span></motion.div>}</AnimatePresence>
    </div>
  );
}
