import { ArrowUpRight, Code2 } from 'lucide-react';
import { MotionGallery } from '@/components/motion-gallery';

const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL ?? 'https://github.com/RandallisLeo/move-club-motion';

export default function Home() {
  return (
    <main className="min-h-screen" id="top">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Move Club home">
          <span className="wordmark-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" role="presentation">
              <circle className="move-club-ring" cx="16" cy="16" r="10" />
              <circle className="move-club-dot" cx="23.7" cy="9.6" r="2.8" />
            </svg>
          </span>
          <span>Move Club</span>
          <span className="byline">By Randall D</span>
        </a>
        <nav className="header-nav" aria-label="Primary navigation">
          <a href="#work">Playground</a>
          <a href="#about">About</a>
          <a className="github-link" href={githubUrl} target="_blank" rel="noreferrer">
            <Code2 size={15} /> GitHub <ArrowUpRight size={14} />
          </a>
        </nav>
      </header>

      <MotionGallery githubUrl={githubUrl} />

      <section className="about-section" id="about">
        <div className="about-label"><span>02</span> About the playground</div>
        <div className="about-copy">
          <p>Part sketchbook, part reference shelf, part open invitation.</p>
          <p className="about-small">Alongside my own experiments, I’ll share playful interactions found in the wild and the designers worth knowing. If something sparks an idea, take it further and share it forward.</p>
        </div>
      </section>

      <section className="source-section" id="source">
        <div>
          <span className="source-kicker">Play · Remix · Share</span>
          <h2>Try it.<br />Twist it.<br />Pass it on.</h2>
        </div>
        <div className="source-actions">
          <p>Everything I make here is open. Clone the full playground, borrow one small interaction, or bring your own experiment to the mix.</p>
          <a className="source-button" href={githubUrl} target="_blank" rel="noreferrer">View on GitHub <ArrowUpRight size={18} /></a>
        </div>
      </section>

      <footer>
        <span>Move Club © 2026</span>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}
