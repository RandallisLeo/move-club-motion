import type { Metadata } from 'next';
import Link from 'next/link';
import { MoveClubWordmark } from '@/components/move-club-wordmark';
import { DiscsRelayReview } from './review';

export const metadata: Metadata = { title: 'Discs / Relay — Local preview / Move Club' };
export default function DiscsRelayPage() {
  return <main><header className="site-header"><MoveClubWordmark href="/"/><nav className="header-nav" aria-label="Preview navigation"><span>Local preview</span><Link href="/#discs-relay">All studies</Link></nav></header><DiscsRelayReview/></main>;
}
