import { EmptyState } from '@/components/brand/empty-state';
import { redirect } from 'next/navigation';
import { verifiedSession } from '@/lib/supabase/session';
import { financeReader, validWorkspaceId } from '@/lib/supabase/finance';
import { financialError, monthRange } from '@/lib/supabase/errors';
import { formatIDR, monthLabel, shortDate } from '@/lib/prototype';
import { FinancialNotice, LiveHeading, SampleLink } from '@/features/workspaces/views';
import { FinancialDialog } from '@/features/transactions/forms';
import { validFinancialDate } from '@/features/transactions/validation';
import { jakartaDate } from '@/lib/prototype';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LiveShell } from '@/features/workspaces/live-shell';
import { SpendingChart } from '@/features/prototype/spending-chart';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ShoppingBasket, Wallet } from 'lucide-react';

export default async function WorkspacePage({ params, searchParams }: {
  params: Promise<{ workspaceId: string }>; searchParams: Promise<{ month?: string | string[]; afterDate?: string; afterId?: string }>;
}) {
  const session = await verifiedSession();
  if (!session.ok) {
    if (session.reason !== 'unavailable') redirect('/sign-in');
    return <FinancialNotice error={financialError(null)} retry="/workspaces" />;
  }
  const { workspaceId: w } = await params;
  if (!validWorkspaceId(w)) return <FinancialNotice error={financialError({ code: '42501' })} retry="/workspaces" />;
  const { month, afterDate, afterId } = await searchParams;
  const range = Array.isArray(month) ? null : monthRange(month);
  if (!range) return <section className="panel"><h2>Invalid month</h2><a className="text-link" href={`/w/${w}`}>Use current Jakarta month</a></section>;
  const reader = financeReader(session.client);
  const snapshot = await reader.overview(w, range.start);
  if (!snapshot.ok) return <><LiveHeading email={session.user.email} /><FinancialNotice error={snapshot.error} retry={`/w/${w}?month=${range.month}`} /><SampleLink /></>;
  const { workspace, accounts, categories, report: totals } = snapshot.data;
  let transactions = snapshot.data.transactions;
  if (afterDate !== undefined || afterId !== undefined) {
    if (typeof afterDate !== 'string' || typeof afterId !== 'string' || !validWorkspaceId(afterId) ||
      !validFinancialDate(afterDate, jakartaDate(new Date())) || afterDate < range.start || afterDate >= range.until)
      return <section className="panel"><h2>Invalid transaction page</h2><a href={`/w/${w}?month=${range.month}`}>Return to first page</a></section>;
    const page = await reader.transactions(w, range.start, range.until, { date: afterDate, id: afterId });
    if (!page.ok) return <FinancialNotice error={page.error} retry={`/w/${w}?month=${range.month}`} />;
    transactions = page.data;
  }
  const formProps = { workspace: w, workspaceName: workspace.name, actor: session.user.id, today: jakartaDate(new Date()), accounts, categories };
  const last = transactions.at(-1);
  const hasSpendingActivity = BigInt(totals.grossExpenses) !== 0n || BigInt(totals.refunds) !== 0n;
  const colors = ['#0284c7', '#d91670', '#0369a1', '#be185d'];
  const breakdown = totals.categories.filter(c => BigInt(c.spent) !== 0n).map((c, i) => ({ id: c.id, name: c.name, amount: c.spent, color: colors[i % colors.length] }));
  return <LiveShell workspace={workspace} email={session.user.email}>
    <div className="page-heading" id="overview"><div><h1>Your month, in focus.</h1><p>{workspace.name} · {monthLabel(range.month)}</p></div>
      <div className="heading-actions live-heading-actions"><form method="get" className="ledger-period"><label htmlFor="live-month" className="sr-only">Report month · Asia/Jakarta</label><Input id="live-month" type="month" name="month" defaultValue={range.month} required /><Button variant="outline" type="submit">View month</Button></form>
        <FinancialDialog key={`${session.user.id}:${w}:transaction`} {...formProps} operation="transaction" disabled={!accounts.some(a => !a.archived)} /></div></div>
    <section className="summary-strip" aria-label="Recorded monthly totals">
      <div className="summary-item"><p className="summary-label"><ArrowDownLeft size={16} aria-hidden="true" />Income</p><p className="summary-value positive">{formatIDR(totals.income)}</p><p className="small muted">Recorded income this month</p></div>
      <div className="summary-item"><p className="summary-label"><ArrowUpRight size={16} aria-hidden="true" />Net spending</p><p className="summary-value">{formatIDR(totals.netSpending)}</p><p className="small muted">Gross {formatIDR(totals.grossExpenses)} · Refunds {formatIDR(totals.refunds)}</p></div>
      <div className="summary-item"><p className="summary-label"><Wallet size={16} aria-hidden="true" />Closing cash</p><p className="summary-value">{totals.closingCash === null ? 'Unavailable' : formatIDR(totals.closingCash)}</p><p className="small muted">{totals.asOf ? `As of ${shortDate(totals.asOf)}, ${totals.asOf.slice(0, 4)}` : 'Future month or no configured cash'}</p></div>
    </section>
    <div className="dashboard-grid live-dashboard-grid">
      <section className="panel"><div className="panel-heading"><div><h2>Where your money went</h2><p className="small muted">Net spending by category · IDR</p></div></div>
        {breakdown.length === 0 ? <EmptyState title={hasSpendingActivity ? 'Spending and refunds balance out' : 'No spending to show'} description={hasSpendingActivity ? 'Recorded expenses were fully offset by refunds this month.' : 'Record an expense to see your category breakdown.'} /> : <div className="spending-composition"><SpendingChart data={breakdown} total={totals.netSpending} />
          <table className="live-category-table"><caption className="sr-only">Exact net spending by category for the whole month</caption><thead><tr><th scope="col">Category</th><th scope="col">Net spending</th></tr></thead><tbody>{breakdown.map(c => <tr key={c.id}><th scope="row"><span className="swatch" style={{ background: c.color }} aria-hidden="true" />{c.name}</th><td>{formatIDR(c.amount)}</td></tr>)}</tbody></table></div>}
      </section>
      <section className="panel" id="accounts"><div className="panel-heading"><div><h2>Your accounts</h2><p className="small muted">Current recorded balances</p></div><FinancialDialog key={`${session.user.id}:${w}:account`} {...formProps} operation="account" /></div>
        {accounts.length === 0 ? <EmptyState illustration="accounts" title="Add your first account" description="Start with its opening balance. Opening funds are not income." /> : <div className="live-account-list">{accounts.map(a => <div key={a.id}><h3>{a.name}{a.archived ? ' · Archived' : ''}</h3><p className="live-account-balance">{formatIDR(a.balance)}</p><p className="small muted">Reserved {formatIDR(a.reserved)}</p>{BigInt(a.balance) < 0n && <p className="small text-destructive">Negative balance. Check your entries.</p>}{BigInt(a.shortfall) > 0n && <p className="small text-destructive">Underfunded: {formatIDR(a.shortfall)}</p>}</div>)}</div>}
        <p className="small muted mt-4">Manually recorded. Not a bank connection.</p>
      </section>
    </div>
    <section className="panel transaction-panel live-transactions" id="transactions"><div className="panel-heading"><div><h2>The latest in your ledger</h2><p className="small muted">{monthLabel(range.month)} · {transactions.length} entries on this page</p></div><FinancialDialog key={`${session.user.id}:${w}:category`} {...formProps} operation="category" /></div>
      {transactions.length === 0 ? <EmptyState illustration={workspace.kind === 'shared' ? 'shared' : 'transactions'} title={afterId ? 'No more transactions on this page.' : 'No transactions recorded for this month.'} description="Choose another month or add a transaction above." /> : <table className="transaction-table live-transaction-table"><caption className="sr-only">Database transaction records for the selected workspace and month</caption><thead><tr><th scope="col">Transaction</th><th scope="col" className="secondary-cell">Date</th><th scope="col">Amount · IDR</th><th scope="col">Actions</th></tr></thead><tbody>{transactions.map(t => {
        const Icon = t.kind === 'transfer' ? ArrowLeftRight : t.kind === 'income' || t.kind === 'refund' ? ArrowDownLeft : ShoppingBasket;
        const account = accounts.find(a => a.id === t.accountId)?.name ?? 'Unavailable account';
        const category = categories.find(c => c.id === t.categoryId)?.name;
        return <tr key={t.id}><td><div className="transaction-description"><span className="entry-icon"><Icon size={18} aria-hidden="true" /></span><div><p className="live-entry-title">{t.description || `${t.kind.charAt(0).toUpperCase()}${t.kind.slice(1)} transaction`}</p><p className="small muted">{account}{t.destinationAccountId ? ` → ${accounts.find(a => a.id === t.destinationAccountId)?.name ?? 'Unavailable account'}` : category ? ` · ${category}` : ''}</p><p className="entry-detail">{t.economicDate}</p></div></div></td>
          <td className="secondary-cell muted">{t.economicDate}</td><td className="live-entry-amount"><span>{t.kind === 'expense' ? '−' : t.kind === 'income' || t.kind === 'refund' ? '+' : ''}{formatIDR(t.amount)}</span><p className="entry-type">{t.kind}{t.voided ? ' · Voided' : ''}</p></td>
          <td className="live-entry-actions">{!t.voided && <div>{['income', 'expense', 'transfer'].includes(t.kind) && <FinancialDialog key={`${session.user.id}:${w}:${t.id}:edit`} {...formProps} operation="transaction" transaction={t} compact />}<FinancialDialog key={`${session.user.id}:${w}:${t.id}:void`} {...formProps} operation="void" transaction={t} compact /></div>}</td></tr>;
      })}</tbody></table>}
      <div className="table-footer"><p>Transfers do not count as income or spending. Voided entries retain their history.</p><nav className="flex flex-wrap gap-4" aria-label="Transaction pages">{afterId && <a className="text-link" href={`/w/${w}?month=${range.month}#transactions`}>First page</a>}
        {transactions.length === 50 && last && <a className="text-link" href={`/w/${w}?month=${range.month}&afterDate=${last.economicDate}&afterId=${last.id}#transactions`}>Next page</a>}</nav></div>
    </section>
  </LiveShell>;
}
