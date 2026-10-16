import type { Metadata } from 'next';
import Link from 'next/link';
import { MoveClubWordmark } from '@/components/move-club-wordmark';
import { CardsDriftReview } from './review';

export const metadata: Metadata = { title: 'Cards / Drift — Local preview / Move Club' };
export default function CardsDriftPage() {
  return <main><header className="site-header"><MoveClubWordmark/><nav className="header-nav" aria-label="Preview navigation"><span>Local preview</span><Link href="/#cards-drift">All studies</Link></nav></header><CardsDriftReview/></main>;
}
