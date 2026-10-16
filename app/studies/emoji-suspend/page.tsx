import type { Metadata } from 'next';
import Link from 'next/link';
import { MoveClubWordmark } from '@/components/move-club-wordmark';
import { EmojiSuspend } from '@/components/demos/emoji-suspend';
import { experiments } from '@/data/experiments';
import './preview.css';

export const metadata: Metadata = { title: 'Emoji / Suspend — Local preview / Move Club' };
const study = experiments.find((item) => item.slug === 'emoji-suspend')!;
export default function EmojiSuspendPage() {
  return <main className="emoji-suspend-review">
    <header className="site-header"><MoveClubWordmark /><nav className="header-nav" aria-label="Preview navigation"><Link href="/">All studies</Link><span>Local preview</span></nav></header>
    <div className="emoji-suspend-review-layout">
      <div className="emoji-suspend-review-copy"><span className="emoji-suspend-review-kicker">042 / MATERIAL STUDY</span><h1>{study.title}</h1><p>{study.description}</p><div className="emoji-suspend-review-legend"><span>01 — Jelly</span><span>02 — Gel</span><span>03 — Glass</span><span>04 — Ice</span></div><Link href="/#emoji-suspend">View in collection</Link></div>
      <div className="emoji-suspend-review-stage"><EmojiSuspend replayKey={0} /></div>
    </div>
  </main>;
}
