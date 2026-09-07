import assert from 'node:assert/strict';
import test from 'node:test';
import { applyIntent, freshIntent, replyFor, suggestPrompts } from '../components/demos/prompt-refine-intent.ts';

test('shortening preserves the natural voice established by the previous request', () => {
  const natural = applyIntent(freshIntent(), 'natural');
  const concise = applyIntent(natural, 'concise');
  assert.match(replyFor(concise), /right at home/);
  assert.ok(replyFor(concise).split(' ').length < replyFor(natural).split(' ').length);
  assert.ok(!suggestPrompts(concise, replyFor(concise)).some(({ key }) => key === 'natural' || key === 'concise'));
  assert.deepEqual(natural.history, ['natural'], 'later revisions do not mutate earlier versions');
});

test('every reachable suggestion changes the result and does not repeat a completed request', () => {
  function visit(intent) {
    const answer = replyFor(intent);
    const suggestions = suggestPrompts(intent, answer);
    assert.ok(suggestions.length <= 4);
    for (const { key } of suggestions) {
      assert.ok(!intent.history.includes(key));
      const next = applyIntent(intent, key);
      assert.notEqual(replyFor(next), answer);
      visit(next);
    }
  }
  visit(freshIntent());
});

test('explanations address the latest change and do not manufacture another refinement', () => {
  const intent = applyIntent(applyIntent(freshIntent(), 'natural'), 'explain');
  assert.match(replyFor(intent), /right at home/);
  assert.doesNotMatch(replyFor(intent), /Were/);
  assert.deepEqual(suggestPrompts(intent, replyFor(intent)), []);
  assert.equal(freshIntent().history.length, 0, 'replaying restores the initial context');
});
