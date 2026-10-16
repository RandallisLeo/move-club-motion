'use client';

import { RotateCcw } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { startTransition, useEffect, useRef, useState } from 'react';
import { experiments, type Experiment } from '@/data/experiments';
import { ActionReveal } from '@/components/demos/action-reveal';
import { ButtonsLift } from '@/components/demos/buttons-lift';
import { CardFlight } from '@/components/demos/card-flight';
import { FluidFolderHover } from '@/components/demos/fluid-folder-hover';
import { FolderPreview } from '@/components/demos/folder-preview';
import { MenuReveal } from '@/components/demos/menu-reveal';
import { PhotoSelection } from '@/components/demos/photo-selection';
import { RollingCounter } from '@/components/demos/rolling-counter';
import { SpringReflow } from '@/components/demos/spring-reflow';
import { StatusWave } from '@/components/demos/status-wave';
import { FeedAdapt } from '@/components/demos/feed-adapt';
import { PromptRefine } from '@/components/demos/prompt-refine';
import { LiquidSwipe } from '@/components/demos/liquid-swipe';
import { FoldFocus } from '@/components/demos/fold-focus';
import { ObjectOrbit } from '@/components/demos/object-orbit';
import { CardMaterial } from '@/components/demos/card-material';
import { SignalCrossing } from '@/components/demos/signal-crossing';
import { CakeReflect } from '@/components/demos/cake-reflect';
import { SwitchBounce } from '@/components/demos/switch-bounce';
import { MediaGenerate } from '@/components/demos/media-generate';
import { SandFlow } from '@/components/demos/sand-flow';
import { LightDrift } from '@/components/demos/light-drift';
import { WatchFaces } from '@/components/demos/watch-faces';
import { CanvasComment } from '@/components/demos/canvas-comment';
import { SignalFocus } from '@/components/demos/signal-focus';
import { TripRecall } from '@/components/demos/trip-recall';
import { MessageMood } from '@/components/demos/message-mood';
import { MossGrow } from '@/components/demos/moss-grow';
import { DataTide } from '@/components/demos/data-tide';
import { ImageEmerge } from '@/components/demos/image-emerge';
import { FanWord } from '@/components/demos/fan-word';
import { GlassUnfold } from '@/components/demos/glass-unfold';
import { TypeInsert } from '@/components/demos/type-insert';
import { SceneAdvance } from '@/components/demos/scene-advance';
import { TokenReset } from '@/components/demos/token-reset';
import { ProjectOrbit } from '@/components/demos/project-orbit';
import { ContextBloom } from '@/components/demos/context-bloom';
import { AppsConnect } from '@/components/demos/apps-connect';
import { TabsTurn } from '@/components/demos/tabs-turn';
import { ProcessCheck } from '@/components/demos/process-check';
import { CardsSphere } from '@/components/demos/cards-sphere';
import { MenuMaterials } from '@/components/demos/menu-materials';
import { EmojiSuspend } from '@/components/demos/emoji-suspend';
import { CardsDrift } from '@/components/demos/cards-drift';
import { DiscsRelay } from '@/components/demos/discs-relay';
import './portrait-study.css';
import { StudyCodeContact } from '@/components/study-code-contact';

const filters = ['All', 'Interaction', 'Feedback', 'Transition', 'Space'] as const;
type Filter = (typeof filters)[number];
type GalleryMode = 'Mix' | 'Components' | 'Scenarios';

function Demo({ item, replayKey }: { item: Experiment; replayKey: number }) {
  if (item.slug === 'discs-relay') return <DiscsRelay replayKey={replayKey} />;
  if (item.slug === 'cards-drift') return <CardsDrift replayKey={replayKey} />;
  if (item.slug === 'menu-materials') return <MenuMaterials replayKey={replayKey} />;
  if (item.slug === 'emoji-suspend') return <EmojiSuspend replayKey={replayKey} />;
  if (item.slug === 'project-orbit') return <ProjectOrbit replayKey={replayKey} />;
  if (item.slug === 'context-bloom') return <ContextBloom replayKey={replayKey} />;
  if (item.slug === 'apps-connect') return <AppsConnect replayKey={replayKey} />;
  if (item.slug === 'tabs-turn') return <TabsTurn replayKey={replayKey} />;
  if (item.slug === 'process-check') return <ProcessCheck replayKey={replayKey} />;
  if (item.slug === 'cards-sphere') return <CardsSphere replayKey={replayKey} />;
  if (item.slug === 'token-reset') return <TokenReset replayKey={replayKey} />;
  if (item.slug === 'moss-grow') return <MossGrow replayKey={replayKey} />;
  if (item.slug === 'data-tide') return <DataTide replayKey={replayKey} />;
  if (item.slug === 'image-emerge') return <ImageEmerge replayKey={replayKey} />;
  if (item.slug === 'fan-word') return <FanWord replayKey={replayKey} />;
  if (item.slug === 'glass-unfold') return <GlassUnfold replayKey={replayKey} />;
  if (item.slug === 'type-insert') return <TypeInsert replayKey={replayKey} />;
  if (item.slug === 'scene-advance') return <SceneAdvance replayKey={replayKey} />;
  if (item.slug === 'trip-recall') return <TripRecall replayKey={replayKey} />;
  if (item.slug === 'message-mood') return <MessageMood replayKey={replayKey} />;
  if (item.slug === 'signal-focus') return <SignalFocus replayKey={replayKey} />;
  if (item.slug === 'canvas-comment') return <CanvasComment replayKey={replayKey} />;
  if (item.slug === 'watch-faces') return <WatchFaces replayKey={replayKey} />;
  if (item.slug === 'light-drift') return <LightDrift replayKey={replayKey} />;
  if (item.slug === 'sand-flow') return <SandFlow replayKey={replayKey} />;
  if (item.slug === 'media-generate') return <MediaGenerate replayKey={replayKey} />;
  if (item.slug === 'switch-bounce') return <SwitchBounce replayKey={replayKey} />;
  if (item.slug === 'cake-reflect') return <CakeReflect replayKey={replayKey} />;
  if (item.slug === 'signal-crossing') return <SignalCrossing replayKey={replayKey} />;
  if (item.slug === 'card-material') return <CardMaterial replayKey={replayKey} />;
  if (item.slug === 'fold-focus') return <FoldFocus replayKey={replayKey} />;
  if (item.slug === 'object-orbit') return <ObjectOrbit replayKey={replayKey} />;
  if (item.slug === 'liquid-swipe') return <LiquidSwipe replayKey={replayKey} />;
  if (item.slug === 'prompt-refine') return <PromptRefine replayKey={replayKey} />;
  if (item.slug === 'feed-adapt') return <FeedAdapt replayKey={replayKey} />;
  if (item.slug === 'photo-selection') return <PhotoSelection replayKey={replayKey} />;
  if (item.slug === 'action-reveal') return <ActionReveal replayKey={replayKey} />;
  if (item.slug === 'rolling-counter') return <RollingCounter replayKey={replayKey} />;
  if (item.slug === 'fluid-folder-hover') return <FluidFolderHover replayKey={replayKey} />;
  if (item.slug === 'card-flight') return <CardFlight replayKey={replayKey} />;
  if (item.slug === 'folder-preview') return <FolderPreview replayKey={replayKey} />;
  if (item.slug === 'spring-reflow') return <SpringReflow replayKey={replayKey} />;
  if (item.slug === 'buttons-lift') return <ButtonsLift replayKey={replayKey} />;
  if (item.slug === 'status-wave') return <StatusWave replayKey={replayKey} />;
  if (item.slug === 'menu-reveal') return <MenuReveal replayKey={replayKey} />;
  return null;
}

export function MotionGallery({ studySlugs }: { studySlugs?: readonly string[] } = {}) {
  const [mode, setMode] = useState<GalleryMode>('Mix');
  const [contentMode, setContentMode] = useState<GalleryMode>('Mix');
  const [filter, setFilter] = useState<Filter>('All');
  const [replayKeys, setReplayKeys] = useState<Record<string, number>>({});
  const contentModeTimer = useRef<number | null>(null);
  const collection = studySlugs ? experiments.filter((item) => studySlugs.includes(item.slug)) : experiments;
  const componentExperiments = collection.filter((item) => item.format !== 'scenario');
  const scenarioExperiments = collection.filter((item) => item.format === 'scenario');
  const visible = contentMode === 'Scenarios'
    ? scenarioExperiments
    : (contentMode === 'Components' ? componentExperiments : collection)
        .filter((item) => filter === 'All' || item.category === filter);

  function selectMode(nextMode: GalleryMode) {
    setMode(nextMode);
    if (contentModeTimer.current !== null) window.clearTimeout(contentModeTimer.current);
    contentModeTimer.current = window.setTimeout(() => {
      startTransition(() => setContentMode(nextMode));
      contentModeTimer.current = null;
    }, 300);
  }

  useEffect(() => {
    function syncModeFromHash() {
      const slug = window.location.hash.slice(1);
      const item = experiments.find((experiment) => experiment.slug === slug);
      if (item?.format === 'scenario') {
        if (contentModeTimer.current !== null) window.clearTimeout(contentModeTimer.current);
        setMode('Scenarios');
        setContentMode('Scenarios');
      }
    }
    syncModeFromHash();
    window.addEventListener('hashchange', syncModeFromHash);
    return () => {
      window.removeEventListener('hashchange', syncModeFromHash);
      if (contentModeTimer.current !== null) window.clearTimeout(contentModeTimer.current);
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <section className="work-section" id="work" aria-label="Motion experiments">
        <div className="gallery-mode-header">
          <h2>Motion studies</h2>
          <div className="gallery-mode-tabs" data-mode={mode.toLowerCase()} role="tablist" aria-label="Study format">
            <span className="gallery-mode-active" aria-hidden="true" />
            <button type="button" role="tab" aria-selected={mode === 'Mix'} className={`gallery-mode-tab${mode === 'Mix' ? ' is-active' : ''}`} onClick={() => selectMode('Mix')}>
              <span className="gallery-mode-label">Mix</span>
              <strong>{String(collection.length).padStart(2, '0')}</strong>
            </button>
            <button type="button" role="tab" aria-selected={mode === 'Components'} className={`gallery-mode-tab${mode === 'Components' ? ' is-active' : ''}`} onClick={() => selectMode('Components')}>
              <span className="gallery-mode-label">Components</span>
              <strong>{String(componentExperiments.length).padStart(2, '0')}</strong>
            </button>
            <button type="button" role="tab" aria-selected={mode === 'Scenarios'} className={`gallery-mode-tab${mode === 'Scenarios' ? ' is-active' : ''}`} onClick={() => selectMode('Scenarios')}>
              <span className="gallery-mode-label">Scenarios</span>
              <strong>{String(scenarioExperiments.length).padStart(2, '0')}</strong>
            </button>
          </div>
        </div>

        {contentMode !== 'Scenarios' ? (
          <div className="filter-row" aria-label={`Filter ${contentMode.toLowerCase()} studies`}>
            {filters.map((item) => (
              <button
                key={item}
                type="button"
                className={filter === item ? 'filter-button is-active' : 'filter-button'}
                onClick={() => setFilter(item)}
                aria-pressed={filter === item}
              >
                {item}
              </button>
            ))}
            <span className="filter-status" aria-live="polite">
              {String(visible.length).padStart(3, '0')} collected · ongoing
            </span>
          </div>
        ) : (
          <div className="scenario-filter-row">
            <span>Scene-based interaction studies</span>
            <span className="filter-status" aria-live="polite">{String(visible.length).padStart(3, '0')} collected · ongoing</span>
          </div>
        )}

        <motion.div className="project-grid" layout>
          <AnimatePresence mode="popLayout">
            {visible.map((item) => {
              const replayKey = replayKeys[item.slug] ?? 0;
              return (
                <motion.article
                  layout
                  key={item.slug}
                  id={item.slug}
                  className={`project-card${item.slug === 'discs-relay' ? ' discs-relay-gallery-card' : ''}${item.slug === 'project-orbit' ? ' project-orbit-card' : ''}${item.slug === 'tabs-turn' ? ' tabs-turn-card' : ''}${item.slug === 'cards-sphere' ? ' cards-sphere-card-shell' : ''}${item.slug === 'token-reset' ? ' token-reset-card' : ''}${item.slug === 'fan-word' ? ' fan-word-card' : ''}${item.slug === 'type-insert' ? ' type-insert-card' : ''}${item.layout === 'portrait' ? ' portrait-study-card' : ''}${item.slug === 'message-mood' ? ' message-mood-card' : ''}${item.slug === 'signal-focus' ? ' signal-focus-card' : ''}${item.slug === 'canvas-comment' ? ' canvas-comment-card' : ''}${item.slug === 'watch-faces' ? ' watch-faces-card' : ''}${item.slug === 'light-drift' ? ' light-drift-card' : ''}${item.slug === 'sand-flow' ? ' color-flow-gallery-card' : ''}${item.slug === 'media-generate' ? ' media-generate-card' : ''}${item.slug === 'cake-reflect' ? ' cake-reflect-card' : ''}${item.slug === 'feed-adapt' ? ' feed-adapt-card' : ''}${item.slug === 'prompt-refine' ? ' prompt-refine-card' : ''}${item.slug === 'fold-focus' ? ' fold-focus-card' : ''}${item.slug === 'object-orbit' ? ' object-orbit-card' : ''}${item.slug === 'card-material' ? ' card-material-card' : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="project-meta">
                    <div>
                      <span className="project-index">{item.index}</span>
                      <h3>{item.title}</h3>
                    </div>
                    <button
                      className="icon-button"
                      onClick={() => setReplayKeys((keys) => ({ ...keys, [item.slug]: replayKey + 1 }))}
                      aria-label={`Replay ${item.title}`}
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>

                  <div className={`demo-stage demo-stage-${item.tone}${item.layout === 'portrait' ? ' portrait-study-stage' : ''}${item.slug === 'canvas-comment' ? ' canvas-comment-stage' : ''}${item.slug === 'feed-adapt' ? ' feed-adapt-stage' : ''}${item.slug === 'prompt-refine' ? ' prompt-refine-stage' : ''}`}>
                    {item.layout === 'portrait' ? (
                      <div className="portrait-study-viewport"><Demo key={replayKey} item={item} replayKey={replayKey} /></div>
                    ) : <Demo key={replayKey} item={item} replayKey={replayKey} />}
                  </div>

                  <div className="project-description">
                    <p>{item.description}</p>
                    {item.format !== 'scenario' && <StudyCodeContact study={item} />}
                  </div>
                  <div className="project-footer">
                    <span>Motion / React</span>
                    <span>{item.tags}</span>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </section>
    </MotionConfig>
  );
}
