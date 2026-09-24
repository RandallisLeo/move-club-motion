export type TextMotion = 'none' | 'big' | 'small' | 'shake' | 'nod' | 'explode' | 'ripple' | 'bloom' | 'jitter';
export type TextRange = { start: number; end: number };
export type Formats = { bold: boolean; italic: boolean; underline: boolean; strike: boolean };
export type TextRun = TextRange & { effect?: TextMotion; formats?: Partial<Formats> };

export function styleAt(offset: number, effect: TextMotion, formats: Formats, runs: TextRun[]) {
  let result = { effect, formats: { ...formats } };
  for (const run of runs) {
    if (offset >= run.start && offset < run.end) result = {
      effect: run.effect ?? result.effect,
      formats: { ...result.formats, ...run.formats },
    };
  }
  return result;
}

// Keep styles anchored when text before, inside, or after a styled passage changes.
export function rebaseRuns(before: string, after: string, runs: TextRun[]): TextRun[] {
  if (before === after) return runs;
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let oldEnd = before.length;
  let newEnd = after.length;
  while (oldEnd > start && newEnd > start && before[oldEnd - 1] === after[newEnd - 1]) { oldEnd--; newEnd--; }
  const delta = newEnd - oldEnd;
  return runs.flatMap((run) => {
    if (run.end <= start) return [run];
    if (run.start >= oldEnd) return [{ ...run, start: run.start + delta, end: run.end + delta }];
    if (run.start >= start && run.end <= oldEnd) return [];
    const next = { ...run, start: Math.min(run.start, start), end: run.end > oldEnd ? run.end + delta : start };
    return next.end > next.start ? [next] : [];
  });
}
