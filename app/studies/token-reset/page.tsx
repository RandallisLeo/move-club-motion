import type { Metadata } from 'next';
import Link from 'next/link';
import { TokenReset } from '@/components/demos/token-reset';
import { MoveClubWordmark } from '@/components/move-club-wordmark';
export const metadata: Metadata = { title: 'Token / Reset — Move Club' };
export default function TokenResetPage() {
  return (
    <main id="top" className="token-reset-preview">
      <header className="site-header">
        <MoveClubWordmark />
        <nav className="header-nav" aria-label="Preview navigation">
          <Link href="/#token-reset">All studies</Link>
          <span>Local preview</span>
        </nav>
      </header>
      <div className="token-reset-preview-intro">
        <div>
          <span>035 / INTERACTION STUDY</span>
          <h1>Token / Reset</h1>
        </div>
        <p>
          One click. A small escape.
          <br />A fresh start, five letters later.
        </p>
      </div>
      <div className="token-reset-preview-canvas">
        <TokenReset replayKey={0} />
      </div>
    </main>
  );
}
