import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectCases, recordCase } from '../scripts/tasks.mjs';

const cases = [{ id: 'first' }, { id: 'second' }, { id: 'third' }];

test('case selection preserves requested order and rejects silently skipped tasks', () => {
  assert.deepEqual(selectCases(cases, 'third,first'), [{ id: 'third' }, { id: 'first' }]);
  for (const ids of ['missing', 'first,missing', '', 'first,first']) assert.throws(() => selectCases(cases, ids), /case/i);
});

test('case limits require an explicit nonnegative count within the selected tasks', () => {
  assert.deepEqual(selectCases(cases, undefined, '0'), []);
  assert.deepEqual(selectCases(cases, undefined, '1'), [{ id: 'first' }]);
  for (const limit of ['NaN', '-1', '1.5', '', '4']) assert.throws(() => selectCases(cases, undefined, limit), /limit/i);
});

test('a timed-out case retains its identity and failed outcome in the report', async () => {
  const entry = { id: 'second' };
  await assert.rejects(() => recordCase(entry, async () => { throw new Error('Timeout waiting for generation'); }), /Timeout/);
  assert.equal(entry.id, 'second');
  assert.equal(entry.outcome, 'failed');
  assert.match(entry.error, /Timeout/);
  const complete = { id: 'third' };
  await recordCase(complete, async () => ({ text: 'A completed answer.' }));
  assert.equal(complete.outcome, 'completed');
  assert.equal(complete.text, 'A completed answer.');
});
