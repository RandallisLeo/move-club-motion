type FeedItem = { ratio: number };
type ViewportSize = { width: number; height: number };

/** Fit the current animated size, so the screen and its handles share one box. */
export function fitFeedViewport(size: ViewportSize, canvas: ViewportSize) {
  const scale = Math.min(1, Math.max(100, canvas.width - 88) / size.width, Math.max(100, canvas.height - 88) / size.height);
  return { width: size.width * scale, height: size.height * scale, scale };
}

// Includes the title, author, and breathing room below the metadata.
const DETAILS_HEIGHT = 76;
const REFERENCE_WIDTH = 200;
const MAX_CROP_ADJUSTMENT = 0.2;

function spreadScore(heights: number[]) {
  const average = heights.reduce((total, height) => total + height, 0) / heights.length;
  return heights.reduce((total, height) => total + (height - average) ** 2, 0);
}

/** Plan once per column count / crop mode / content set, never per dragged pixel. */
export function planFeedColumns(items: readonly FeedItem[], columns: number, cropOffset: number, gap: number) {
  const heights = items.map((item) => REFERENCE_WIDTH / (item.ratio + cropOffset) + DETAILS_HEIGHT + gap);
  let totals = Array<number>(columns).fill(0);
  const assignments = heights.map((height) => {
    const column = totals.indexOf(Math.min(...totals));
    totals[column] += height;
    return column;
  });

  // The first row stays in source order. Rebalance the remaining finite batch
  // using deterministic moves and swaps, preserving source order within a column.
  for (let pass = 0; pass < items.length * 2; pass++) {
    let bestScore = spreadScore(totals);
    let best: { item: number; other?: number; column: number; totals: number[] } | undefined;
    for (let item = columns; item < items.length; item++) {
      const from = assignments[item];
      for (let column = 0; column < columns; column++) {
        if (column === from) continue;
        const next = [...totals];
        next[from] -= heights[item];
        next[column] += heights[item];
        const score = spreadScore(next);
        if (score < bestScore - 0.01) {
          bestScore = score;
          best = { item, column, totals: next };
        }
      }
      for (let other = item + 1; other < items.length; other++) {
        const column = assignments[other];
        if (column === from) continue;
        const next = [...totals];
        next[from] += heights[other] - heights[item];
        next[column] += heights[item] - heights[other];
        const score = spreadScore(next);
        if (score < bestScore - 0.01) {
          bestScore = score;
          best = { item, other, column, totals: next };
        }
      }
    }
    if (!best) break;
    if (best.other !== undefined) assignments[best.other] = assignments[best.item];
    assignments[best.item] = best.column;
    totals = best.totals;
  }
  return assignments;
}

export function layoutFeedColumns(items: readonly FeedItem[], assignments: readonly number[], columns: number, width: number, cropOffset: number, gap: number) {
  const imageHeights = items.map((item) => width / (item.ratio + cropOffset));
  const counts = Array<number>(columns).fill(0);
  const images = Array<number>(columns).fill(0);
  imageHeights.forEach((height, index) => {
    counts[assignments[index]]++;
    images[assignments[index]] += height;
  });
  const fixed = counts.map((count) => count * DETAILS_HEIGHT + Math.max(0, count - 1) * gap);
  const totals = images.map((height, column) => height + fixed[column]);
  const scales = Array<number>(columns).fill(1);

  // Small, column-wide crop adjustments close the remaining tail. They are
  // bounded: sparse results and unusually tall content never get stretched to
  // manufacture a complete grid. The image itself always uses object-fit: cover.
  if (counts.every((count) => count >= 2)) {
    const minimum = Math.max(...images.map((height, column) => height * (1 - MAX_CROP_ADJUSTMENT) + fixed[column]));
    const maximum = Math.min(...images.map((height, column) => height * (1 + MAX_CROP_ADJUSTMENT) + fixed[column]));
    const average = totals.reduce((sum, height) => sum + height, 0) / columns;
    const target = minimum <= maximum ? Math.max(minimum, Math.min(maximum, average)) : average;
    images.forEach((height, column) => {
      scales[column] = Math.max(1 - MAX_CROP_ADJUSTMENT, Math.min(1 + MAX_CROP_ADJUSTMENT, (target - fixed[column]) / height));
    });
  }

  const tracks = Array<number>(columns).fill(0);
  const positions = imageHeights.map((height, index) => {
    const column = assignments[index];
    const imageHeight = height * scales[column];
    const position = { x: column * (width + gap), y: tracks[column], imageHeight };
    tracks[column] += imageHeight + DETAILS_HEIGHT + gap;
    return position;
  });
  const bottoms = tracks.map((height, column) => counts[column] ? height - gap : 0);
  return { positions, bottoms, height: Math.max(160, ...bottoms) };
}
