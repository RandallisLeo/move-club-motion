'use client';

import { ArrowUp, Bold, Check, Delete, Italic, Keyboard, MessageCircle, Plus, Search, ArrowBigUp, Smile, Strikethrough, Type, Underline, X } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { rebaseRuns, styleAt, type TextMotion, type TextRange, type Formats, type TextRun } from './message-mood-model';
import './message-mood.css';

type Shape = 'classic' | 'cloud' | 'burst' | 'note' | 'whisper';
type Tab = 'Keyboard' | 'Motion' | 'Shape' | 'Reaction';
type StickerPosition = { x: number; y: number };
type Sticker = { emoji: string; position: StickerPosition };
type Message = { id: number; text: string; effect: TextMotion; shape: Shape; stickers: Sticker[]; runs: TextRun[]; formats: Formats };
// Coordinates run along a narrow strip above the bubble, never through its text.
const maxStickers = 3;
const stickerInset = 22;
const stickerTop = -16;
const stickerTravel = 6;
function clampStickerPosition(position: StickerPosition): StickerPosition {
  return { x: Math.max(0, Math.min(1, position.x)), y: Math.max(0, Math.min(1, position.y)) };
}
const defaultFormats: Formats = { bold: false, italic: false, underline: false, strike: false };
const effects: { id: TextMotion; name: string }[] = [
  { id: 'big', name: 'Big' }, { id: 'small', name: 'Small' },
  { id: 'shake', name: 'Shake' }, { id: 'nod', name: 'Nod' },
  { id: 'explode', name: 'Explode' }, { id: 'ripple', name: 'Ripple' },
  { id: 'bloom', name: 'Bloom' }, { id: 'jitter', name: 'Jitter' },
];
const shapes: { id: Shape; name: string }[] = [
  { id: 'classic', name: 'Classic' }, { id: 'cloud', name: 'Daydream' },
  { id: 'burst', name: 'Shout' }, { id: 'note', name: 'Playful' },
  { id: 'whisper', name: 'Whisper' },
];
const reactions = [
  ['🥰','Loved'], ['🤓','Nerdy'], ['🥹','Touched'], ['🤕','Hurt'], ['😳','Surprised'], ['😏','Smirk'], ['🫠','Melting'],
  ['😊','Happy'], ['🥳','Party'], ['🤔','Thinking'], ['🙂','Smile'], ['👀','Eyes'], ['✨','Sparkles'], ['💜','Purple heart'],
  ['😘','Kiss'], ['🤪','Silly'], ['😇','Angel'], ['😍','Heart eyes'], ['😎','Cool'], ['🔥','Fire'], ['🫶','Heart hands'],
  ['😂','Laughing'], ['🤯','Mind blown'], ['🤫','Quiet'], ['🥱','Sleepy'], ['😌','Content'], ['🙃','Upside down'], ['💛','Yellow heart'],
].map(([emoji,label]) => ({emoji,label}));
const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });
function limitMessage(value: string) {
  let result = '';
  for (const { segment } of graphemes.segment(value.replace(/\n/g, ' '))) {
    if (result.length + segment.length > 120) break;
    result += segment;
  }
  return result;
}
function cloudOutline(width: number, height: number) {
  const corner = Math.min(22, width / 4, height / 3);
  const depth = Math.min(7, corner / 3);
  const columns = Math.max(3, Math.round((width - 2 * corner) / 52));
  const rows = Math.max(1, Math.round((height - 2 * corner) / 48));
  const dx = (width - 2 * corner) / columns;
  const dy = (height - 2 * corner) / rows;
  let path = `M ${corner} ${depth}`;
  for (let i = 0; i < columns; i++) path += ` Q ${corner + (i + .5) * dx} ${-depth} ${corner + (i + 1) * dx} ${depth}`;
  path += ` Q ${width - depth} ${depth} ${width - depth} ${corner}`;
  for (let i = 0; i < rows; i++) path += ` Q ${width + depth} ${corner + (i + .5) * dy} ${width - depth} ${corner + (i + 1) * dy}`;
  path += ` Q ${width - depth} ${height - depth} ${width - corner} ${height - depth}`;
  for (let i = 0; i < columns; i++) path += ` Q ${width - corner - (i + .5) * dx} ${height + depth} ${width - corner - (i + 1) * dx} ${height - depth}`;
  path += ` Q ${depth} ${height - depth} ${depth} ${height - corner}`;
  for (let i = 0; i < rows; i++) path += ` Q ${-depth} ${height - corner - (i + .5) * dy} ${depth} ${height - corner - (i + 1) * dy}`;
  return `${path} Q ${depth} ${depth} ${corner} ${depth} Z`;
}

function CloudArt() {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({width:300,height:80});
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(1, Math.round(entry.contentRect.width * 10) / 10);
      const height = Math.max(1, Math.round(entry.contentRect.height * 10) / 10);
      setSize(current => current.width === width && current.height === height ? current : {width,height});
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  // Rebuild the outline at its real size so extra lines add lobes, not stretched edges.
  return <svg ref={ref} className="mm-shape-art mm-cloud-art" viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true"><path d={cloudOutline(size.width,size.height)}/></svg>;
}

function ShapeArt({ shape }: { shape: Shape }) {
  if (shape === 'cloud') return <CloudArt/>;
  return <span className="mm-shape-art" aria-hidden="true"/>;
}

function AnimatedWords({ message, playKey, selection }: { message: Message; playKey: number; selection?: TextRange | null }) {
  return <span className="mm-words" key={`${playKey}-${message.text}-${message.effect}-${JSON.stringify(message.runs)}`} aria-hidden="true">
    {Array.from(message.text.matchAll(/\S+|\s+/g)).map((match) => {
      const word = match[0];
      const start = match.index;
      if (/^\s+$/.test(word)) return <span key={start}> </span>;
      return <span className="mm-word" key={start}>{Array.from(graphemes.segment(word)).map(({segment:letter,index}) => {
        const offset = start + index;
        const applied = styleAt(offset, message.effect, message.formats, message.runs);
        return <span className={`mm-letter mm-effect-${applied.effect}${selection && offset >= selection.start && offset < selection.end ? " mm-selected-letter" : ""}`} style={{ fontWeight: applied.formats.bold ? 800 : 600, fontStyle: applied.formats.italic ? 'italic' : 'normal', textDecoration: [applied.formats.underline && 'underline', applied.formats.strike && 'line-through'].filter(Boolean).join(' ') || 'none', '--mm-i': offset, '--mm-x': ((offset * 37) % 71) - 35, '--mm-y': ((offset * 23) % 51) - 25, '--mm-r': ((offset * 17) % 61) - 30 } as CSSProperties} key={index}>{letter}</span>;
      })}</span>;
    })}
  </span>;
}

function Bubble({ message, playKey, onClick, onStickerMove, onStickerClick, pending = false, editing = false }: { message: Message; playKey: number; onClick: () => void; onStickerMove: (emoji: string, position: StickerPosition) => void; onStickerClick: () => void; pending?: boolean; editing?: boolean }) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; clientX: number; clientY: number; width: number; height: number; position: StickerPosition } | null>(null);
  const suppressStickerClick = useRef(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const reactionLabel = message.stickers.map(sticker => reactions.find(item => item.emoji === sticker.emoji)?.label ?? sticker.emoji).join(", ");
  return <motion.div className={`mm-bubble-wrap${pending ? " mm-pending" : ""}`} layout="position" initial={false} transition={{ type: 'spring', stiffness: 370, damping: 32 }}>
    <div key={pending ? "draft" : "sent"} className={`mm-bubble-stage${pending ? "" : " mm-send-enter"}`} ref={bubbleRef}>
    <motion.button animate={{opacity:pending ? .5 : 1}} transition={{duration:.2}} type="button" className={`mm-bubble mm-shape-${message.shape}`} style={message.stickers.length > 1 ? {minWidth: 44 * message.stickers.length} : undefined} onClick={onClick} aria-label={`${pending ? (editing ? "Editing message" : "Draft preview") : "Edit message"}: ${message.text}${reactionLabel ? `, ${reactionLabel} reaction` : ''}`}>
      <ShapeArt shape={message.shape} />
      <span className="mm-bubble-copy"><AnimatedWords message={message} playKey={playKey}/></span>
    </motion.button>
      {message.stickers.length > 0 && (pending || dragging) && <div className="mm-sticker-zone" key={`zone-${message.stickers.map(sticker => sticker.emoji).join("-")}`} data-dragging={Boolean(dragging)} aria-hidden="true"/>}
      <AnimatePresence>{message.stickers.map(sticker => <motion.button
        type="button" className="mm-sticker" key={sticker.emoji} aria-label={`Move ${reactions.find(item => item.emoji === sticker.emoji)?.label ?? sticker.emoji} reaction`}
        style={{left:`calc(${sticker.position.x * 100}% + ${stickerInset * (1 - 2 * sticker.position.x)}px)`,top:`${stickerTop + sticker.position.y * stickerTravel}px`}}
        initial={{scale:0,rotate:-25}} animate={{scale:dragging===sticker.emoji?1.08:1,rotate:dragging===sticker.emoji?0:-10,opacity:pending && dragging!==sticker.emoji ? .5 : 1}} exit={{scale:0}}
        transition={{type:'spring',stiffness:380,damping:22}}
        onPointerDown={event=>{
          if(event.button!==0 || dragRef.current)return;
          suppressStickerClick.current=false;
          event.preventDefault();event.stopPropagation();
          const rect=bubbleRef.current?.getBoundingClientRect();
          if(!rect || !rect.width || !rect.height)return;
          const scale=rect.width/bubbleRef.current!.offsetWidth;
          dragRef.current={pointerId:event.pointerId,clientX:event.clientX,clientY:event.clientY,width:Math.max(1,rect.width-2*stickerInset*scale),height:stickerTravel*scale,position:sticker.position};
          event.currentTarget.setPointerCapture(event.pointerId);setDragging(sticker.emoji);
        }}
        onPointerMove={event=>{
          const drag=dragRef.current;if(!drag || drag.pointerId!==event.pointerId)return;
          if(!suppressStickerClick.current && Math.hypot(event.clientX-drag.clientX,event.clientY-drag.clientY)<4)return;
          suppressStickerClick.current=true;
          onStickerMove(sticker.emoji, clampStickerPosition({x:drag.position.x+(event.clientX-drag.clientX)/drag.width,y:drag.position.y+(event.clientY-drag.clientY)/drag.height}));
        }}
        onPointerUp={event=>{if(dragRef.current?.pointerId!==event.pointerId)return;dragRef.current=null;setDragging(null);if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}}
        onPointerCancel={()=>{suppressStickerClick.current=true;const drag=dragRef.current;if(drag)onStickerMove(sticker.emoji, drag.position);dragRef.current=null;setDragging(null);}}
        onLostPointerCapture={()=>{dragRef.current=null;setDragging(null);}}
        onClick={event=>{event.preventDefault();event.stopPropagation();if(pending && (event.detail===0 || !suppressStickerClick.current))onStickerClick();suppressStickerClick.current=false;}}
        onKeyDown={event=>{
          const delta=event.shiftKey ? .1 : .025;
          const directions:Record<string,StickerPosition>={ArrowLeft:{x:-delta,y:0},ArrowRight:{x:delta,y:0},ArrowUp:{x:0,y:-delta},ArrowDown:{x:0,y:delta}};
          const direction=directions[event.key];if(!direction)return;
          event.preventDefault();event.stopPropagation();onStickerMove(sticker.emoji, clampStickerPosition({x:sticker.position.x+direction.x,y:sticker.position.y+direction.y}));
        }}
      >{sticker.emoji}</motion.button>)}</AnimatePresence>
    </div>
    {pending && <span className="mm-bubble-caption">{editing ? 'Editing' : 'Preview'}</span>}
  </motion.div>;
}

export function MessageMood({ replayKey }: { replayKey: number }) {
  return <MotionConfig reducedMotion="user"><MessageMoodSession key={replayKey} /></MotionConfig>;
}

function MessageMoodSession() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const inputId = 'mm-gallery-message';
  const [text, setText] = useState('You made my day');
  const [effect, setEffect] = useState<TextMotion>('none');
  const [shape, setShape] = useState<Shape>('classic');
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [formats, setFormats] = useState<Formats>(defaultFormats);
  const [runs, setRuns] = useState<TextRun[]>([]);
  const [range, setRange] = useState<TextRange | null>(null);
  const [selectionMenu, setSelectionMenu] = useState(false);
  const [selectionPulse, setSelectionPulse] = useState(0);
  const [tab, setTab] = useState<Tab>('Keyboard');
  const [messages, setMessages] = useState<Message[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [playKey, setPlayKey] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [search, setSearch] = useState('');
  const [shift, setShift] = useState(false);
  const [numeric, setNumeric] = useState(false);
  const [hasEditedDraft, setHasEditedDraft] = useState(false);
  const [nextId, setNextId] = useState(1);
  const [sendPulse, setSendPulse] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputPreviewRef = useRef<HTMLDivElement>(null);
  const caret = useRef<TextRange>({start:15,end:15});
  const touchTap = useRef<{time:number;x:number;y:number} | null>(null);
  const touchStart = useRef<{x:number;y:number} | null>(null);
  const draft: Message = { id: editingId ?? nextId, text, effect, shape, stickers, runs, formats };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      viewport.style.setProperty('--mm-scale', String(Math.min(width / 460, height / 540, 1)));
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 64)}px`;
    if(inputPreviewRef.current) inputPreviewRef.current.scrollTop = input.scrollTop;
  }, [text]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, editingId, text, shape, stickers.length, hasEditedDraft, tab]);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => el.scrollTo({ top: el.scrollHeight, behavior: 'instant' }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function selectAllInput() {
    const input = inputRef.current;
    if (!input || !text.length) return;
    input.focus({preventScroll:true});
    input.setSelectionRange(0,text.length);
    caret.current = {start:0,end:text.length};
    setRange({...caret.current});
    setSelectionPulse(pulse=>pulse+1);
    setSelectionMenu(true);
  }
  function send() {
    if (!text.trim()) return;
    setSelectionPulse(0);
    if (editingId !== null) {
      setMessages((items) => items.map((item) => item.id === editingId ? { ...draft, id: editingId } : item));
      setAnnouncement('Message updated.');
    } else {
      setMessages((items) => [...items, { ...draft, id: nextId }].slice(-20));
      setNextId(id=>id+1);
      setSendPulse(pulse=>pulse+1);
      setAnnouncement(`Sent: ${text}`);
    }
    setHasEditedDraft(false); setText(''); setStickers([]); setRuns([]); setRange(null); setSelectionMenu(false); setTab('Keyboard'); setEffect('none'); setShape('classic'); setFormats(defaultFormats); setEditingId(null); caret.current = {start:0,end:0};
  }
  function editMessage(message: Message) {
    setSelectionPulse(0);
    setHasEditedDraft(true); setEditingId(message.id); setText(message.text); setEffect(message.effect); setShape(message.shape); setStickers(message.stickers); setFormats(message.formats); setRuns(message.runs);setRange(null); setSelectionMenu(false); setTab('Motion'); caret.current = {start:message.text.length,end:message.text.length};
  }
  function toggleSticker(emoji: string) {
    setStickers(current => {
      if (current.some(sticker => sticker.emoji === emoji)) return current.filter(sticker => sticker.emoji !== emoji);
      if (current.length >= maxStickers) return current;
      // Choose the free anchor furthest from existing stickers without moving them.
      const anchors = [0, 1, .5];
      const x = current.length ? anchors.reduce((best, candidate) => {
        const distance = (anchor: number) => Math.min(...current.map(sticker => Math.abs(sticker.position.x - anchor)));
        return distance(candidate) > distance(best) ? candidate : best;
      }) : 0;
      return [...current, {emoji, position: {x, y: 1}}];
    });
  }
  function insert(value: string) {
    const {start,end} = caret.current;
    const next = limitMessage(text.slice(0,start) + value + text.slice(end));
    setText(next); setRuns(current=>rebaseRuns(text,next,current)); setRange(null);
    caret.current = {start:Math.min(start+value.length,next.length),end:Math.min(start+value.length,next.length)};
    setShift(false);
  }
  function backspace() {
    const {start,end} = caret.current;
    const before = Array.from(graphemes.segment(text.slice(0,start)));
    const cut = start === end ? (before.at(-1)?.index ?? 0) : start;
    const next = text.slice(0,cut)+text.slice(end); setText(next);setRuns(current=>rebaseRuns(text,next,current)); setRange(null); caret.current={start:cut,end:cut};
  }
  function applyEffect(next: TextMotion) {
    if (range) setRuns(current=>[...current,{...range,effect:next}]);
    else {setEffect(next);setRuns(current=>current.map(({effect: _effect,...run})=>run));}
    setPlayKey(key=>key+1);
  }
  function applyFormat(key: keyof Formats) {
    const active = range ? styleAt(range.start,effect,formats,runs).formats[key] : formats[key];
    if (range) setRuns(current=>[...current,{...range,formats:{[key]:!active}}]);
    else {setFormats(current=>({...current,[key]:!active}));setRuns(current=>current.map(run=>{const nextFormats={...run.formats};delete nextFormats[key];return {...run,formats:nextFormats};}));}
  }
  const selectedStyle = range ? styleAt(range.start,effect,formats,runs) : {effect,formats};
  function switchPanel(panel: Tab) { setTab(panel); if(panel !== 'Keyboard') setHasEditedDraft(true); setSelectionMenu(false); setSearch(''); }
  const formatOptions = [
    { key: 'bold', label: 'Bold', Icon: Bold }, { key: 'italic', label: 'Italic', Icon: Italic },
    { key: 'underline', label: 'Underline', Icon: Underline }, { key: 'strike', label: 'Strikethrough', Icon: Strikethrough },
  ] as const;
  const filteredReactions = reactions.filter((item) => item.label.toLowerCase().includes(search.toLowerCase()));
  const keyboardRows = numeric ? ['1234567890', '-/:;()$&@"', '.,?!\''] : ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

  const previewing = hasEditedDraft && Boolean(text.trim());
  const visibleMessages = messages.map(message => ({message: editingId === message.id && previewing ? draft : message, pending: editingId === message.id && previewing}));
  if (previewing && editingId === null) visibleMessages.push({message: draft, pending: true});

  return <div className="message-mood-viewport" ref={viewportRef}><div className="message-mood-demo">
    <div className="mm-wallpaper" aria-hidden="true"><span className="mm-doodle mm-daisy">✿</span><span className="mm-doodle mm-star">✦</span><span className="mm-doodle mm-heart">♡</span><span className="mm-doodle mm-flower">✿</span><span className="mm-doodle mm-spark">✧</span><span className="mm-doodle mm-smile">☺</span></div>
    <div className="mm-conversation">
      <div className="mm-chat-scroll" ref={scrollRef}>
        <div className="mm-received"><span className="mm-today">Today 9:41 AM</span><div>Okay</div><div className="mm-cheer">You got this</div></div>
        <div className="mm-message-list">{visibleMessages.map(({message,pending}) => <Bubble key={message.id} message={message} pending={pending} editing={editingId===message.id} playKey={pending ? playKey : 0} onStickerClick={()=>switchPanel('Reaction')} onStickerMove={(emoji,position)=>{const move=(items:Sticker[])=>items.map(sticker=>sticker.emoji===emoji?{...sticker,position}:sticker);if(pending)setStickers(move);else setMessages(items=>items.map(item=>item.id===message.id?{...item,stickers:move(item.stickers)}:item));}} onClick={() => {if(!pending)editMessage(message);else inputRef.current?.focus();}} />)}</div>
      </div>
      <form className="mm-composer" onSubmit={(event) => { event.preventDefault(); send(); }}>
        <AnimatePresence>{selectionMenu && range && <motion.div key={selectionPulse} initial={{opacity:0,y:8,scale:.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:4}} transition={{type:"spring",stiffness:500,damping:32,delay:selectionPulse ? .26 : 0}} className="mm-selection-menu" role="toolbar" aria-label="Selected text options" onMouseDown={event=>event.preventDefault()}>
          <button type="button" onClick={async()=>{await navigator.clipboard.writeText(text.slice(range.start,range.end));setAnnouncement('Selected text copied.');setSelectionMenu(false);}}>Copy</button>
          <button type="button" onClick={selectAllInput}>Select all</button>
          <button type="button" onClick={()=>switchPanel('Motion')}>Text effects</button>
        </motion.div>}</AnimatePresence>
        <label className="mm-sr-only" htmlFor={inputId}>Message</label>
        <button className="mm-add" type="button" aria-label="Choose bubble shape" onClick={() => switchPanel('Shape')}><Plus size={36} strokeWidth={2} /></button>
        <motion.div className="mm-input-row">{selectionPulse > 0 && <span key={`selection-${selectionPulse}`} className="mm-selection-light" aria-hidden="true"/>}{sendPulse > 0 && <span key={sendPulse} className="mm-send-pulse" aria-hidden="true"/>}<div className="mm-input-text"><motion.div key={`${editingId ?? "draft"}-${selectionPulse}`} transition={{type:"spring",stiffness:380,damping:32}} className={`mm-input-preview${selectionPulse ? " mm-selection-copy-flash" : ""}`} ref={inputPreviewRef} aria-hidden="true"><AnimatedWords message={draft} playKey={playKey} selection={range}/></motion.div><textarea id={inputId} ref={inputRef} rows={1} value={text} maxLength={120} placeholder="Message" spellCheck={false} onDoubleClick={event=>{event.preventDefault();selectAllInput();}} onPointerDown={event=>{if(event.pointerType==='touch')touchStart.current={x:event.clientX,y:event.clientY};}} onPointerUp={event=>{
          if(event.pointerType!=='touch')return;
          const start=touchStart.current;touchStart.current=null;
          if(!start || Math.hypot(event.clientX-start.x,event.clientY-start.y)>8){touchTap.current=null;return;}
          const previous=touchTap.current;
          if(previous && event.timeStamp-previous.time<320 && Math.hypot(event.clientX-previous.x,event.clientY-previous.y)<20){event.preventDefault();touchTap.current=null;selectAllInput();}
          else touchTap.current={time:event.timeStamp,x:event.clientX,y:event.clientY};
        }} onPointerCancel={()=>{touchStart.current=null;touchTap.current=null;}} onScroll={(event)=>{if(inputPreviewRef.current)inputPreviewRef.current.scrollTop=event.currentTarget.scrollTop;}} onChange={(event) => {const next=limitMessage(event.target.value);setRuns(current=>rebaseRuns(text,next,current));setText(next);setRange(null);}} onSelect={(event) => {const input=event.currentTarget;caret.current={start:input.selectionStart,end:input.selectionEnd};const selected = input.selectionEnd>input.selectionStart;setRange(selected?{...caret.current}:null);setSelectionMenu(selected);}} onKeyDown={(event) => {if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();send();}}} /></div>{stickers.length > 0 && <button type="button" className="mm-draft-reactions" aria-label="Edit attached emoji" onClick={()=>switchPanel('Reaction')}>{stickers.map(sticker=><span className="mm-draft-reaction" key={sticker.emoji}>{sticker.emoji}</span>)}</button>}<button className="mm-send" type="submit" disabled={!text.trim()} aria-label={editingId === null ? 'Send message' : 'Update message'}>{editingId === null ? <ArrowUp size={27} strokeWidth={3} /> : <Check size={21} strokeWidth={3} />}</button></motion.div>
      </form>
    </div>
    <aside className="mm-controls" aria-label="Message keyboard" data-panel={tab.toLowerCase()}>
      {tab !== 'Keyboard' && <div className="mm-editor-header"><button className="mm-back-keyboard" type="button" aria-label="Back to keyboard" onClick={()=>switchPanel('Keyboard')}><Keyboard size={23}/></button><div className="mm-editor-tabs" role="tablist" aria-label="Message editor">{([{id:'Motion',label:'Text',Icon:Type},{id:'Shape',label:'Bubble',Icon:MessageCircle},{id:'Reaction',label:'Emoji',Icon:Smile}] as const).map(({id,label,Icon})=><button key={id} id={`mm-tab-${id}`} role="tab" tabIndex={tab===id?0:-1} onKeyDown={event=>{const ids:Tab[]=['Motion','Shape','Reaction'];const index=ids.indexOf(id);const next=event.key==='ArrowRight'?ids[(index+1)%3]:event.key==='ArrowLeft'?ids[(index+2)%3]:event.key==='Home'?ids[0]:event.key==='End'?ids[2]:null;if(next){event.preventDefault();switchPanel(next);document.getElementById(`mm-tab-${next}`)?.focus();}}} aria-selected={tab===id} aria-controls="mm-editor-panel" type="button" onMouseDown={event=>event.preventDefault()} onClick={()=>switchPanel(id)}><Icon size={20}/><span>{label}</span></button>)}</div></div>}
      <motion.div key={tab} className="mm-panel-body" id={tab !== 'Keyboard' ? 'mm-editor-panel' : undefined} role={tab !== 'Keyboard' ? 'tabpanel' : undefined} aria-labelledby={tab !== 'Keyboard' ? `mm-tab-${tab}` : undefined} initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{type:"spring",stiffness:420,damping:34}}>
        {tab === 'Motion' && <><div className="mm-format-row" aria-label="Text formatting">{formatOptions.map(({key,label,Icon})=><button type="button" key={key} aria-label={label} aria-pressed={selectedStyle.formats[key]} onMouseDown={(event)=>event.preventDefault()} onClick={()=>applyFormat(key)}><Icon size={23} strokeWidth={key==='bold'?3:2} /></button>)}</div><div className="mm-effects" aria-label="Text effects">{effects.map(({id,name})=><button key={id} type="button" aria-label={name} aria-pressed={selectedStyle.effect===id} onMouseDown={(event)=>event.preventDefault()} onClick={()=>applyEffect(id)}><span className={`mm-effect-label mm-label-${id}`}><AnimatedWords message={{...draft,text:name,effect:id,runs:[],formats:defaultFormats}} playKey={0}/></span></button>)}</div></>}
        {tab === 'Shape' && <><div className="mm-shapes" aria-label="Bubble shape">{shapes.map((item)=><button key={item.id} type="button" aria-pressed={shape===item.id} onClick={()=>setShape(item.id)}><span className={`mm-shape-swatch mm-shape-${item.id}`}><ShapeArt shape={item.id} /></span><span>{item.name}</span></button>)}</div></>}
        {tab === 'Reaction' && <><label className="mm-emoji-search"><Search size={17}/><input aria-label="Search emoji" placeholder="Search Emoji" value={search} onChange={(event)=>setSearch(event.target.value)}/><button type="button" aria-label="Remove all reactions" disabled={!stickers.length} onClick={()=>setStickers([])}><X size={17}/></button></label><div className="mm-reactions" aria-label="Message reaction">{filteredReactions.map(({emoji,label})=><button type="button" key={emoji} aria-label={`${label} reaction`} aria-pressed={stickers.some(sticker=>sticker.emoji===emoji)} disabled={stickers.length>=maxStickers && !stickers.some(sticker=>sticker.emoji===emoji)} onClick={()=>toggleSticker(emoji)}>{emoji}</button>)}{!filteredReactions.length&&<p>No emoji found.</p>}</div></>}
        {tab === 'Keyboard' && <div className="mm-keyboard">{keyboardRows.map((row,i)=><div className={`mm-key-row mm-key-row-${i}`} key={i}>{i===2&&<button className="mm-key-modifier" type="button" aria-label="Shift" aria-pressed={shift} onClick={()=>setShift(!shift)}><ArrowBigUp size={20}/></button>}{Array.from(row).map(letter=><button type="button" key={letter} aria-label={`Type ${shift?letter.toUpperCase():letter}`} onClick={()=>insert(shift?letter.toUpperCase():letter)}>{shift?letter.toUpperCase():letter}</button>)}{i===2&&<button className="mm-key-modifier" type="button" aria-label="Delete last character" onClick={backspace}><Delete size={21}/></button>}</div>)}<div className="mm-key-row mm-key-bottom"><button type="button" onClick={()=>setNumeric(!numeric)}>{numeric?'ABC':'123'}</button><button type="button" aria-label="Open emoji keyboard" onClick={()=>switchPanel('Reaction')}><Smile size={21}/></button><button className="mm-space" type="button" aria-label="Space" onClick={()=>insert(' ')}>space</button><button type="button" disabled={!text.trim()} onClick={send}>send</button></div></div>}
      </motion.div>
      {tab === 'Keyboard' && <div className="mm-keyboard-entry"><button type="button" aria-label="Edit message appearance" onClick={()=>switchPanel('Motion')}><Type size={24}/></button><button type="button" aria-label="Open emoji editor" onClick={()=>switchPanel('Reaction')}><Smile size={24}/></button></div>}
      <div className="mm-home-indicator" aria-hidden="true"><span/></div>
    </aside>
    <output className="mm-sr-only">{announcement}</output>
  </div></div>;
}
