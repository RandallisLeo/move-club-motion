import * as THREE from 'three';

type Point = { x: number; y: number };

function simplify(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points;
  const a = points[0], b = points[points.length - 1], dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
  let furthest = 0, distance = tolerance * tolerance;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i], t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0;
    const d = (p.x - a.x - t * dx) ** 2 + (p.y - a.y - t * dy) ** 2;
    if (d > distance) { distance = d; furthest = i; }
  }
  return furthest ? [...simplify(points.slice(0, furthest + 1), tolerance).slice(0, -1), ...simplify(points.slice(furthest), tolerance)] : [a, b];
}
function contains(polygon: Point[], p: Point) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
function curve<T extends THREE.Path>(path: T, points: Point[]): T {
  path.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length; i++) {
    const a = points[(i + points.length - 1) % points.length], b = points[i], c = points[(i + 1) % points.length], d = points[(i + 2) % points.length];
    // Closed cubic segments round the silhouette without retaining pixel corners.
    path.bezierCurveTo(b.x + (c.x - a.x) / 6, b.y + (c.y - a.y) / 6, c.x - (d.x - b.x) / 6, c.y - (d.y - b.y) / 6, c.x, c.y);
  }
  path.closePath(); return path;
}

/** Subpixel marching squares preserves holes and disconnected emoji details. */
export function emojiSilhouetteShapes(pixels: Uint8ClampedArray, size: number, threshold = 96): THREE.Shape[] {
  const vertices = new Map<string, Point>(), neighbors = new Map<string, Set<string>>();
  const alpha = (x: number, y: number) => pixels[(y * size + x) * 4 + 3];
  const join = (a: string, b: string) => { if (!neighbors.has(a)) neighbors.set(a, new Set()); if (!neighbors.has(b)) neighbors.set(b, new Set()); neighbors.get(a)!.add(b); neighbors.get(b)!.add(a); };
  for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {
    const values = [alpha(x, y), alpha(x + 1, y), alpha(x + 1, y + 1), alpha(x, y + 1)];
    const mask = values.reduce((bits, value, i) => bits | (value >= threshold ? 1 << i : 0), 0);
    if (mask === 0 || mask === 15) continue;
    const center = values.reduce((sum, v) => sum + v, 0) / 4 >= threshold;
    const cases: Record<number, number[][]> = { 1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]], 5: center ? [[0, 1], [2, 3]] : [[3, 0], [1, 2]], 6: [[0, 2]], 7: [[3, 2]], 8: [[2, 3]], 9: [[2, 0]], 10: center ? [[3, 0], [1, 2]] : [[0, 1], [2, 3]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[3, 0]] };
    const endpoint = (edge: number) => {
      const definitions = [[x, y, x + 1, y, `h:${x}:${y}`], [x + 1, y, x + 1, y + 1, `v:${x + 1}:${y}`], [x, y + 1, x + 1, y + 1, `h:${x}:${y + 1}`], [x, y, x, y + 1, `v:${x}:${y}`]] as const;
      const [ax, ay, bx, by, key] = definitions[edge];
      if (!vertices.has(key)) { const av = alpha(ax, ay), bv = alpha(bx, by), t = (threshold - av) / (bv - av); vertices.set(key, { x: (ax + (bx - ax) * t + .5) / size - .5, y: .5 - (ay + (by - ay) * t + .5) / size }); }
      return key;
    };
    for (const [a, b] of cases[mask]) join(endpoint(a), endpoint(b));
  }
  const contours: { points: Point[]; area: number; parent: number; depth: number }[] = [];
  while (neighbors.size) {
    const start = neighbors.keys().next().value!; let current = start, closed = false;
    const points: Point[] = [];
    for (let guard = 0; guard < size * size * 4; guard++) {
      points.push(vertices.get(current)!);
      const next = neighbors.get(current)?.values().next().value;
      if (!next) { neighbors.delete(current); break; }
      neighbors.get(current)!.delete(next); neighbors.get(next)!.delete(current);
      if (!neighbors.get(current)!.size) neighbors.delete(current);
      if (!neighbors.get(next)!.size) neighbors.delete(next);
      current = next;
      if (current === start) { closed = true; break; }
    }
    if (!closed || points.length < 4) continue;
    // A small binomial filter removes the sampling ripple before fitting curves.
    const smoothed = points.map((p, i) => { const a = points[(i + points.length - 1) % points.length], b = points[(i + 1) % points.length]; return { x: (a.x + 2 * p.x + b.x) / 4, y: (a.y + 2 * p.y + b.y) / 4 }; });
    let split = 1, max = 0;
    smoothed.forEach((p, i) => { const d = (p.x - smoothed[0].x) ** 2 + (p.y - smoothed[0].y) ** 2; if (d > max) { max = d; split = i; } });
    const outline = [...simplify(smoothed.slice(0, split + 1), .0012).slice(0, -1), ...simplify([...smoothed.slice(split), smoothed[0]], .0012).slice(0, -1)];
    const area = Math.abs(outline.reduce((sum, p, i) => { const q = outline[(i + 1) % outline.length]; return sum + p.x * q.y - q.x * p.y; }, 0) / 2);
    if (area > .00004) contours.push({ points: outline, area, parent: -1, depth: 0 });
  }
  contours.sort((a, b) => b.area - a.area);
  contours.forEach((contour, i) => { for (let j = i - 1; j >= 0; j--) if (contains(contours[j].points, contour.points[0])) { contour.parent = j; contour.depth = contours[j].depth + 1; break; } });
  const shapes = new Map<number, THREE.Shape>();
  contours.forEach((contour, i) => { if (contour.depth % 2 === 0) shapes.set(i, curve(new THREE.Shape(), contour.points)); else shapes.get(contour.parent)?.holes.push(curve(new THREE.Path(), contour.points)); });
  return [...shapes.values()];
}
