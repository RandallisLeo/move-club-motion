import type { Metadata } from 'next';
import Link from 'next/link';
import { MotionGallery } from '@/components/motion-gallery';
import { MoveClubWordmark } from '@/components/move-club-wordmark';

export const metadata: Metadata = { title: 'Cards & Glass — Local preview / Move Club' };
export default function MaterialReviewPage() {
  return <main id="top"><header className="site-header"><MoveClubWordmark/><nav className="header-nav" aria-label="Preview navigation"><span>Local preview</span><Link href="/">All studies</Link></nav></header><MotionGallery studySlugs={['cards-sphere','glass-unfold']}/></main>;
}
