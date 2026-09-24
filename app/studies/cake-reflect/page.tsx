import Link from 'next/link';
import { CakeReflect } from '@/components/demos/cake-reflect';
import { MoveClubWordmark } from '@/components/move-club-wordmark';
import { GitHubMark } from '@/components/icons/github-mark';
import { experiments } from '@/data/experiments';

const study = experiments.find((item) => item.slug === 'cake-reflect')!;

export default function CakeReflectPage() {
  return (
    <main>
      <header className="site-header">
        <MoveClubWordmark href="/#top" />
        <nav className="header-nav" aria-label="Primary navigation">
          <Link href="/#cake-reflect">Playground</Link>
          <a
            className="github-link"
            href="https://github.com/RandallisLeo/move-club-motion"
            target="_blank"
            rel="noreferrer"
          >
            <GitHubMark size={15} /> GitHub
          </a>
        </nav>
      </header>
      <div className="cake-reflect-page">
        <div className="cake-reflect-page-intro">
          <div>
            <p className="cake-reflect-page-kicker">
              {study.index} / {study.category.toUpperCase()}
            </p>
            <h1>{study.title}</h1>
          </div>
          <p>{study.description}</p>
        </div>
        <CakeReflect replayKey={0} expanded />
        <div className="cake-reflect-page-bottom">
          <Link href="/#cake-reflect">Back to the collection</Link>
          <span>{study.tags}</span>
        </div>
      </div>
    </main>
  );
}
