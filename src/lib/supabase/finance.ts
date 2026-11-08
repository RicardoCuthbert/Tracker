import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types.ts';
import { financialError, type FinancialResult } from './errors.ts';

export type Workspace = { id: string; name: string; kind: 'personal' | 'shared'; role?: 'owner' | 'member' };
export type Account = { id: string; name: string; balance: string; reserved: string; shortfall: string; archived: boolean; openingDate: string };
export type Category = { id: string; name: string; kind: 'income' | 'expense'; archived: boolean };
export type Transaction = { id: string; kind: string; amount: string; economicDate: string; description: string; voided: boolean;
  version: number; accountId: string; destinationAccountId: string | null; categoryId: string | null; paidBy: string | null };
export type Report = { income: string; grossExpenses: string; refunds: string; netSpending: string; closingCash: string | null; asOf: string | null;
  categories: { id: string; name: string; spent: string }[] };
export const validWorkspaceId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid response');
  return value as Record<string, unknown>;
}
function text(value: unknown): string { if (typeof value !== 'string') throw new Error('Invalid response'); return value; }
function id(value: unknown): string { const v = text(value); if (!validWorkspaceId(v)) throw new Error('Invalid response'); return v; }
function money(value: unknown): string { const v = text(value); if (!/^-?(0|[1-9][0-9]*)$/.test(v)) throw new Error('Invalid response'); return v; }
function array(value: unknown): unknown[] { if (!Array.isArray(value)) throw new Error('Invalid response'); return value; }
function revision(value: unknown): number {
  const v = text(value);
  if (!/^[1-9][0-9]{0,9}$/.test(v) || Number(v) > 2147483647) throw new Error('Invalid revision');
  return Number(v);
}
function workspace(value: unknown): Workspace {
  const row = object(value);
  if (!['personal', 'shared'].includes(text(row.kind))) throw new Error('Invalid response');
  return { id: id(row.id), name: text(row.name), kind: row.kind as Workspace['kind'] };
}

function decodeWorkspace(w: string, value: unknown) {
  const row = object(value); const info = workspace(row.workspace);
  if (info.id !== w) throw new Error('Invalid response');
  const accounts: Account[] = array(row.accounts).map(value => {
    const a = object(value);
    if (a.workspace_id !== w) throw new Error('Invalid response');
    return { id: id(a.id), name: text(a.name), balance: money(a.balance), reserved: money(a.reserved), shortfall: money(a.shortfall),
      archived: a.archived_at !== null, openingDate: text(a.opening_date) };
  });
  const categories: Category[] = array(row.categories).map(value => {
    const c = object(value);
    if (c.workspace_id !== w || !['income', 'expense'].includes(text(c.kind))) throw new Error('Invalid response');
    return { id: id(c.id), name: text(c.name), kind: c.kind as Category['kind'], archived: c.archived_at !== null };
  });
  return { workspace: info, accounts, categories };
}
function decodeTransactions(w: string, value: unknown): Transaction[] {
  return array(value).map(value => {
    const t = object(value);
    if (t.workspace_id !== w || !['income', 'expense', 'transfer', 'refund', 'correction'].includes(text(t.kind)) ||
      (t.voided_at !== null && typeof t.voided_at !== 'string')) throw new Error('Invalid response');
    const postings = array(t.postings).map(value => {
      const p = object(value);
      if (p.workspace_id !== w || p.transaction_id !== t.id) throw new Error('Invalid response');
      return { accountId: id(p.account_id), amount: BigInt(money(p.amount)) };
    });
    const source = t.kind === 'transfer' ? postings.find(p => p.amount < 0n) : postings[0];
    const destination = t.kind === 'transfer' ? postings.find(p => p.amount > 0n) : null;
    if (!source || postings.length !== (t.kind === 'transfer' ? 2 : 1) || (t.kind === 'transfer' && !destination)) throw new Error('Invalid response');
    return { id: id(t.id), kind: text(t.kind), amount: money(t.amount), economicDate: text(t.economic_date), description: text(t.description), voided: t.voided_at !== null,
      version: revision(t.version), accountId: source.accountId, destinationAccountId: destination?.accountId ?? null,
      categoryId: t.effective_category_id === null ? null : id(t.effective_category_id), paidBy: t.paid_by === null ? null : id(t.paid_by) };
  });
}
function decodeReport(value: unknown): Report {
  const r = object(value);
  const categories = array(r.categories).map(value => {
    const c = object(value);
    return { id: id(c.category_id), name: text(c.name), spent: money(c.spent) };
  });
  if (categories.reduce((sum, c) => sum + BigInt(c.spent), 0n) !== BigInt(money(r.net_spending))) throw new Error('Invalid category totals');
  return { income: money(r.income), grossExpenses: money(r.gross_expenses), refunds: money(r.refunds), netSpending: money(r.net_spending),
    closingCash: r.closing_cash === null ? null : money(r.closing_cash), asOf: r.as_of === null ? null : text(r.as_of), categories };
}

async function read<T>(request: PromiseLike<{ data: unknown; error: { code?: string } | null }>, decode: (value: unknown) => T): Promise<FinancialResult<T>> {
  try {
    const { data, error } = await request;
    if (error) return { ok: false, error: financialError(error) };
    try { return { ok: true, data: decode(data) }; }
    catch { return { ok: false, error: { kind: 'invalid_response', message: 'The workspace response could not be verified. Try again.' } }; }
  } catch { return { ok: false, error: financialError(null) }; }
}

// Request-scoped client only. No module cache, privileged client or financial writes.
export function financeReader(client: SupabaseClient<Database>) {
  return {
    provisionPersonal: () => read(client.rpc('ensure_personal_workspace'), id),
    invitations: () => read(client.rpc('list_workspace_invitations'), value => array(value).map(value => {
      const row = object(value);
      return { id: id(row.id), workspace_id: id(row.workspace_id), name: text(row.name),
        recipient_id: id(row.recipient_id), expires_at: text(row.expires_at) };
    })),
    listWorkspaces: () => read(client.rpc('list_workspaces'), value => array(value).map(value => {
      const row = object(value);
      if (!['owner', 'member'].includes(text(row.role))) throw new Error('Invalid response');
      return { ...workspace(row), role: row.role as 'owner' | 'member' };
    })),
    workspace: (w: string) => read(client.rpc('read_workspace', { w }), value => decodeWorkspace(w, value)),
    transactions: (w: string, start: string, until: string, cursor?: { date: string; id: string }) => read(client.rpc('read_transactions', {
      w, from_date: start, until_date: until, page_size: 50, ...(cursor ? { after_date: cursor.date, after_id: cursor.id } : {}),
    }), value => decodeTransactions(w, value)),
    report: (w: string, start: string) => read(client.rpc('monthly_report', { w, month_start: start }), decodeReport),
    overview: (w: string, start: string) => read(client.rpc('read_workspace_overview', { w, month_start: start }), value => {
      const r = object(value);
      return { ...decodeWorkspace(w, r.workspace), report: decodeReport(r.report), transactions: decodeTransactions(w, r.transactions) };
    }),
  };
}
