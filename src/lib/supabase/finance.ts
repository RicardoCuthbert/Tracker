import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types.ts';
import { financialError, type FinancialResult } from './errors.ts';

export type Workspace = { id: string; name: string; kind: 'personal' | 'shared'; role?: 'owner' | 'member' };
export type Account = { id: string; name: string; balance: string; reserved: string; shortfall: string };
export type Transaction = { id: string; kind: string; amount: string; economicDate: string; description: string; voided: boolean };
export type Report = { income: string; grossExpenses: string; refunds: string; netSpending: string; closingCash: string | null; asOf: string | null };
export const validWorkspaceId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid response');
  return value as Record<string, unknown>;
}
function text(value: unknown): string { if (typeof value !== 'string') throw new Error('Invalid response'); return value; }
function id(value: unknown): string { const v = text(value); if (!validWorkspaceId(v)) throw new Error('Invalid response'); return v; }
function money(value: unknown): string { const v = text(value); if (!/^-?(0|[1-9][0-9]*)$/.test(v)) throw new Error('Invalid response'); return v; }
function array(value: unknown): unknown[] { if (!Array.isArray(value)) throw new Error('Invalid response'); return value; }
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
    return { id: id(a.id), name: text(a.name), balance: money(a.balance), reserved: money(a.reserved), shortfall: money(a.shortfall) };
  });
  return { workspace: info, accounts };
}
function decodeTransactions(w: string, value: unknown): Transaction[] {
  return array(value).map(value => {
    const t = object(value);
    if (t.workspace_id !== w || !['income', 'expense', 'transfer', 'refund', 'correction'].includes(text(t.kind)) ||
      (t.voided_at !== null && typeof t.voided_at !== 'string')) throw new Error('Invalid response');
    return { id: id(t.id), kind: text(t.kind), amount: money(t.amount), economicDate: text(t.economic_date), description: text(t.description), voided: t.voided_at !== null };
  });
}
function decodeReport(value: unknown): Report {
  const r = object(value);
  return { income: money(r.income), grossExpenses: money(r.gross_expenses), refunds: money(r.refunds), netSpending: money(r.net_spending),
    closingCash: r.closing_cash === null ? null : money(r.closing_cash), asOf: r.as_of === null ? null : text(r.as_of) };
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
    listWorkspaces: () => read(client.rpc('list_workspaces'), value => array(value).map(value => {
      const row = object(value);
      if (!['owner', 'member'].includes(text(row.role))) throw new Error('Invalid response');
      return { ...workspace(row), role: row.role as 'owner' | 'member' };
    })),
    workspace: (w: string) => read(client.rpc('read_workspace', { w }), value => decodeWorkspace(w, value)),
    transactions: (w: string, start: string, until: string) => read(client.rpc('read_transactions', { w, from_date: start, until_date: until, page_size: 50 }), value => decodeTransactions(w, value)),
    report: (w: string, start: string) => read(client.rpc('monthly_report', { w, month_start: start }), decodeReport),
    overview: (w: string, start: string) => read(client.rpc('read_workspace_overview', { w, month_start: start }), value => {
      const r = object(value);
      return { ...decodeWorkspace(w, r.workspace), report: decodeReport(r.report), transactions: decodeTransactions(w, r.transactions) };
    }),
  };
}
