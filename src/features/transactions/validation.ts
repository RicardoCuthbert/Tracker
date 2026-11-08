import { parseAmount } from '../../lib/prototype.ts';
import { validWorkspaceId } from '../../lib/supabase/finance.ts';
import type { Database } from '../../lib/supabase/database.types.ts';
import { normalizeAmountInput } from './amount-input.ts';

type Functions = Database['public']['Functions'];
export type FinancialCommand = {
  [K in 'save_transaction' | 'save_financial_record' | 'void_transaction']: { name: K; args: Functions[K]['Args'] }
}['save_transaction' | 'save_financial_record' | 'void_transaction'];
export type InputResult = { ok: true; actor: string; workspace: string; command: FinancialCommand }
  | { ok: false; message: string; errors: Record<string, string> };

export function validFinancialDate(value: string, today: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01' || value > today) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === value;
}

export function validateFinancialForm(form: FormData, today: string): InputResult {
  const get = (key: string) => typeof form.get(key) === 'string' ? form.get(key) as string : '';
  const errors: Record<string, string> = {};
  const uuid = (key: string) => { const value = get(key); if (!validWorkspaceId(value)) errors[key] = 'A valid identifier is required.'; return value; };
  const date = (key: string) => { const value = get(key); if (!validFinancialDate(value, today)) errors[key] = 'Enter a valid date, no later than today in Jakarta.'; return value; };
  const name = () => { const value = get('name').trim(); if (!value || value.length > 100) errors.name = 'Enter a name of 1–100 characters.'; return value; };
  const w = uuid('workspace'), actor = uuid('actor'), op = uuid('op'), id = uuid('id');
  const version = get('version');
  if (!/^(0|[1-9][0-9]{0,9})$/.test(version) || Number(version) > 2147483647) errors.version = 'Invalid revision. Reload this record.';
  const expected_version = Number(version);
  const operation = get('operation');
  let command: FinancialCommand;
  if (operation === 'account') {
    const raw = normalizeAmountInput(get('opening_balance'));
    const negative = raw.startsWith('-');
    const unsigned = negative ? raw.slice(1) : raw;
    const amount = unsigned === '0' ? '0' : parseAmount(unsigned);
    if (amount === null) errors.opening_balance = 'Enter whole IDR, between −1 trillion and 1 trillion; zero allowed.';
    const kind = get('kind');
    if (!['cash', 'bank', 'e-wallet', 'savings'].includes(kind)) errors.kind = 'Select an account type.';
    if (expected_version !== 0) errors.version = 'Only new accounts are supported here.';
    command = { name: 'save_financial_record', args: { w, op, entity: 'account', expected_version,
      p: { id, name: name(), kind, opening_date: date('opening_date'), opening_balance: negative && amount !== '0' ? `-${amount}` : amount } } };
  } else if (operation === 'category') {
    const kind = get('kind');
    if (!['income', 'expense'].includes(kind)) errors.kind = 'Select income or expense.';
    if (expected_version !== 0) errors.version = 'Only new categories are supported here.';
    command = { name: 'save_financial_record', args: { w, op, entity: 'category', expected_version, p: { id, name: name(), kind } } };
  } else if (operation === 'void') {
    const reason = get('reason').trim();
    if (!reason || reason.length > 2000) errors.reason = 'Enter a reason of 1–2000 characters.';
    if (expected_version < 1) errors.version = 'Reload this record before voiding.';
    command = { name: 'void_transaction', args: { w, op, item: id, expected_version, reason } };
  } else {
    if (operation !== 'transaction') errors.operation = 'Invalid financial action.';
    const kind = get('kind') || 'expense';
    if (!['income', 'expense', 'transfer'].includes(kind)) errors.kind = 'Select expense, income or transfer.';
    const amount = parseAmount(normalizeAmountInput(get('amount')));
    if (!amount) errors.amount = 'Enter positive whole IDR, at most 1 trillion. Example: Rp 2,600,000.';
    const account_id = uuid('account_id');
    const description = get('description');
    if (description.length > 2000) errors.description = 'Notes must be at most 2000 characters.';
    const p: Record<string, string | null> = { id, kind, amount, economic_date: date('economic_date'), account_id, description };
    if (get('paid_by')) p.paid_by = uuid('paid_by');
    if (kind === 'transfer') {
      p.destination_account_id = uuid('destination_account_id');
      if (p.destination_account_id === account_id) errors.destination_account_id = 'Choose a different destination account.';
    } else {
      p.category_id = get('category_id') || null;
      if (kind === 'income' || p.category_id) uuid('category_id');
    }
    command = { name: 'save_transaction', args: { w, op, p, expected_version } };
  }
  return Object.keys(errors).length ? { ok: false, message: 'Check the highlighted fields.', errors } : { ok: true, actor, workspace: w, command };
}
