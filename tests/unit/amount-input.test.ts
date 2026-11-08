import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatAmountInput, normalizeAmountInput, editAmountInput, amountCaret } from '../../src/features/transactions/amount-input.ts';

test('formats whole rupiah dynamically without Number conversion', () => {
  for (const [raw, display] of [['', ''], ['2', 'Rp 2'], ['2600000', 'Rp 2,600,000'], ['0', 'Rp 0'],
    ['-1000', 'Rp -1,000'], ['9007199254740993', 'Rp 9,007,199,254,740,993']]) {
    assert.equal(formatAmountInput(raw), display);
    assert.equal(normalizeAmountInput(display), raw);
  }
  assert.equal(normalizeAmountInput('2.600.000'), '2600000');
  assert.equal(normalizeAmountInput('2,600,000'), '2600000');
  for (const invalid of ['1.5', '2,60', 'Rp 2,60', '1e6', 'Rp -', '2,600.000']) {
    assert.equal(normalizeAmountInput(invalid), invalid);
    assert.equal(formatAmountInput(invalid), invalid);
  }
});
test('caret tracks the edited digit rather than jumping to the end', () => {
  assert.equal(amountCaret('Rp 2,600,000', 2), 6);
  assert.equal(amountCaret('Rp 2,600,000', 7), 12);
  assert.equal(amountCaret('', 0), 0);
});

test('typing regroups separators while malformed pasted amounts stay invalid', () => {
  assert.equal(editAmountInput('Rp 2,6000', 'insertText'), '26000');
  assert.equal(editAmountInput('Rp 2,60', 'deleteContentBackward'), '260');
  assert.equal(editAmountInput('Rp 2,60', 'insertFromPaste'), 'Rp 2,60');
  assert.equal(editAmountInput('Rp 2.6', 'insertText'), 'Rp 2.6');
  assert.equal(editAmountInput('Rp ', 'deleteContentBackward'), '');
});
