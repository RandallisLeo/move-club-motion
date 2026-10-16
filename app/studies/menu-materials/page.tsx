import type { Metadata } from 'next';
import Link from 'next/link';
import { MoveClubWordmark } from '@/components/move-club-wordmark';
import { MenuMaterialReview } from './review';
import './preview.css';

export const metadata: Metadata = {
  title: 'Menu / Material — Local preview / Move Club',
};
export default function MenuMaterialsPage() {
  return (
    <main id="top" className="menu-materials-review">
      <header className="site-header">
        <MoveClubWordmark />
        <nav className="header-nav" aria-label="Preview navigation">
          <Link href="/">All studies</Link>
          <span>Local preview</span>
        </nav>
      </header>
      <MenuMaterialReview />
    </main>
  );
}
