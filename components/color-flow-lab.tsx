'use client';
import Link from 'next/link';
import { MoveClubWordmark } from './move-club-wordmark';
import { ColorFlowStudio } from './demos/color-flow-studio';
export function ColorFlowLab({ initial = 'sand-flow' }: { initial?: string }) {
  return (
    <main>
      <header className="site-header">
        <MoveClubWordmark href="/#top" />
        <nav className="header-nav" aria-label="Primary navigation"><Link href="/#sand-flow">Playground</Link></nav>
      </header>
      <div className="color-flow-page">
        <div className="color-flow-page-heading"><h1>Color in motion</h1><p>FIVE MATERIALS · ONE CARD</p></div>
        <ColorFlowStudio initial={initial} replayKey={0} expanded />
        <div className="color-flow-page-footer"><Link href="/#sand-flow">Back to the collection</Link><span>Hover to tilt · Press to feel</span></div>
      </div>
    </main>
  );
}
