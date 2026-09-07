export type PromptKey = 'natural' | 'concise' | 'service' | 'caption' | 'explain';
type Revision = Exclude<PromptKey, 'explain'> | 'grammar';

export type WritingIntent = {
  natural: boolean;
  concise: boolean;
  service: boolean;
  caption: boolean;
  explained: boolean;
  lastAction: Revision;
  explanationFor?: Revision;
  history: PromptKey[];
};

export type Suggestion = { key: PromptKey; label: string };

export const SAMPLE = 'Fix the grammar: The cafe were busy, but the barista still makes me feel welcome.';
const FIRST_REPLY = 'The café was busy, but the barista still made me feel welcome.';
const CATALOG: Record<PromptKey, Suggestion> = {
  natural: { key: 'natural', label: 'More natural' },
  concise: { key: 'concise', label: 'More concise' },
  service: { key: 'service', label: 'Focus on service' },
  caption: { key: 'caption', label: 'Make a caption' },
  explain: { key: 'explain', label: 'Explain changes' },
};

export function freshIntent(): WritingIntent {
  return { natural: false, concise: false, service: false, caption: false, explained: false, lastAction: 'grammar', history: [] };
}

export function applyIntent(intent: WritingIntent, key: PromptKey): WritingIntent {
  const next = { ...intent, history: [...intent.history, key] };
  if (key === 'explain') {
    next.explained = true;
    next.explanationFor = intent.lastAction;
  } else {
    next[key] = true;
    next.lastAction = key;
  }
  return next;
}

// Authored café scenario: cumulative intent is simulated locally, without an AI request.
export function replyFor(intent: WritingIntent): string {
  if (intent.explained) {
    const notes: Record<Revision, string> = {
      grammar: '“Were” becomes “was” to agree with “café.” “Makes” becomes “made” to keep the sentence in the past tense.',
      natural: '“Feel welcome” becomes “feel right at home,” giving the sentence a more conversational tone. The meaning stays the same.',
      concise: 'I removed repeated context and kept the contrast between a busy café and a warm welcome. The phrasing keeps the tone of your previous version.',
      service: 'I brought the barista’s welcome into focus, keeping the busy café as context.',
      caption: 'I reshaped the line into a short caption, keeping the café and the feeling of being welcomed.',
    };
    return notes[intent.explanationFor ?? 'grammar'];
  }
  if (intent.caption) {
    if (intent.service) return intent.natural ? 'A warm welcome, even at a busy café.' : 'Welcoming service, even at a busy café.';
    return intent.natural ? 'Busy café. Felt right at home.' : 'Busy café. Warm welcome.';
  }
  if (intent.concise) {
    if (intent.service) return intent.natural ? 'A warm welcome, even at a busy café.' : 'Welcoming service, even at a busy café.';
    return intent.natural ? 'Busy café, but I felt right at home.' : 'Busy café, welcoming barista.';
  }
  if (intent.service) return intent.natural ? 'The barista made me feel right at home, even with the café so busy.' : 'The barista made me feel welcome, even with the café so busy.';
  return intent.natural ? 'The café was busy, but the barista still made me feel right at home.' : FIRST_REPLY;
}

export function suggestPrompts(intent: WritingIntent, answer: string): Suggestion[] {
  if (intent.explained) return [];
  const keys: PromptKey[] = [];
  const words = answer.trim().split(/\s+/).length;
  if (!intent.natural && !intent.concise && !intent.caption && words > 10) keys.push('natural');
  if (!intent.concise && !intent.caption && words > 10) keys.push('concise');
  if (!intent.service && /café|barista|welcome|home/i.test(answer)) keys.push('service');
  if (!intent.caption && (intent.natural || intent.concise || intent.service)) keys.push('caption');
  keys.push('explain');
  return keys
    .filter((key) => !intent.history.includes(key) && replyFor(applyIntent(intent, key)) !== answer)
    .slice(0, 4)
    .map((key) => CATALOG[key]);
}
