import type { Metadata } from 'next';
import Link from 'next/link';
import { MotionGallery } from '@/components/motion-gallery';
import { MoveClubWordmark } from '@/components/move-club-wordmark';

export const metadata: Metadata = { title: 'Context / Motion — Local studies / Move Club' };
const studies = ['project-orbit', 'context-bloom', 'apps-connect', 'tabs-turn', 'process-check', 'cards-sphere'];

export default function AgentMotionPage() {
  return <main id="top" className="agent-motion-preview">
    <header className="site-header"><MoveClubWordmark /><nav className="header-nav" aria-label="Preview navigation"><Link href="/">All studies</Link><span>Local preview · 06 studies</span></nav></header>
    <div className="agent-motion-intro"><span>MOVE CLUB / CONTEXT & CONNECTION</span><h1>Context / Motion</h1><p>Explore six studies in attachment, connection, page transitions, progress, and spatial navigation.</p><a href="#work">Explore the studies</a></div>
    <MotionGallery studySlugs={studies} />
    <div className="agent-motion-footer">Six independent studies · A local work in progress</div>
  </main>;
}
