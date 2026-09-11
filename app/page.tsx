import { GitHubMark } from '@/components/icons/github-mark';
import { MotionGallery } from '@/components/motion-gallery';
import { MoveClubWordmark } from '@/components/move-club-wordmark';

const fallbackGithubUrl = 'https://github.com/RandallisLeo/move-club-motion';
const configuredGithubUrl = process.env.NEXT_PUBLIC_GITHUB_URL?.trim();
const githubUrl = configuredGithubUrl?.startsWith('https://github.com/')
  ? configuredGithubUrl.replace(/\/$/, '')
  : fallbackGithubUrl;

export default function Home() {
  return (
    <main className="min-h-screen" id="top">
      <header className="site-header">
        <MoveClubWordmark />
        <nav className="header-nav" aria-label="Primary navigation">
          <a href="#work">Playground</a>
          <a href="#about">About</a>
          <a className="github-link" href={githubUrl} target="_blank" rel="noreferrer">
            <GitHubMark size={15} /> GitHub
          </a>
        </nav>
      </header>

      <MotionGallery githubUrl={githubUrl} />

      <section className="about-section" id="about">
        <div className="about-label"><span>02</span> About the playground</div>
        <div className="about-copy">
          <p>A soft fold. Light moving across glass. I love when a screen feels tangible.</p>
          <div className="about-details">
            <p className="about-small">I’m especially interested in how motion brings out a material’s character: its texture, weight, and response to touch. Move Club is where I turn that curiosity into small experiments you can try for yourself.</p>
            <p className="about-small">I share the thinking, references, and work in progress on X.</p>
            <a className="about-contact" href="https://x.com/ChadRunz" target="_blank" rel="noopener noreferrer" aria-label="Say hello to Randall on X, @ChadRunz">
              Say hello on X
            </a>
          </div>
        </div>
      </section>

      <section className="source-section" id="source">
        <div>
          <span className="source-kicker">Play · Remix · Share</span>
          <h2>Try it.<br />Twist it.<br />Pass it on.</h2>
        </div>
        <div className="source-actions">
          <p>Everything I make here is open. Clone the full playground, borrow one small interaction, or bring your own experiment to the mix.</p>
          <a className="source-button" href={githubUrl} target="_blank" rel="noreferrer"><GitHubMark size={18} /> View on GitHub</a>
        </div>
      </section>

      <footer>
        <span>Move Club © 2026</span>
        <a href="#top">Back to top</a>
      </footer>
    </main>
  );
}
