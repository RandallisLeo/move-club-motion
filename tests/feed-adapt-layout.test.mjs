import assert from 'node:assert/strict';
import test from 'node:test';
import { fitFeedViewport, layoutFeedColumns, planFeedColumns } from '../components/demos/feed-adapt-layout.ts';

// Regression fixture: greedy placement put seven cards on the right and five
// on the left, leaving a 262px hole at the end of the 390px mobile feed.
const items = [.76, 1.05, .84, .72, 1.1, .78, 1.14, .82, .9, .74, 1.14, .88].map((ratio) => ({ ratio }));

await test('preset transitions stay inside the canvas at every intermediate size', () => {
  const presets = [{ width: 390, height: 780 }, { width: 768, height: 900 }, { width: 1440, height: 900 }];
  for (const canvas of [{ width: 365, height: 557 }, { width: 1048, height: 660 }, { width: 350, height: 364 }]) {
    for (const from of presets) for (const to of presets) {
      for (let frame = 0; frame <= 120; frame++) {
        const progress = frame / 120;
        const size = { width: from.width + (to.width - from.width) * progress, height: from.height + (to.height - from.height) * progress };
        const fitted = fitFeedViewport(size, canvas);
        assert.ok(fitted.width <= canvas.width - 88 + .001, 'screen cannot swell outside its horizontal fit area');
        assert.ok(fitted.height <= canvas.height - 88 + .001, 'screen cannot swell outside its vertical fit area');
        assert.ok(Math.abs(fitted.width / fitted.height - size.width / size.height) < .001, 'screen keeps its aspect ratio');
      }
    }
  }
  // Both presets fill the same 277px width. Their old independent size/scale
  // animations produced a ~305px screen halfway through this transition.
  const midway = fitFeedViewport({ width: 1104, height: 900 }, { width: 365, height: 557 });
  assert.equal(midway.width, 277);
});

function checkGeometry(data, columns, width, crop, gap) {
  const assignment = planFeedColumns(data, columns, crop, gap);
  const layout = layoutFeedColumns(data, assignment, columns, width, crop, gap);
  const previousBottom = Array(columns).fill(-gap);
  assert.equal(layout.positions.length, data.length);
  assignment.slice(0, columns).forEach((column, index) => assert.equal(column, index, 'first row remains in source order'));
  layout.positions.forEach((position, index) => {
    const column = assignment[index];
    assert.ok(column >= 0 && column < columns);
    assert.equal(position.x, column * (width + gap));
    assert.ok(position.y >= previousBottom[column] + gap - .001, 'cards cannot overlap within a column');
    const originalHeight = width / (data[index].ratio + crop);
    assert.ok(position.imageHeight >= originalHeight * .8 - .001, 'crop reduction stays bounded');
    assert.ok(position.imageHeight <= originalHeight * 1.2 + .001, 'crop enlargement stays bounded');
    previousBottom[column] = position.y + position.imageHeight + 76;
    assert.ok(previousBottom[column] <= layout.height + .001, 'scroll extent contains all card metadata');
  });
  return layout;
}

await test('mobile feed closes the reported right-only tail', () => {
  const layout = checkGeometry(items, 2, 173, 0, 12);
  assert.ok(Math.max(...layout.bottoms) - Math.min(...layout.bottoms) < 1);
  assert.ok(Math.abs(layout.positions[10].y - layout.positions[11].y) < 80, 'last two cards occupy the same tail region');
});

await test('the entire supported width range has no large terminal hole or overlapping cards', () => {
  for (let viewport = 320; viewport <= 1600; viewport++) {
    const columns = viewport < 640 ? 2 : viewport < 900 ? 3 : viewport < 1200 ? 4 : viewport < 1480 ? 5 : 6;
    const crop = viewport < 640 ? 0 : viewport < 1024 ? .13 : .27;
    const gap = viewport < 640 ? 12 : 18;
    const left = viewport < 640 ? 16 : viewport < 1024 ? 26 : 220;
    const right = viewport < 640 ? 16 : 26;
    const width = (viewport - left - right - gap * (columns - 1)) / columns;
    const layout = checkGeometry(items, columns, width, crop, gap);
    assert.ok(Math.max(...layout.bottoms) - Math.min(...layout.bottoms) < 24, `tail at viewport ${viewport}`);
  }
});

await test('filtered, sparse, and empty feeds keep valid geometry without filling missing content', () => {
  for (let columns = 2; columns <= 6; columns++) {
    for (let length = 0; length <= items.length; length++) {
      checkGeometry(items.slice(0, length), columns, 180, .13, 18);
    }
  }
  const sparse = checkGeometry(items.slice(0, 1), 5, 180, .27, 18);
  assert.equal(sparse.positions[0].x, 0);
  assert.equal(sparse.positions[0].imageHeight, 180 / (items[0].ratio + .27));
});

await test('column assignment is deterministic and retained while the card width changes', () => {
  const assignment = planFeedColumns(items, 3, .13, 18);
  assert.deepEqual(planFeedColumns(items, 3, .13, 18), assignment);
  for (let width = 184; width <= 270; width++) {
    const layout = layoutFeedColumns(items, assignment, 3, width, .13, 18);
    layout.positions.forEach((position, index) => assert.equal(position.x / (width + 18), assignment[index]));
  }
});
