import assert from 'node:assert/strict';
import test from 'node:test';
import { styleAt, rebaseRuns } from '../components/demos/message-mood-model.ts';
const formats = { bold: false, italic: false, underline: false, strike: false };

test('independent selections retain their own motion and formatting through serialization', () => {
  const runs = JSON.parse(JSON.stringify([
    { start: 0, end: 3, effect: 'big', formats: { bold: true } },
    { start: 12, end: 15, effect: 'jitter' },
    { start: 0, end: 3, formats: { underline: true } },
  ]));
  assert.deepEqual(styleAt(1, 'nod', formats, runs), { effect: 'big', formats: { ...formats, bold: true, underline: true } });
  assert.equal(styleAt(6, 'nod', formats, runs).effect, 'nod');
  assert.equal(styleAt(13, 'nod', formats, runs).effect, 'jitter');
  assert.equal(styleAt(13, 'nod', formats, runs).formats.bold, false);
});
test('inserting before a selected word keeps the effect on that word', () => {
  const runs = rebaseRuns('my day', 'my lovely day', [{start:3,end:6,effect:'big'}]);
  assert.deepEqual(runs, [{start:10,end:13,effect:'big'}]);
});
test('inserting within a selected passage extends it; deleting it removes its style', () => {
  const runs = [{start:0,end:5,effect:'ripple'}];
  assert.deepEqual(rebaseRuns('hello there','heyyllo there',runs), [{start:0,end:7,effect:'ripple'}]);
  assert.deepEqual(rebaseRuns('hello there',' there',runs), []);
});
test('emoji UTF-16 offsets remain anchored across edits', () => {
  assert.deepEqual(rebaseRuns('hi 🫶🏽','hey hi 🫶🏽',[{start:3,end:7,effect:'bloom'}]), [{start:7,end:11,effect:'bloom'}]);
});
