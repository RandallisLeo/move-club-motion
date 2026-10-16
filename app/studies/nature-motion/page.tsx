import type { Metadata } from 'next';
import Link from 'next/link';
import { MotionGallery } from '@/components/motion-gallery';
import { MoveClubWordmark } from '@/components/move-club-wordmark';

export const metadata: Metadata = { title: 'Nature / Motion — Local studies / Move Club' };
const studies = ['moss-grow', 'data-tide', 'image-emerge', 'fan-word', 'glass-unfold', 'type-insert', 'scene-advance'];

export default function NatureMotionPage() {
  return <main id="top">
    <header className="site-header nature-review-header"><MoveClubWordmark /><nav className="header-nav" aria-label="Preview navigation"><Link href="/">All studies</Link><span>Local preview · 07 studies</span></nav></header>
    <div className="nature-review-intro"><span>MOVE CLUB / NATURE & RESPONSE</span><h1>A little attention.<br />Something starts to move.</h1><p>一段木头在指针旁长出新绿。一个词给另一种想法腾出位置。把录屏里想停下来多看一眼的细节，变成七个可以亲手试的小组件。</p></div>
    <MotionGallery studySlugs={studies} />
  </main>;
}
