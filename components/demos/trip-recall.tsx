'use client';

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type TouchEvent } from 'react';
import { ArrowLeft, Check, ChevronDown, Compass, Images, Search, Smile, Sparkles, Wind, ZoomIn, ZoomOut, PencilLine, Star, Trash2, Undo2, X } from 'lucide-react';
import './trip-recall.css';
import { TripSticker, type StampMotion, type StampDrag } from './trip-sticker';
import { TripPhotoFilm } from './trip-photo-film';

type Place = { id: string; name: string; local: string; image: string; alt: string; time: string; note: string; x: number; y: number; source: string };
const places: Place[] = [
  { id: 'belem', name: 'Belém', local: 'By the water · Slow afternoons', image: '/trip-recall/belem.jpg', alt: 'Belém Tower beside the Tagus River in warm evening light', time: 'DAY 01 · 17:42', note: 'Stayed until the light turned everything gold.', x: 23, y: 56, source: 'https://unsplash.com/photos/OkFbuQx8PIA' },
  { id: 'tram', name: 'Tram days', local: 'Lisboa · The scenic way home', image: '/trip-recall/tram.jpg', alt: 'A classic yellow Lisbon tram traveling along a sunlit street', time: 'DAY 02 · 10:16', note: 'Missed our stop. Found our favorite street.', x: 48, y: 47, source: 'https://unsplash.com/photos/ljhCEaHYWJ8' },
  { id: 'alfama', name: 'Alfama', local: 'Old town · A little wander', image: '/trip-recall/alfama.jpg', alt: 'Colorful buildings and terracotta rooftops in Lisbon’s Alfama district', time: 'DAY 03 · 16:24', note: 'Up another hill, just to see what was there.', x: 77, y: 56, source: 'https://unsplash.com/photos/M0ywxxUOIkE' },
];

type Photo = { id: string; placeId: string; image: string; alt: string; title: string; ratio: number };
const photos: Photo[] = [
  { id: 'belem', placeId: 'belem', image: '/trip-recall/belem.jpg', alt: places[0].alt, title: 'Belém by the water', ratio: 1000 / 672 },
  { id: 'belem-river', placeId: 'belem', image: '/trip-recall/belem-river.jpg', alt: 'Belém Tower rising above the Tagus River', title: 'Along the Tagus', ratio: 4 / 3 },
  { id: 'belem-sunset', placeId: 'belem', image: '/trip-recall/belem-sunset.jpg', alt: 'The sun setting beside Belém Tower', title: 'Last light at Belém', ratio: 1000 / 672 },
  { id: 'tram', placeId: 'tram', image: '/trip-recall/tram.jpg', alt: places[1].alt, title: 'Tram days', ratio: 1000 / 665 },
  { id: 'tram-street', placeId: 'tram', image: '/trip-recall/tram-street.jpg', alt: 'Portrait view of a yellow Lisbon tram on a steep narrow street', title: 'Down the hill', ratio: 2 / 3 },
  { id: 'tram-ride', placeId: 'tram', image: '/trip-recall/tram-ride.jpg', alt: 'Passengers riding a tram through Lisbon', title: 'Along for the ride', ratio: 1000 / 666 },
  { id: 'alfama', placeId: 'alfama', image: '/trip-recall/alfama.jpg', alt: places[2].alt, title: 'Alfama rooftops', ratio: 1000 / 667 },
  { id: 'alfama-lane', placeId: 'alfama', image: '/trip-recall/alfama-lane.jpg', alt: 'Portrait view down a cobblestone Alfama lane with white walls and a street lamp', title: 'A quiet little lane', ratio: 2 / 3 },
  { id: 'alfama-view', placeId: 'alfama', image: '/trip-recall/alfama-view.jpg', alt: 'Portrait view of Alfama rooftops and the Tagus River', title: 'Over the rooftops', ratio: 2 / 3 },
  { id: 'tram-alfama', placeId: 'tram', image: '/trip-recall/tram-alfama.jpg', alt: 'A yellow tram winding through Alfama', title: 'Tram through Alfama', ratio: 1000 / 793 },
  { id: 'tram-yellow', placeId: 'tram', image: '/trip-recall/tram-yellow.jpg', alt: 'A yellow Lisbon tram on a city street', title: 'Morning tram', ratio: 1000 / 1333 },
  { id: 'tram-city', placeId: 'tram', image: '/trip-recall/tram-city.jpg', alt: 'A yellow tram rolling past historic Lisbon buildings', title: 'Another stop', ratio: 1000 / 1500 },
  { id: 'tram-red', placeId: 'tram', image: '/trip-recall/tram-red.jpg', alt: 'A red tram traveling down a cobbled Alfama street', title: 'The red tram', ratio: 1000 / 1500 },
  { id: 'belem-trees', placeId: 'belem', image: '/trip-recall/belem-trees.jpg', alt: 'Belém Tower framed by green trees', title: 'Through the trees', ratio: 1000 / 1337 },
  { id: 'belem-park', placeId: 'belem', image: '/trip-recall/belem-park.jpg', alt: 'Belém Tower beside a green park', title: 'A walk in the park', ratio: 1000 / 1500 },
  { id: 'belem-flag', placeId: 'belem', image: '/trip-recall/belem-flag.jpg', alt: 'A flag above the stone turrets of Belém Tower', title: 'Tower details', ratio: 1000 / 750 },
  { id: 'belem-palm', placeId: 'belem', image: '/trip-recall/belem-palm.jpg', alt: 'Belém Tower framed by palm leaves', title: 'Palm shade', ratio: 1000 / 1500 },
  { id: 'alfama-mural', placeId: 'alfama', image: '/trip-recall/alfama-mural.jpg', alt: 'A street lamp and a painted mural in Alfama', title: 'Street stories', ratio: 1000 / 1481 },
  { id: 'alfama-art', placeId: 'alfama', image: '/trip-recall/alfama-art.jpg', alt: 'A mural of a girl and birds on an Alfama building', title: 'On the walls', ratio: 1000 / 1499 },
  { id: 'alfama-sign', placeId: 'alfama', image: '/trip-recall/alfama-sign.jpg', alt: 'An Alfama sign on a neighborhood gate', title: 'Alfama, on foot', ratio: 1000 / 1499 },
  { id: 'alfama-tram', placeId: 'alfama', image: '/trip-recall/tram-red.jpg', alt: 'A red tram on a cobbled Alfama street', title: 'Around the corner', ratio: 1000 / 1500 },
];
const initialNotes = Object.fromEntries(places.map(place => [place.id, place.note]));
const collectionColors = [
  { name: 'Lavender', value: '#9d97fa' },
  { name: 'Sky', value: '#4cbfdd' },
  { name: 'Rose', value: '#ec9ab4' },
  { name: 'Peach', value: '#eda885' },
  { name: 'Mint', value: '#78bca8' },
  { name: 'Blue', value: '#6d98ed' },
];
const moods = [{ id: 'happy', label: 'Happy', icon: Smile }, { id: 'calm', label: 'Calm', icon: Wind }, { id: 'curious', label: 'Curious', icon: Compass }, { id: 'wonder', label: 'Amazed', icon: Sparkles }];
// One continuous itinerary, ordered Belém → Tram days → Alfama.
const firstRouteLeg = 'M92 168C134 191 158 169 145 147C132 125 153 114 192 141';
const journeyPath = `${firstRouteLeg}C231 166 181 192 159 216C131 244 206 260 231 229C256 198 310 237 308 168`;
const routePath = `${journeyPath}C306 99 274 139 284 108`;
const storageKey = 'move-club-trip-recall-lisbon-v1';

export function TripRecall({ replayKey = 0, fullPage = false }: { replayKey?: number; fullPage?: boolean }) {
  const [baseColor, setBaseColor] = useState(collectionColors[0].value);
  const [selected, setSelected] = useState('tram');
  const [gallerySelected, setGallerySelected] = useState('tram');
  const [galleryPending, setGalleryPending] = useState<string | null>(null);
  const [stampVisible, setStampVisible] = useState(false);
  const [stampMotion, setStampMotion] = useState<StampMotion | null>(null);
  const [stampRendering, setStampRendering] = useState(false);
  const stampStageRef = useRef<HTMLDivElement>(null);
  const stampSequence = useRef(0);
  const stampBusy = useRef(false);
  const queuedStamp = useRef<{ id: string; direction?: number } | null>(null);
  const stampPointer = useRef<{ id: number; x: number; y: number; width: number; phase: 'pending' | 'horizontal' | 'vertical'; control?: StampDrag; destination?: string } | null>(null);
  const [stampDragging, setStampDragging] = useState(false);
  const [placeMoods, setPlaceMoods] = useState<Record<string, string>>({ tram: 'happy', belem: 'calm', alfama: 'curious' });
  const [mapZoom, setMapZoom] = useState(1);
  const [routeOffset, setRouteOffset] = useState(1000);
  const routeProgressRef = useRef<SVGPathElement>(null);
  const firstRouteLegRef = useRef<SVGPathElement>(null);
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
  const [scrollProgress, setScrollProgress] = useState(0);
  const [headerOpacity, setHeaderOpacity] = useState(0);
  const collapsed = scrollProgress >= .995;
  const [photoStars, setPhotoStars] = useState<string[]>(['tram']);
  const [placeStars, setPlaceStars] = useState<string[]>(['belem']);
  const [notes, setNotes] = useState<Record<string, string>>(initialNotes);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [photoInfo, setPhotoInfo] = useState<Record<string, { title: string; caption: string }>>({});
  const [onlyHighlights, setOnlyHighlights] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerEditing, setViewerEditing] = useState(false);
  const [infoDraft, setInfoDraft] = useState({ title: '', caption: '', note: '' });
  const [lastDeleted, setLastDeleted] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [toolbarPanel, setToolbarPanel] = useState<'color' | 'search' | 'mood' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const toolbarId = useId();
  const moodButtonRef = useRef<HTMLButtonElement>(null);
  const mapRef = useRef<HTMLElement>(null);
  const compactLocationRef = useRef<HTMLDivElement>(null);
  const mapGesture = useRef<{ x: number; y: number; startX: number; startY: number; distance?: number; zoom: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const colorButtonRef = useRef<HTMLButtonElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const stripTouch = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);
  const mapSelected = stampMotion?.destination ?? selected;
  const active = places.find(place => place.id === gallerySelected) ?? places[1];
  const mood = moods.find(item => item.id === placeMoods[gallerySelected]) ?? moods[0];
  const MoodIcon = mood.icon;
  const routeGradientId = `${toolbarId.replace(/:/g, '')}-ribbon`;
  const panelTrigger = toolbarPanel === 'mood' ? moodButtonRef : toolbarPanel === 'search' ? searchButtonRef : colorButtonRef;
  const available = photos.filter(photo => !deletedIds.includes(photo.id));
  const photosFor = (id: string) => available.filter(photo => photo.placeId === id && (!onlyHighlights || placeStars.includes(id) || photoStars.includes(photo.id)));
  const shown = places.filter(place => !onlyHighlights || photosFor(place.id).length > 0 || placeStars.includes(place.id));
  const albumPhotos = photosFor(gallerySelected);
  const preferredCoverFor = (id: string) => id === 'tram' ? 'tram-street' : id === 'alfama' ? 'alfama-lane' : 'belem';
  const coverFor = (id: string) => photosFor(id).find(photo => photo.id === preferredCoverFor(id)) ?? photosFor(id)[0] ?? photos.find(photo => photo.id === preferredCoverFor(id))!;
  const viewerPhoto = available.find(photo => photo.id === viewerId);
  // Keep the open album stable while a photo's highlight is being changed.
  const viewerPhotos = available.filter(photo => photo.placeId === (viewerPhoto?.placeId ?? gallerySelected));
  const viewerIndex = viewerPhotos.findIndex(photo => photo.id === viewerId);
  const activeIndex = shown.findIndex(place => place.id === selected);
  const photoTitle = (photo: Photo) => photoInfo[photo.id]?.title ?? photo.title;
  const photoCaption = (photo: Photo) => photoInfo[photo.id]?.caption ?? places.find(place => place.id === photo.placeId)?.name ?? '';

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' }); setScrollProgress(0); setHeaderOpacity(0); setMapZoom(1); setMapPan({ x: 0, y: 0 }); setBaseColor(collectionColors[0].value); setGalleryPending(null); setGallerySelected('tram'); setSelected('tram'); setOnlyHighlights(false); setViewerId(null); setViewerEditing(false); setToolbarPanel(null);
  }, [replayKey]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
      if (saved) {
        if (saved.moods && typeof saved.moods === 'object') setPlaceMoods(Object.fromEntries(places.map(place => [place.id, moods.some(mood => mood.id === saved.moods[place.id]) ? saved.moods[place.id] : 'happy'])));
        if (replayKey === 0 && typeof saved.baseColor === 'string' && /^#[0-9a-f]{6}$/i.test(saved.baseColor)) setBaseColor(saved.baseColor);
        const photoIds = (value: unknown): value is string[] => Array.isArray(value) && value.every(id => photos.some(photo => photo.id === id));
        if (photoIds(saved.deletedIds)) setDeletedIds(saved.deletedIds);
        if (photoIds(saved.photos)) setPhotoStars(saved.photos);
        if (Array.isArray(saved.places)) setPlaceStars(saved.places.filter((id: string) => places.some(place => place.id === id)));
        if (saved.photoInfo && typeof saved.photoInfo === 'object') setPhotoInfo(Object.fromEntries(photos.flatMap(photo => {
          const info = saved.photoInfo[photo.id];
          return info && typeof info.title === 'string' && typeof info.caption === 'string' ? [[photo.id, { title: info.title.slice(0, 48), caption: info.caption.slice(0, 90) }]] : [];
        })));
        if (saved.notes && typeof saved.notes === 'object') setNotes(Object.fromEntries(photos.map(photo => [photo.id, typeof saved.notes[photo.id] === 'string' ? saved.notes[photo.id].slice(0, 160) : ''])));
      }
    } catch { /* All interactions remain available without local storage. */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ baseColor, moods: placeMoods, photos: photoStars, places: placeStars, notes, deletedIds, photoInfo })); } catch { /* Retain in-session changes. */ }
  }, [ready, baseColor, placeMoods, photoStars, placeStars, notes, deletedIds, photoInfo]);
  useEffect(() => {
    const route = routeProgressRef.current;
    const firstLeg = firstRouteLegRef.current;
    if (!route || !firstLeg) return;
    const destination = places.findIndex(place => place.id === mapSelected);
    const progress = destination === 0 ? 0 : destination === 1 ? firstLeg.getTotalLength() / route.getTotalLength() : 1;
    setRouteOffset(1000 * (1 - progress));
  }, [mapSelected, replayKey]);

  useEffect(() => {
    const stage = stampStageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setStampVisible(true); observer.disconnect(); }
    }, { threshold: .35 });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    stampBusy.current = false;
    queuedStamp.current = null;
    setStampRendering(false);
    if (!stampVisible || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setStampMotion(null); return; }
    stampBusy.current = true;
    setStampMotion({ incoming: stampSnapshot(selected), outgoing: null, entrySide: 1, sequence: ++stampSequence.current });
  }, [stampVisible, replayKey]);

  // Finish the current physical gesture before honoring the latest queued selection.
  useEffect(() => {
    if (stampMotion || !queuedStamp.current) return;
    const next = queuedStamp.current;
    queuedStamp.current = null;
    selectPlace(next.id, next.direction);
  }, [stampMotion, selected]);

  useEffect(() => {
    if (!viewerId && shown.length && !shown.some(place => place.id === selected)) {
      stampBusy.current = false; queuedStamp.current = null;
      setStampMotion(null); setStampRendering(false); commitPlace(shown[0].id);
    }
  }, [shown, selected, viewerId]);

  useEffect(() => {
    if (viewerId && !viewerEditing) viewerRef.current?.focus({ preventScroll: true });
    if (viewerEditing) viewerRef.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
  }, [viewerId, viewerEditing]);
  useEffect(() => {
    if (!toolbarPanel) return;
    if (toolbarPanel === 'search') searchInputRef.current?.focus({ preventScroll: true });
    else panelRef.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus({ preventScroll: true });
    const outside = (event: globalThis.PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !searchButtonRef.current?.contains(target) && !colorButtonRef.current?.contains(target) && !moodButtonRef.current?.contains(target)) setToolbarPanel(null);
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); setToolbarPanel(null);
      panelTrigger.current?.focus({ preventScroll: true });
    };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [toolbarPanel]);

  // Native scroll moves every layer continuously; only the location bar overlays it.
  function photoScrollOffset() {
    const scroller = scrollRef.current, wall = stripRef.current;
    return scroller && wall ? Math.max(1, wall.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - (compactLocationRef.current?.offsetHeight ?? 64)) : 1;
  }
  function updateScrollProgress() {
    const top = scrollRef.current?.scrollTop ?? 0;
    setScrollProgress(Math.min(1, Math.max(0, top / photoScrollOffset())));
    const mapHeight = mapRef.current?.offsetHeight ?? 0;
    const headerHeight = compactLocationRef.current?.offsetHeight ?? 64;
    // Let the native map leave first. Blend in over the last header-height of
    // travel instead of covering a still-visible map at a fixed scroll offset.
    const reveal = Math.min(1, Math.max(0, (top - mapHeight + headerHeight) / headerHeight));
    setHeaderOpacity(reveal * reveal * (3 - 2 * reveal));
  }
  function scrollToPhotos(top: number) {
    scrollRef.current?.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  useEffect(() => {
    const observer = new ResizeObserver(updateScrollProgress);
    if (surfaceRef.current) observer.observe(surfaceRef.current);
    if (mapRef.current) observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, []);

  function zoomMap(value: number) { setMapZoom(Math.max(.8, Math.min(1.8, Math.round(value * 100) / 100))); setMapPan({ x: 0, y: 0 }); }

  // The old wall blurs on intent; only the stamp landing commits new sharp photos.
  function prepareGallery(id: string) {
    setGalleryPending(id === gallerySelected ? null : id);
  }
  function commitPlace(id: string) {
    setGalleryPending(null); setGallerySelected(id); setSelected(id);
  }

  function stampSnapshot(id: string) {
    return { image: coverFor(id).image, title: places.find(place => place.id === id)!.name, count: photosFor(id).length };
  }
  function selectPlace(id: string, direction?: number) {
    prepareGallery(id);
    if (stampBusy.current) { queuedStamp.current = { id, direction }; return; }
    if (id === selected) return;
    // Warm the destination wall while the stamp is peeling/landing.
    photosFor(id).forEach(photo => { const image = new Image(); image.src = photo.image; void image.decode().catch(() => {}); });
    setMapPan({ x: 0, y: 0 });
    if (!stampVisible || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { commitPlace(id); return; }
    stampBusy.current = true;
    setStampRendering(false);
    // Keep the committed cover in place throughout preparation and peeling.
    // The destination becomes the DOM cover only after its canvas has landed.
    setStampMotion({ incoming: stampSnapshot(id), outgoing: stampSnapshot(selected), destination: id,
      entrySide: (direction ?? (places.findIndex(place => place.id === id) - places.findIndex(place => place.id === selected))) < 0 ? -1 : 1,
      sequence: ++stampSequence.current });
  }
  function moveCover(direction: number) {
    if (shown.length) selectPlace(shown[(Math.max(activeIndex, 0) + direction + shown.length) % shown.length].id, direction);
  }
  function beginStampDrag(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || shown.length < 2 || stampBusy.current) return;
    const width = stampStageRef.current?.querySelector<HTMLElement>('.tr-postcard.is-active')?.offsetWidth ?? 180;
    stampPointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, width, phase: 'pending' };
  }
  function dragStamp(event: PointerEvent<HTMLDivElement>) {
    const gesture = stampPointer.current;
    if (!gesture || gesture.id !== event.pointerId || gesture.phase === 'vertical') return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (gesture.phase === 'pending') {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
      suppressClickUntil.current = Date.now() + 600;
      if (Math.abs(dy) > Math.abs(dx) * 1.1) { gesture.phase = 'vertical'; return; }
      gesture.phase = 'horizontal';
      gesture.control = { progress: 0, direction: dx < 0 ? -1 : 1, release: 'held' };
      const next = shown[(Math.max(activeIndex, 0) + (dx < 0 ? 1 : -1) + shown.length) % shown.length];
      gesture.destination = next.id;
      event.currentTarget.setPointerCapture(event.pointerId);
      setStampDragging(true); setStampRendering(false);
      const snapshot = (id: string) => ({ image: coverFor(id).image, title: places.find(place => place.id === id)!.name, count: photosFor(id).length });
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        stampBusy.current = true;
        setStampMotion({ incoming: snapshot(next.id), outgoing: snapshot(selected), sequence: ++stampSequence.current, drag: gesture.control, destination: next.id });
      } else { gesture.control.failed = true; setStampMotion(null); }
    }
    if (gesture.control) gesture.control.progress = Math.max(0, Math.min(1, dx * gesture.control.direction / (gesture.width * .95)));
    suppressClickUntil.current = Date.now() + 600;
    event.preventDefault();
  }
  function endStampDrag(event: PointerEvent<HTMLDivElement>, canceled = false) {
    const gesture = stampPointer.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    stampPointer.current = null; setStampDragging(false);
    if (gesture.control) {
      const commit = !canceled && gesture.control.progress >= .38;
      gesture.control.release = commit ? 'commit' : 'cancel';
      if (commit && gesture.destination) prepareGallery(gesture.destination);
      suppressClickUntil.current = Date.now() + 600;
      if (gesture.control.failed && commit && gesture.destination) selectPlace(gesture.destination);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function completeStampMotion(motion: StampMotion) {
    stampBusy.current = false;
    setStampRendering(false); setStampMotion(null);
    if (motion.drag?.release === 'held') motion.drag.failed = true;
    if ((!motion.drag || motion.drag.release === 'commit') && motion.destination) {
      setSelected(motion.destination);
      setGallerySelected(motion.destination);
      setGalleryPending(current => current === motion.destination ? null : current);
    }
  }
  function toggle(kind: 'photo' | 'place', id: string) {
    const setter = kind === 'photo' ? setPhotoStars : setPlaceStars;
    setter(values => values.includes(id) ? values.filter(value => value !== id) : [...values, id]);
  }
  function openPhoto(photo: Photo, trigger: HTMLButtonElement) {
    if (Date.now() < suppressClickUntil.current) return;
    viewerTriggerRef.current = trigger; setToolbarPanel(null); setViewerEditing(false); setViewerId(photo.id);
  }
  function closeViewer() {
    setViewerId(null); setViewerEditing(false);
    requestAnimationFrame(() => {
      const trigger = viewerTriggerRef.current;
      const fallback = surfaceRef.current?.querySelector<HTMLButtonElement>('.tr-film-photo') ?? surfaceRef.current?.querySelector<HTMLButtonElement>('.tr-cover-select');
      (trigger?.isConnected ? trigger : fallback)?.focus({ preventScroll: true });
    });
  }
  function movePhoto(direction: number) {
    const next = viewerPhotos[viewerIndex + direction];
    if (next) { setViewerId(next.id); setAnnouncement(photoTitle(next)); }
  }
  function deletePhoto() {
    if (!viewerPhoto) return;
    setDeletedIds(ids => [...ids, viewerPhoto.id]); setLastDeleted(viewerPhoto.id); setAnnouncement('Photo removed. Undo is available.');
    const next = viewerPhotos[viewerIndex + 1] ?? viewerPhotos[viewerIndex - 1];
    if (next) setViewerId(next.id); else closeViewer();
  }
  function undoDelete() {
    if (!lastDeleted) return;
    const restored = photos.find(photo => photo.id === lastDeleted);
    setDeletedIds(ids => ids.filter(id => id !== lastDeleted)); setLastDeleted(null);
    if (restored) { setOnlyHighlights(false); selectPlace(restored.placeId); }
  }
  function beginInfoEdit() {
    if (!viewerPhoto) return;
    setInfoDraft({ title: photoTitle(viewerPhoto), caption: photoCaption(viewerPhoto), note: notes[viewerPhoto.id] ?? '' }); setViewerEditing(true);
  }
  function saveInfo() {
    if (!viewerPhoto) return;
    setPhotoInfo(value => ({ ...value, [viewerPhoto.id]: { title: infoDraft.title.trim() || viewerPhoto.title, caption: infoDraft.caption.trim() } }));
    setNotes(value => ({ ...value, [viewerPhoto.id]: infoDraft.note.trim() })); setViewerEditing(false); setAnnouncement('Photo information saved');
  }
  function viewerKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (viewerEditing) setViewerEditing(false); else closeViewer(); }
    if (!viewerEditing && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) { event.preventDefault(); movePhoto(event.key === 'ArrowRight' ? 1 : -1); }
    if (event.key === 'Tab') {
      const controls = Array.from(viewerRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea') ?? []);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === viewerRef.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }

  return <div style={{ '--tr-base': baseColor } as CSSProperties} className={`trip-recall-demo${fullPage ? ' tr-full' : ' tr-gallery'}`}>
    <div ref={surfaceRef} className={`tr-surface${collapsed ? ' is-collapsed' : ''}`} style={{ '--tr-header-opacity': headerOpacity } as CSSProperties} aria-label="Travel memories interactive preview">
      <div ref={compactLocationRef} className="tr-compact-location" inert={headerOpacity < .95 || !!viewerId} aria-hidden={headerOpacity < .95}><button type="button" aria-label="Expand map and albums" onClick={() => scrollToPhotos(0)}><span className="tr-compact-location-copy"><span className="tr-compact-location-parent">PORTUGAL / LISBON</span><strong>{active.name}</strong></span><ChevronDown size={17}/></button></div>
      <div ref={scrollRef} className="tr-scroll" inert={!!viewerId} onScroll={updateScrollProgress}>
      <section ref={mapRef} inert={!!viewerId || collapsed} className="tr-map" aria-label="Abstract Lisbon memory map">
        <div className="tr-map-light" aria-hidden="true"/>
        <div className="tr-map-scene" style={{ transform: `translate(${mapPan.x}px, ${mapPan.y}px) scale(${mapZoom})` }} onPointerDown={event => {
          if ((event.target as Element).closest('button') || event.pointerType === 'touch') return;
          mapGesture.current = { x: event.clientX, y: event.clientY, startX: mapPan.x, startY: mapPan.y, zoom: mapZoom }; event.currentTarget.setPointerCapture(event.pointerId);
        }} onPointerMove={event => { const start = mapGesture.current; if (!start || event.pointerType === 'touch') return; const limit = 60 * Math.max(0, mapZoom - 1); setMapPan({ x: Math.max(-limit, Math.min(limit, start.startX + event.clientX - start.x)), y: Math.max(-limit, Math.min(limit, start.startY + event.clientY - start.y)) }); }} onPointerUp={() => { mapGesture.current = null; }} onPointerCancel={() => { mapGesture.current = null; }} onTouchStart={event => {
          const first = event.touches[0], second = event.touches[1]; mapGesture.current = { x: first.clientX, y: first.clientY, startX: mapPan.x, startY: mapPan.y, zoom: mapZoom, distance: second ? Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY) : undefined };
        }} onTouchMove={event => {
          const start = mapGesture.current; if (!start) return; const first = event.touches[0], second = event.touches[1];
          if (second || Math.hypot(first.clientX - start.x, first.clientY - start.y) > 8) suppressClickUntil.current = Date.now() + 400;
          if (second && start.distance) setMapZoom(Math.max(.8, Math.min(1.8, start.zoom * Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY) / start.distance)));
          else { const limit = 60 * Math.max(0, mapZoom - 1); setMapPan({ x: Math.max(-limit, Math.min(limit, start.startX + first.clientX - start.x)), y: Math.max(-limit, Math.min(limit, start.startY + first.clientY - start.y)) }); }
        }} onTouchEnd={() => { mapGesture.current = null; }}>
          <svg className="tr-map-context" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
            <path fill="white" opacity=".1" d="M-10 263C71 236 114 281 197 260S320 211 410 224V310H-10Z"/>
            <g className="tr-map-blocks"><path d="M28 91L68 82 78 113 40 128ZM85 76L123 62 138 100 97 111ZM234 41L274 55 259 92 223 81ZM289 64L323 79 306 116 275 102ZM320 125L366 118 378 154 332 168ZM46 183L88 193 74 219 31 212ZM249 186L280 169 299 196 268 213Z"/></g>
            <g className="tr-map-streets">
              <path d="M-12 61L78 42 153 24 205 43 258 23 317 48 410 31M-12 102L76 78 144 54 202 72 258 54 320 81 410 70M-10 147L88 119 149 96 205 111 260 87 321 117 410 109M-10 188L88 164 149 141 208 151 267 127 322 155 410 147M-10 226L88 210 148 185 204 194 270 164 326 191 410 184M13 0L34 76 58 145 33 224M67 0L86 72 110 151 86 255M116 0L143 64 164 131 147 261M173 0L177 65 195 115 184 170 205 262M226 0L218 63 231 116 219 181 250 246M284 0L273 60 291 105 279 158 308 230M344 0L331 64 350 126 342 173 371 222M391 0L373 67 393 138"/>
            </g>
            <g className="tr-map-avenues"><path d="M-10 171C67 159 117 135 161 121S249 93 300 74 372 41 411 49M8 263C92 234 122 257 194 243S310 202 410 211M105 -10C107 54 180 73 194 126S237 181 257 238"/></g>
          </svg>
          <svg className="tr-map-art" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
            <defs><path ref={firstRouteLegRef} d={firstRouteLeg}/><linearGradient id={routeGradientId} x1="75" y1="250" x2="295" y2="115" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="white" stopOpacity=".12"/><stop offset=".24" stopColor="white" stopOpacity=".92"/><stop offset=".48" stopColor="white" stopOpacity=".96"/><stop offset=".67" stopColor="white" stopOpacity=".22"/><stop offset=".84" stopColor="white" stopOpacity=".88"/><stop offset="1" stopColor="white" stopOpacity=".18"/></linearGradient></defs>
            <path className="tr-route-shadow" d={routePath}/><path className="tr-route" stroke={`url(#${routeGradientId})`} d={routePath}/>
            <path ref={routeProgressRef} className="tr-route-progress" d={journeyPath} pathLength={1000} style={{ strokeDashoffset: routeOffset }}/>
          </svg>
          {places.map(place => <button key={place.id} type="button" className={`tr-pin${mapSelected === place.id ? ' is-selected' : ''}`} style={{ left: `${place.x}%`, top: `${place.y}%` }} onClick={() => { if (Date.now() < suppressClickUntil.current) return; setOnlyHighlights(false); selectPlace(place.id); }} aria-label={`View ${place.name} memories`} aria-pressed={mapSelected === place.id}><span className="tr-pin-dot"/><span className="tr-pin-label">{place.name}</span></button>)}
        </div>
        <a className="tr-back" href="/#trip-recall" aria-label="Back to Move Club"><ArrowLeft size={18}/></a>
        <div className="tr-map-tools">
          <button ref={searchButtonRef} type="button" aria-label="Search memories" aria-expanded={toolbarPanel === 'search'} aria-controls={`${toolbarId}-panel`} onClick={() => setToolbarPanel(value => value === 'search' ? null : 'search')}><Search size={17}/></button>
          <button ref={colorButtonRef} type="button" className="tr-color-trigger" aria-label="Collection color" aria-expanded={toolbarPanel === 'color'} aria-controls={`${toolbarId}-panel`} onClick={() => setToolbarPanel(value => value === 'color' ? null : 'color')}><span style={{ background: baseColor }}/></button>
        </div>
        <div className="tr-map-heading"><h1>Lisbon</h1><p>14–16 May · Lisbon, Portugal</p></div>
        <div className="tr-map-bottom"><button ref={moodButtonRef} type="button" className="tr-mood-trigger" aria-label={`Mood for ${active.name}: ${mood.label}`} aria-expanded={toolbarPanel === 'mood'} onClick={() => setToolbarPanel(value => value === 'mood' ? null : 'mood')}><MoodIcon size={17}/><span>{mood.label}</span></button><div className="tr-map-zoom" role="group" aria-label="Map zoom"><button type="button" aria-label="Zoom out map" disabled={mapZoom <= .8} onClick={() => zoomMap(mapZoom - .2)}><ZoomOut size={17}/></button><button type="button" aria-label="Zoom in map" disabled={mapZoom >= 1.8} onClick={() => zoomMap(mapZoom + .2)}><ZoomIn size={17}/></button></div></div>
      </section>
      <section inert={!!viewerId} className="tr-album" aria-label="Place albums and photos">
        <div className="tr-album-heading" inert={collapsed}><h2>Your memories</h2><div className="tr-filter" role="group" aria-label="Memory filter"><button type="button" aria-pressed={!onlyHighlights} onClick={() => setOnlyHighlights(false)}>All</button><button type="button" aria-pressed={onlyHighlights} onClick={() => setOnlyHighlights(true)}><Star size={13}/> Highlights</button></div></div>
        <div ref={stampStageRef} className={`tr-cover-stage${stampRendering ? ' is-rendering-stamp' : ''}${stampDragging ? ' is-dragging-stamp' : ''}${stampMotion && !stampMotion.outgoing ? ' has-pending-stamp' : ''}`} inert={collapsed} aria-roledescription="carousel" aria-label="Place albums" onPointerDown={beginStampDrag} onPointerMove={dragStamp} onPointerUp={event => endStampDrag(event)} onPointerCancel={event => endStampDrag(event, true)} onLostPointerCapture={event => { if (event.target === event.currentTarget) endStampDrag(event, true); }} onDragStart={event => event.preventDefault()} onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); moveCover(event.key === 'ArrowRight' ? 1 : -1); } }}>
          {shown.map((place, index) => {
            let offset = index - Math.max(0, activeIndex);
            if (shown.length === 3) { if (offset > 1) offset = -1; if (offset < -1) offset = 1; }
            const contents = photosFor(place.id);
            const cover = coverFor(place.id);
            return <article key={place.id} className={`tr-postcard${place.id === selected ? ' is-active' : ''}${stampRendering && (stampMotion?.outgoing?.title === place.name || stampMotion?.incoming.title === place.name) && place.id !== selected ? ' is-parked' : ''}`} style={{ '--tr-offset': offset, '--tr-rotation': `${offset === 0 ? -3 : offset * 8}deg` } as CSSProperties}>
              <button type="button" className="tr-cover-select" aria-label={`${place.name} album, ${contents.length} photos`} aria-pressed={place.id === selected} onClick={() => { if (Date.now() < suppressClickUntil.current) return; if (place.id === selected) scrollToPhotos(photoScrollOffset()); else selectPlace(place.id, offset); }}>
                <img src={cover.image} alt={cover.alt} draggable={false}/><span className="tr-cover-caption"><strong>{place.name}</strong><span><Images size={12}/>{contents.length} photos</span></span>
              </button>
            </article>;
          })}
          {stampMotion && <TripSticker key={stampMotion.sequence} motion={stampMotion} onReady={() => setStampRendering(true)} onComplete={() => completeStampMotion(stampMotion)}/>}
          {!shown.length && <div className="tr-empty"><Star size={22}/><button type="button" onClick={() => setOnlyHighlights(false)}>See all albums</button></div>}
        </div>
        <button type="button" className="tr-photos-heading" inert={collapsed} aria-label="Focus on photos" onClick={() => scrollToPhotos(photoScrollOffset())}><strong>Gallery</strong></button>
        <div ref={stripRef} className={`tr-gallery-wall${galleryPending ? ' is-refreshing' : ''}`} inert={!!galleryPending} aria-busy={!!galleryPending}>
        <div className="tr-photo-strip" aria-label={`${active.name} photos`} onTouchStart={event => { stripTouch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }} onTouchMove={event => { if (stripTouch.current && Math.hypot(event.touches[0].clientX - stripTouch.current.x, event.touches[0].clientY - stripTouch.current.y) > 10) suppressClickUntil.current = Date.now() + 400; }}>
          {albumPhotos.map(photo => <button key={photo.id} type="button" className="tr-film-photo" aria-label={`Open ${photoTitle(photo)} photo`} aria-haspopup="dialog" onClick={event => openPhoto(photo, event.currentTarget)}><img src={photo.image} alt={photo.alt}/>{photoStars.includes(photo.id) && <span className="tr-film-star"><Star size={13} fill="currentColor"/></span>}</button>)}
          {!albumPhotos.length && <div className="tr-empty"><button type="button" onClick={() => { setOnlyHighlights(false); setDeletedIds(ids => ids.filter(id => photos.find(photo => photo.id === id)?.placeId !== gallerySelected)); }}>Restore album photos</button></div>}
        </div>
        </div>
      </section>
      </div>
      {toolbarPanel && <div ref={panelRef} id={`${toolbarId}-panel`} className="tr-toolbar-panel" role="dialog" aria-label={toolbarPanel === 'color' ? 'Collection color settings' : toolbarPanel === 'mood' ? 'Choose a mood' : 'Search memories'}>
        <div className="tr-panel-heading"><h2>{toolbarPanel === 'color' ? 'Collection color' : toolbarPanel === 'mood' ? 'How did it feel?' : 'Find a memory'}</h2><button type="button" aria-label="Close settings" onClick={() => { setToolbarPanel(null); panelTrigger.current?.focus({ preventScroll: true }); }}><X size={16}/></button></div>
        {toolbarPanel === 'mood' ? <div className="tr-mood-options" role="group" aria-label="Place mood">{moods.map(item => { const Icon = item.icon; return <button key={item.id} type="button" aria-pressed={mood.id === item.id} onClick={event => { setPlaceMoods(values => ({ ...values, [gallerySelected]: item.id })); setToolbarPanel(null); if (event.detail === 0) requestAnimationFrame(() => moodButtonRef.current?.focus({ preventScroll: true })); }}><Icon size={22}/><span>{item.label}</span></button>; })}</div> : toolbarPanel === 'color' ? <>
          <div className="tr-color-options" role="group" aria-label="Choose a base color">{collectionColors.map(color => <button key={color.value} type="button" aria-label={color.name} aria-pressed={baseColor.toLowerCase() === color.value} onClick={() => setBaseColor(color.value)}><span style={{ background: color.value }}>{baseColor.toLowerCase() === color.value && <Check size={16}/>}</span><small>{color.name}</small></button>)}</div>
          <label className="tr-custom-color"><span>Custom color</span><input type="color" aria-label="Custom collection color" value={baseColor} onChange={event => setBaseColor(event.target.value)}/></label>
        </> : <>
          <label className="tr-search-field"><Search size={16}/><input ref={searchInputRef} aria-label="Search places or photos" placeholder="Places, photos, memories…" value={searchQuery} onChange={event => setSearchQuery(event.target.value)}/></label>
          <div className="tr-search-results">{places.filter(place => `${place.name} ${place.name} ${place.local} ${photos.filter(photo => photo.placeId === place.id).map(photo => photoTitle(photo)).join(' ')}`.toLocaleLowerCase().includes(searchQuery.trim().toLocaleLowerCase())).map(place => <div key={place.id} className="tr-search-result"><button type="button" onClick={() => { setOnlyHighlights(false); selectPlace(place.id); setToolbarPanel(null); requestAnimationFrame(() => surfaceRef.current?.querySelector<HTMLButtonElement>('.tr-postcard.is-active .tr-cover-select')?.focus({ preventScroll: true })); }}><img src={place.image} alt=""/><span><strong>{place.name}</strong><small>{place.name}</small></span></button><button type="button" aria-label={`Highlight ${place.name} place`} aria-pressed={placeStars.includes(place.id)} onClick={() => toggle('place', place.id)}><Star size={16} fill={placeStars.includes(place.id) ? 'currentColor' : 'none'}/></button></div>)}
          {!places.some(place => `${place.name} ${place.name} ${place.local} ${photos.filter(photo => photo.placeId === place.id).map(photo => photoTitle(photo)).join(' ')}`.toLocaleLowerCase().includes(searchQuery.trim().toLocaleLowerCase())) && <p className="tr-search-empty">No memories found. Try another name.</p>}</div>
        </>}
      </div>}
      {lastDeleted && !viewerId && <div className="tr-delete-toast" role="status"><span>Photo removed</span><button type="button" onClick={undoDelete}><Undo2 size={14}/> Undo</button><button type="button" aria-label="Dismiss deletion message" onClick={() => setLastDeleted(null)}><X size={14}/></button></div>}
      {viewerPhoto && <div className="tr-viewer-backdrop" onClick={event => { if (event.target === event.currentTarget) closeViewer(); }}>
        <div ref={viewerRef} tabIndex={-1} className={`tr-viewer${viewerEditing ? ' is-editing' : ''}`} role="dialog" aria-modal="true" aria-label={`${photoTitle(viewerPhoto)} photo details`} onKeyDown={viewerKeys}>
          {viewerEditing ? <><div className="tr-viewer-header"><h2>Edit photo</h2></div><form className="tr-info-form" onSubmit={event => { event.preventDefault(); saveInfo(); }}>
            <div className="tr-info-fields"><label>Title<input value={infoDraft.title} onChange={event => setInfoDraft(value => ({ ...value, title: event.target.value }))} maxLength={48} required/></label><label>Location<input value={infoDraft.caption} onChange={event => setInfoDraft(value => ({ ...value, caption: event.target.value }))} maxLength={90}/></label><label>Memory<textarea value={infoDraft.note} onChange={event => setInfoDraft(value => ({ ...value, note: event.target.value }))} maxLength={160}/></label></div>
            <div className="tr-info-actions"><button type="button" onClick={() => setViewerEditing(false)}>Cancel</button><button type="submit"><Check size={16}/> Save changes</button></div>
          </form></> : <>
            <TripPhotoFilm photos={viewerPhotos} selectedId={viewerPhoto.id} onSelect={id => { setViewerId(id); const photo = viewerPhotos.find(item => item.id === id); if (photo) setAnnouncement(photoTitle(photo)); }} onDismiss={closeViewer}/>
            <div className="tr-viewer-actions" aria-label="Photo actions"><button type="button" aria-label="Delete photo" onClick={deletePhoto}><Trash2 size={20}/></button><button type="button" aria-label="Highlight photo" aria-pressed={photoStars.includes(viewerPhoto.id)} onClick={() => toggle('photo',viewerPhoto.id)}><Star size={20} fill={photoStars.includes(viewerPhoto.id) ? 'currentColor' : 'none'}/></button><button type="button" aria-label="Edit info" onClick={beginInfoEdit}><PencilLine size={20}/></button></div>
          </>}
        </div>
      </div>}
    </div>
    <span className="tr-sr-only" role="status">{announcement}</span>
  </div>;
}
