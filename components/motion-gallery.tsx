'use client';

import { ArrowUpRight, RotateCcw } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useState } from 'react';
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

const filters = ['All', 'Interaction', 'Feedback', 'Transition', 'Space'] as const;
type Filter = (typeof filters)[number];

function Demo({ item, replayKey }: { item: Experiment; replayKey: number }) {
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

export function MotionGallery({ githubUrl }: { githubUrl: string }) {
  const [filter, setFilter] = useState<Filter>('All');
  const [replayKeys, setReplayKeys] = useState<Record<string, number>>({});
  const visible = experiments.filter((item) => filter === 'All' || item.category === filter);

  return (
    <MotionConfig reducedMotion="user">
      <section className="work-section" id="work" aria-label="Motion experiments">
        <div className="filter-row" aria-label="Filter experiments">
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

        <motion.div className="project-grid" layout>
          <AnimatePresence mode="popLayout">
            {visible.map((item) => {
              const replayKey = replayKeys[item.slug] ?? 0;
              const sourceHref = `${githubUrl}/blob/main/components/demos/${item.slug}.tsx`;
              return (
                <motion.article
                  layout
                  key={item.slug}
                  id={item.slug}
                  className="project-card"
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

                  <div className={`demo-stage demo-stage-${item.tone}`}>
                    <Demo key={replayKey} item={item} replayKey={replayKey} />
                    <span className="stage-caption">{item.category} motion study</span>
                  </div>

                  <div className="project-description">
                    <p>{item.description}</p>
                    <a href={sourceHref} target="_blank" rel="noreferrer" aria-label={`View source for ${item.title}`}>
                      Code <ArrowUpRight size={14} />
                    </a>
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
