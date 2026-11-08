import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateFinancialForm } from '../../src/features/transactions/validation.ts';

const w = '11111111-1111-4111-8111-111111111111';
const a = '22222222-2222-4222-8222-222222222222';
const b = '33333333-3333-4333-8333-333333333333';
const form = (values: Record<string, string | undefined> = {}) => {
  const f = new FormData();
  for (const [key, value] of Object.entries({ operation: 'transaction', workspace: w, actor: w, op: a, id: b,
    version: '0', account_id: a, amount: '10.000', economic_date: '2026-11-07', ...values })) if (value !== undefined) f.set(key, value);
  return f;
};
test('transaction entry defaults to expense, preserves notes and exact integer money', () => {
  const result = validateFinancialForm(form({ description: 'Lunch' }), '2026-11-07');
  assert.ok(result.ok);
  assert.equal(result.command.name, 'save_transaction');
  if (result.command.name !== 'save_transaction') return;
  assert.deepEqual(result.command.args.p, { id: b, kind: 'expense', amount: '10000', economic_date: '2026-11-07',
    account_id: a, category_id: null, description: 'Lunch' });
});
test('rejects malformed money, future/invalid dates, invalid revisions and transfer destinations', () => {
  for (const values of [{ amount: '0' }, { amount: '1.5' }, { amount: '-1' }, { amount: '1000000000001' },
    { economic_date: '2026-02-30' }, { economic_date: '2026-11-08' }, { version: '1.1' }, { version: '-1' },
    { kind: 'income' }, { kind: 'transfer', destination_account_id: a }, { kind: 'refund' },
    { workspace: 'invalid' }, { op: '' }, { description: 'x'.repeat(2001) }]) {
    assert.equal(validateFinancialForm(form(values), '2026-11-07').ok, false, JSON.stringify(values));
  }
});
test('account openings permit zero and signed whole rupiah; real earlier dates are valid', () => {
  for (const [input, expected] of [['0', '0'], ['-10.000', '-10000'], ['1.000', '1000'], ['Rp -10,000', '-10000'], ['Rp 0', '0']]) {
    const result = validateFinancialForm(form({ operation: 'account', name: 'Cash', kind: 'cash', opening_balance: input, opening_date: '2020-02-29' }), '2026-11-07');
    assert.ok(result.ok);
    if (result.command.name === 'save_financial_record') assert.equal((result.command.args.p as Record<string, unknown>).opening_balance, expected);
  }
  assert.equal(validateFinancialForm(form({ operation: 'account', name: 'Cash', kind: 'cash', opening_balance: '1.5', opening_date: '2026-11-07' }), '2026-11-07').ok, false);
});
test('transfer drops categories; edits carry expected version; void requires reason', () => {
  const result = validateFinancialForm(form({ kind: 'transfer', destination_account_id: b, category_id: a, version: '2' }), '2026-11-07');
  assert.ok(result.ok);
  if (result.command.name === 'save_transaction') {
    assert.equal((result.command.args.p as Record<string, unknown>).destination_account_id, b);
    assert.equal((result.command.args.p as Record<string, unknown>).category_id, undefined);
    assert.equal(result.command.args.expected_version, 2);
  }
  assert.equal(validateFinancialForm(form({ operation: 'void' }), '2026-11-07').ok, false);
  const voided = validateFinancialForm(form({ operation: 'void', version: '1', reason: 'Duplicate' }), '2026-11-07');
  assert.ok(voided.ok); assert.equal(voided.command.name, 'void_transaction');
});

test('editing an attributed shared expense preserves its payer without inventing splits', () => {
  const result = validateFinancialForm(form({ version: '1', paid_by: b }), '2026-11-07');
  assert.ok(result.ok);
  if (result.command.name === 'save_transaction') assert.equal((result.command.args.p as Record<string, unknown>).paid_by, b);
});

test('formatted visible IDR inputs serialize exact integer strings and reject malformed separators', () => {
  const result = validateFinancialForm(form({ amount: 'Rp 2,600,000' }), '2026-11-07');
  assert.ok(result.ok);
  if (result.command.name === 'save_transaction') assert.equal((result.command.args.p as Record<string, unknown>).amount, '2600000');
  for (const amount of ['Rp 2,60', 'Rp 2.60', 'Rp -1', 'Rp 0', 'Rp 1,000,000,000,001']) {
    assert.equal(validateFinancialForm(form({ amount }), '2026-11-07').ok, false);
  }
});
