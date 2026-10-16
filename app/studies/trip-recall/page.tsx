import type { Metadata } from 'next';
import { TripRecall } from '@/components/demos/trip-recall';

export const metadata: Metadata = { title: 'Roam — A Lisbon travel journal / Move Club', description: 'Three days. A thousand little things. An interactive travel memory concept.' };
export default function TripRecallPage() { return <main><TripRecall fullPage /></main>; }
