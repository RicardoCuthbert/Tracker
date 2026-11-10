"use client";

import { EmptyState } from "@/components/brand/empty-state";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, CircleHelp, Home, Info, Landmark, Plane, Search, ShieldCheck, ShoppingBasket, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePrototype } from "./context";
import { PageHeading } from "./shell";
import { ContentState } from "./states";
import { accountSnapshots, goals, type Budget, type Entry, type Snapshot } from "./mock-data";
import { SpendingChart } from "./spending-chart";
import { MonthlyTrend } from "./monthly-trend";
import { formatIDR, monthLabel, shortDate } from "@/lib/prototype";

function PanelHeading({ title, subtitle, href, action }: { title: string; subtitle?: string; href?: string; action?: string }) {
  return <div className="panel-heading"><div><h2>{title}</h2>{subtitle && <p className="small muted">{subtitle}</p>}</div>{href && <Link href={href} className="text-link">{action ?? "View all"}<ArrowRight size={14} aria-hidden="true" /></Link>}</div>;
}

function Summary({ data }: { data: Snapshot }) {
  return <section className="summary-strip" aria-label="Sample monthly summary">
    <div className="summary-item"><div className="summary-label"><ArrowDownLeft size={16} aria-hidden="true" />Income</div><p className="summary-value positive money">{formatIDR(data.income)}</p><p className="small muted">Recorded income this month</p></div>
    <div className="summary-item"><div className="summary-label"><ArrowUpRight size={16} aria-hidden="true" />Net spending</div><p className="summary-value money">{formatIDR(data.spending)}</p><p className="small muted">Gross {formatIDR(data.gross)}<br />Refunds {formatIDR(data.refunds)}</p></div>
    <div className="summary-item"><div className="summary-label"><Wallet size={16} aria-hidden="true" />Closing cash</div><p className="summary-value money">{formatIDR(data.cash)}</p><p className="small muted">As of {shortDate(data.asOf)}, 2026 · Manual snapshot</p></div>
  </section>;
}

export function BudgetRow({ row }: { row: Budget }) {
  return <div className="budget-row"><div className="budget-row-top"><span>{row.name}</span><span className="money">{formatIDR(row.spent)} <span className="muted">{row.planned !== null ? `of ${formatIDR(row.planned)}` : "· No plan"}</span></span></div><div className="budget-track" role="progressbar" aria-label={`${row.name} budget used`} aria-valuenow={row.progress} aria-valuemin={0} aria-valuemax={100} aria-valuetext={row.planned === null ? "Budget not set" : `${formatIDR(row.spent)} spent of ${formatIDR(row.planned)}`}><span style={{ width: `${row.progress}%` }} /></div><div className="budget-row-foot"><span>{row.planned === null ? "Budget not set" : row.remaining === "0" ? "Fully used" : `${formatIDR(row.remaining!)} remaining`}</span>{row.planned !== null && <span>{row.progress}% used</span>}</div></div>;
}

function SpendingPanel({ data }: { data: Snapshot }) {
  const [category, setCategory] = useState<string | null>(null);
  return <section className="panel"><PanelHeading title="Where your money went" subtitle="Net spending by category · IDR" /><div className="spending-composition"><SpendingChart data={data.breakdown} total={data.spending} />
    <table className="w-full" aria-label="Exact spending breakdown"><thead className="sr-only"><tr><th>Color</th><th>Category</th><th>Net spending IDR</th><th>Share</th></tr></thead><tbody>{data.breakdown.map((item) => <tr className="breakdown-row" key={item.name}><td><span className="swatch block" style={{ background: item.color }} aria-hidden="true" /></td><th scope="row" className="font-normal"><button className="breakdown-name" onClick={() => setCategory(item.name)}>{item.name}</button></th><td className="money">{formatIDR(item.amount)}</td><td className="muted text-right">{item.share}</td></tr>)}</tbody></table></div>
    <Dialog open={category !== null} onOpenChange={(open) => { if (!open) setCategory(null); }}><DialogContent className="sm:max-w-[650px]"><DialogHeader><DialogTitle>{category} transactions</DialogTitle><DialogDescription>Sample records supporting this category. Refunds reduce spending.</DialogDescription></DialogHeader><TransactionTable entries={data.entries.filter((entry) => entry.group === category && (entry.type === "Expense" || entry.type === "Refund"))} /></DialogContent></Dialog>
  </section>;
}

function BudgetPreview({ data }: { data: Snapshot }) {
  return <section className="panel"><PanelHeading title="A plan with room to live" subtitle="Your monthly budget" href="/budgets" action="View plan" /><div className="budget-intro"><span className="small muted">Remaining in planned categories</span><span className="money">{formatIDR(data.remaining)}</span><span className="small muted">of {formatIDR(data.budget)} planned</span></div>{data.budgets.slice(0,3).map((row) => <BudgetRow row={row} key={row.name} />)}<p className="insight"><CircleHelp size={16} aria-hidden="true" /><span>Budget remaining is a plan comparison, not guaranteed spendable cash.</span></p></section>;
}

function GoalIcon({ icon }: { icon: string }) { const Icon = icon === "plane" ? Plane : icon === "home" ? Home : ShieldCheck; return <div className="goal-icon"><Icon size={20} aria-hidden="true" /></div>; }

function GoalPreview() {
  const { workspace } = usePrototype();
  return <section className="panel goal-preview"><PanelHeading title="For the things ahead" subtitle="Current savings reservations · Sample data" href="/goals" action="View goals" /><div className="goal-preview-inner">{goals[workspace].map((goal) => <div className="goal-preview-item" key={goal.category}><GoalIcon icon={goal.icon} /><div className="goal-preview-copy"><h3>{goal.category}</h3><p className="small muted"><span className="money">{formatIDR(goal.reserved)}</span> of <span className="money">{formatIDR(goal.target)}</span></p><div className="budget-track" role="progressbar" aria-label={goal.category} aria-valuenow={goal.progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${goal.progress}%` }} /></div><span className="small muted">{goal.progress}% reserved</span></div></div>)}</div></section>;
}

function EntryDetails({ entry }: { entry: Entry }) {
  return <Dialog><DialogTrigger className="entry-title text-left hover:underline underline-offset-4">{entry.description}</DialogTrigger><DialogContent><DialogHeader><DialogTitle>{entry.description}</DialogTitle><DialogDescription>Sample transaction detail · No editing or financial persistence.</DialogDescription></DialogHeader><p className="goal-amount money">{entry.type === "Expense" ? "−" : entry.type === "Transfer" ? "" : "+"}{formatIDR(entry.amount)}</p><dl className="grid grid-cols-2 gap-4 text-sm">{[["Type", entry.type], ["Economic date", entry.date], ["Account", entry.account], ["Category", entry.category], ["Entered by", entry.author], ...(entry.payer ? [["Paid by", entry.payer]] : [])].map(([label, value]) => <div key={label}><dt className="muted">{label}</dt><dd>{value}</dd></div>)}</dl>{entry.type === "Transfer" && <p className="notice">A money movement between accounts. Excluded from income and spending.</p>}{entry.type === "Refund" && <p className="notice">Linked grocery refund in the sample fixture. Reduces spending, not income.</p>}</DialogContent></Dialog>;
}

export function TransactionTable({ entries }: { entries: Entry[] }) {
  if (!entries.length) return <EmptyState heading="h2" title="No matching transactions" description="Try another description or choose all transaction types." />;
  return <table className="transaction-table"><caption className="sr-only">Sample transactions, exact IDR amounts</caption><thead><tr><th scope="col">Transaction</th><th className="secondary-cell" scope="col">Category</th><th className="secondary-cell" scope="col">Date</th><th scope="col">Amount</th></tr></thead><tbody>{entries.map((entry) => {
    const incoming = ["Income", "Refund", "Correction"].includes(entry.type);
    const Icon = entry.type === "Transfer" ? ArrowLeftRight : incoming ? ArrowDownLeft : ShoppingBasket;
    return <tr key={entry.id}><td><div className="transaction-description"><span className="entry-icon"><Icon size={18} aria-hidden="true" /></span><div><EntryDetails entry={entry} /><p className="small muted hidden md:block">{entry.account}</p><p className="entry-detail">{shortDate(entry.date)} · {entry.category}</p></div></div></td><td className="secondary-cell muted">{entry.category}</td><td className="secondary-cell muted">{shortDate(entry.date)}</td><td><span className={`money font-medium ${incoming ? "incoming" : ""}`}>{entry.type === "Expense" ? "−" : incoming ? "+" : ""}{formatIDR(entry.amount)}</span><p className="entry-type">{entry.type}</p></td></tr>;
  })}</tbody></table>;
}

function SessionEntries() {
  const { demoEntries, month } = usePrototype();
  const entries = demoEntries.filter((entry) => entry.date.startsWith(month));
  if (!demoEntries.length) return null;
  return <section className="panel transaction-panel mb-8"><PanelHeading title="Session demo entries" subtitle="Not saved. Not included in sample summary, charts or budgets." />{entries.length ? <TransactionTable entries={entries} /> : <p className="table-footer">Demo entries exist in another month. Select their transaction month to view them.</p>}</section>;
}

export function OverviewScreen() {
  const { snapshot } = usePrototype();
  return <><PageHeading title="Your month, in focus." description="A little perspective on your everyday finances." /><SessionEntries /><ContentState>{snapshot && <><Summary data={snapshot} /><div className="dashboard-grid"><SpendingPanel data={snapshot} /><BudgetPreview data={snapshot} /></div><MonthlyTrend /><section className="panel transaction-panel"><PanelHeading title="The latest in your ledger" subtitle="Recent sample transactions" href="/transactions" action="View all" /><TransactionTable entries={snapshot.entries.slice(0,4)} /><div className="table-footer">Income, refunds and transfers are labeled separately.</div></section><GoalPreview /></>}</ContentState></>;
}

export function TransactionsScreen() {
  const { snapshot } = usePrototype();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("All types");
  const entries = (snapshot?.entries ?? []).filter((entry) => entry.description.toLowerCase().includes(search.toLowerCase()) && (type === "All types" || entry.type === type));
  return <><PageHeading title="Transactions" description="The details behind your everyday money." /><SessionEntries /><ContentState><div className="search-row"><div className="search-field"><Search size={18} aria-hidden="true" /><label htmlFor="transaction-search" className="sr-only">Search sample transactions</label><Input id="transaction-search" placeholder="Search transactions" value={search} onChange={(event) => setSearch(event.target.value)} /></div><label className="sr-only" htmlFor="transaction-type-filter">Transaction type</label><select id="transaction-type-filter" value={type} onChange={(event) => setType(event.target.value)}>{["All types", "Expense", "Income", "Refund", "Transfer", "Correction"].map((value) => <option key={value}>{value}</option>)}</select>{(search || type !== "All types") && <Button variant="outline" onClick={() => { setSearch(""); setType("All types"); }}>Clear filters</Button>}</div><p className="small muted mb-4" role="status">{entries.length} sample transactions · Select a description for details</p><section className="panel transaction-panel"><TransactionTable entries={entries} /></section></ContentState></>;
}

export function BudgetsScreen() {
  const { snapshot, month } = usePrototype();
  return <><PageHeading title="A plan for the month." description="Give your money a direction, with room for real life." add={false} /><ContentState>{snapshot && <><section className="summary-strip"><div className="summary-item"><p className="summary-label">Total planned</p><p className="summary-value money">{formatIDR(snapshot.budget)}</p></div><div className="summary-item"><p className="summary-label">Net spending</p><p className="summary-value money">{formatIDR(snapshot.spending)}</p></div><div className="summary-item"><p className="summary-label">Budget remaining</p><p className="summary-value positive money">{formatIDR(snapshot.remaining)}</p></div></section><section className="panel"><PanelHeading title="Your category plans" subtitle={`${monthLabel(month)} · Authored sample plan`} /><div className="page-grid">{snapshot.budgets.map((row) => <div className="border-b pb-6" key={row.name}><BudgetRow row={row} /></div>)}</div><p className="notice"><Info size={18} aria-hidden="true" /><span>Snapshot only. No budget editing or automatic rollover. Unbudgeted sample spending: {formatIDR("0")}. Remaining is not guaranteed spendable cash.</span></p></section></>}</ContentState></>;
}

export function GoalsScreen() {
  const { workspace, setPreview } = usePrototype();
  return <><PageHeading title="Make room for what matters." description="Small intentions. Something to look forward to." monthly={false} add={false} /><ContentState requireSnapshot={false} empty={<EmptyState heading="h2" illustration="goals" title="No sample savings goals" description="Goals earmark funds for the things ahead. Explore the sample goals when ready." action={<Button variant="outline" onClick={() => setPreview("ready")}>View sample goals</Button>} />}><p className="small muted mb-6">Current reservations as of 5 November 2026 · Sample data, independent of report month</p><div className="page-grid">{goals[workspace].map((goal) => <section className="panel goal-card" key={goal.category}><GoalIcon icon={goal.icon} /><p className="small muted">{goal.category}</p><h2>{goal.name}</h2><p className="goal-amount money">{formatIDR(goal.reserved)}</p><p className="small muted">reserved toward {formatIDR(goal.target)}</p><div className="budget-track" role="progressbar" aria-label={goal.category} aria-valuenow={goal.progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${goal.progress}%` }} /></div><div className="budget-row-foot"><span>{goal.progress}% reserved</span><span>{goal.deadline}</span></div><div className="insight"><Wallet size={16} aria-hidden="true" /><span>Reserved against {goal.account}. No money moved.</span></div></section>)}</div><p className="notice"><Info size={18} aria-hidden="true" /><span>Goals are earmarked reservations, not expenses or bank-locked funds. This overview does not allocate or release real money.</span></p></ContentState></>;
}

export function AccountsScreen() {
  const { workspace, setPreview } = usePrototype();
  return <><PageHeading title="A place for every rupiah." description="Your manually tracked accounts, in one workspace." monthly={false} add={false} /><ContentState requireSnapshot={false} empty={<EmptyState heading="h2" illustration="accounts" title="No sample accounts" description="An opening balance starts an account. It is not income; zero is a valid balance." action={<Button variant="outline" onClick={() => setPreview("ready")}>View sample accounts</Button>} />}><p className="small muted mb-6">Current sample balances · As of 5 November 2026 · Not bank verified</p><div className="page-grid">{accountSnapshots[workspace].map((account) => <section className="panel" key={account.name}><Landmark size={22} className="text-primary mb-6" aria-hidden="true" /><h2>{account.name}</h2><p className="small muted mt-2 mb-6">{account.kind}</p><p className="goal-amount money">{formatIDR(account.balance)}</p><p className="small muted">IDR · Manual sample balance</p></section>)}</div><div className="notice"><Info size={18} aria-hidden="true" /><p>Opening balances are not income. This prototype cannot connect a bank or move money.</p></div></ContentState></>;
}

export function SettingsScreen() {
  const { workspace } = usePrototype();
  return <><PageHeading title="Your space, thoughtfully set." description="A few essentials. No unnecessary complexity." monthly={false} add={false} /><ContentState requireSnapshot={false}><section className="panel"><PanelHeading title="Prototype settings" subtitle="Visual foundation only" /><dl className="grid gap-6">{[["Demo identity", "Cuthbert — not authenticated"], ["Workspace", workspace === "personal" ? "Personal sample" : "Shared sample — Cuthbert & Valen"], ["Currency", "IDR · Whole rupiah"], ["Financial timezone", "Asia/Jakarta"], ["Language", "English · Proposed interface copy"], ["Data storage", "Sample fixtures and temporary session entries only"]].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2 border-b pb-4 text-sm"><dt className="muted">{label}</dt><dd>{value}</dd></div>)}</dl><p className="notice"><Info size={18} aria-hidden="true" /><span>Use Preview state below to inspect loading, empty and error layouts. These are simulations, not network requests.</span></p><Link href="/sign-in" className="text-link mt-6">Open sign-in visual shell<ArrowRight size={16} /></Link></section></ContentState></>;
}
