import Link from 'next/link';
import { experiments } from '@/data/experiments';
import { MoveClubWordmark } from '@/components/move-club-wordmark';
import { WatchReview } from '@/components/demos/watch-review';

export default function WatchFacesPage() {
  const study = experiments.find(item => item.slug === 'watch-faces');
  return (
    <main>
      <header className="site-header">
        <MoveClubWordmark href="/#top" />
        <nav className="header-nav" aria-label="Primary navigation">
          <Link href="/#watch-faces">Collection</Link>
          <span>Watch collection / {study?.index}</span>
        </nav>
      </header>
      <div className="watch-review-page">
        <div className="watch-review-intro">
          <div>
            <span className="watch-review-kicker">
              Four little reasons to keep moving
            </span>
            <h1>A little time. A little motion.</h1>
          </div>
          <p>
            A spare fifteen minutes. Another sip of water. The next turn home.
            Four everyday moments, made a little more alive.
          </p>
        </div>
        <WatchReview />
      </div>
    </main>
  );
}
