import { redirect } from 'next/navigation';

// Keep old local preview links working; this study lives directly in the gallery.
export default function MessageMoodPage() {
  redirect('/#message-mood');
}
