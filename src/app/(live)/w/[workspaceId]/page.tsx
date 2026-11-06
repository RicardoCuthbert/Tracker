import { redirect } from 'next/navigation';
import { verifiedSession } from '@/lib/supabase/session';
import { financeReader, validWorkspaceId } from '@/lib/supabase/finance';
import { financialError, monthRange } from '@/lib/supabase/errors';
import { formatIDR } from '@/lib/prototype';
import { FinancialNotice, LiveHeading, SampleLink } from '@/features/workspaces/views';

export default async function WorkspacePage({ params, searchParams }: {
  params: Promise<{ workspaceId: string }>; searchParams: Promise<{ month?: string | string[] }>;
}) {
  const session = await verifiedSession();
  if (!session.ok) {
    if (session.reason !== 'unavailable') redirect('/sign-in');
    return <FinancialNotice error={financialError(null)} retry="/workspaces" />;
  }
  const { workspaceId: w } = await params;
  if (!validWorkspaceId(w)) return <FinancialNotice error={financialError({ code: '42501' })} retry="/workspaces" />;
  const { month } = await searchParams;
  const range = Array.isArray(month) ? null : monthRange(month);
  if (!range) return <section className="panel"><h2>Invalid month</h2><a className="text-link" href={`/w/${w}`}>Use current Jakarta month</a></section>;
  const reader = financeReader(session.client);
  const snapshot = await reader.overview(w, range.start);
  if (!snapshot.ok) return <><LiveHeading email={session.user.email} /><FinancialNotice error={snapshot.error} retry={`/w/${w}?month=${range.month}`} /><SampleLink /></>;
  const { workspace, accounts, report: totals, transactions } = snapshot.data;
  return <><LiveHeading email={session.user.email} /><a className="text-link mb-4" href="/workspaces">All authorized workspaces</a>
    <div className="page-heading"><div><h2>{workspace.name}</h2><p>{workspace.kind === 'personal' ? 'Personal · Private to you' : 'Shared · Members only'}</p></div>
      <form method="get" className="grid gap-2"><label htmlFor="live-month">Report month · Asia/Jakarta</label><input className="border rounded-md p-2" id="live-month" type="month" name="month" defaultValue={range.month} required /><button className="text-link" type="submit">View month</button></form></div>
    <section className="summary-strip" aria-label="Recorded monthly totals">{[
      ['Income', formatIDR(totals.income)], ['Net spending', formatIDR(totals.netSpending)], ['Closing cash', totals.closingCash === null ? 'Unavailable' : formatIDR(totals.closingCash)],
    ].map(([label, value]) => <div className="summary-item" key={label}><p className="summary-label">{label}</p><p className="text-2xl break-words">{value}</p></div>)}</section>
    <p className="small mb-6">Gross expenses {formatIDR(totals.grossExpenses)} · Refunds {formatIDR(totals.refunds)} · Cash as of {totals.asOf ?? 'unavailable (future month or no configured cash)'}. Reservations do not change cash.</p>
    <section className="panel grid gap-4 mb-6"><h2>Accounts · Current recorded balances</h2>{accounts.length === 0 ? <p>No accounts configured. This does not mean a zero bank balance.</p> : accounts.map(a => <div key={a.id} className="border-t pt-4"><h3>{a.name}</h3><p>Balance {formatIDR(a.balance)} · Reserved {formatIDR(a.reserved)}</p>{BigInt(a.shortfall) > 0n && <p>Underfunded reservations: {formatIDR(a.shortfall)}</p>}</div>)}</section>
    <section className="panel grid gap-4"><h2>Recorded transactions · {range.month}</h2><p className="small muted">First 50 entries in date order. Transfers and corrections are listed separately from income/spending. Voided entries remain visible.</p>
      {transactions.length === 0 ? <p>No transactions recorded for this month.</p> : <div className="overflow-x-auto"><table className="transaction-table"><caption className="sr-only">Database transaction records for the selected workspace and month</caption><thead><tr><th scope="col">Date</th><th scope="col">Type</th><th scope="col">Description</th><th scope="col">Amount · IDR</th></tr></thead><tbody>{transactions.map(t => <tr key={t.id}><td>{t.economicDate}</td><td>{t.kind}{t.voided ? ' · Voided' : ''}</td><td className="break-words">{t.description || '—'}</td><td className="money">{formatIDR(t.amount)}</td></tr>)}</tbody></table></div>}
    </section><SampleLink /></>;
}
