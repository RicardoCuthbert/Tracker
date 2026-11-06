"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowDownUp, ArrowUpRight, BookOpen, CalendarDays, ChartNoAxesCombined, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Ellipsis, FlaskConical, LayoutDashboard, LockKeyhole, PiggyBank, Settings2, ShieldCheck, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePrototype } from "./context";
import { monthLabel } from "@/lib/prototype";
import { AddTransaction } from "./transaction-dialog";

const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowDownUp },
  { href: "/budgets", label: "Budgets", icon: ChartNoAxesCombined },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/goals", label: "Savings goals", icon: PiggyBank },
];
export function Brand() { return <Link href="/" className="brand"><span className="brand-mark"><BookOpen size={20} aria-hidden="true" /></span><span>Finance Planner</span></Link>; }

export function WorkspaceSwitcher() {
  const { workspace, setWorkspace } = usePrototype();
  const Icon = workspace === "personal" ? LockKeyhole : Users;
  return <Select value={workspace} onValueChange={(value) => setWorkspace(value as "personal" | "shared")}>
    <SelectTrigger className="workspace-control" aria-label="Workspace"><Icon size={18} aria-hidden="true" /><span className="workspace-copy"><span className="muted">{workspace === "personal" ? "Cuthbert" : "Cuthbert & Valen"}</span><strong><SelectValue /></strong></span></SelectTrigger>
    <SelectContent><SelectItem value="personal">Personal</SelectItem><SelectItem value="shared">Shared</SelectItem></SelectContent>
  </Select>;
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { workspace } = usePrototype();
  return <>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <aside className="sidebar" aria-label="Application sidebar">
      <Brand /><WorkspaceSwitcher />
      <nav aria-label="Main navigation">{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-link ${path === href ? "active" : ""}`} aria-current={path === href ? "page" : undefined}><Icon size={18} aria-hidden="true" />{label}</Link>)}</nav>
      <div className="sidebar-bottom">
        <Link className={`nav-link ${path === "/settings" ? "active" : ""}`} href="/settings" aria-current={path === "/settings" ? "page" : undefined}><Settings2 size={18} aria-hidden="true" />Settings & preview</Link>
        <Link className="nav-link" href="/sign-in"><CircleHelp size={18} aria-hidden="true" />Sign-in preview<ArrowUpRight size={16} aria-hidden="true" /></Link>
        <p className="sidebar-note small muted">A little clarity,<br />every day.</p>
        <div className="identity"><span className="avatar" aria-hidden="true">C</span><div><p className="small">Cuthbert</p><p className="small muted">Demo identity</p></div></div>
      </div>
    </aside>
    <div className="app-main">
      <header className="topbar"><div className="topbar-left">{workspace === "personal" ? <LockKeyhole size={16} aria-hidden="true" /> : <Users size={16} aria-hidden="true" />}<span className="small muted">{workspace === "personal" ? "Your personal space" : "Your shared space"}</span></div><Brand /><span className="prototype-badge"><span className="prototype-dot" />Warm Ledger · Frontend prototype</span><span className="topbar-identity small">Cuthbert <span className="muted">/ Demo</span></span></header>
      <main id="main-content" className="content" tabIndex={-1}>
        <div className="mobile-workspace"><WorkspaceSwitcher /></div>
        <div className="mock-note"><FlaskConical size={16} aria-hidden="true" /><span>Sample data only. No bank connection, authentication or saved financial records.</span></div>
        <div key={workspace}>{children}</div>
        <PreviewTools />
        <p className="page-footer"><ShieldCheck size={16} aria-hidden="true" />Made for a more considered relationship with money.</p>
      </main>
    </div>
    <nav className="mobile-nav" aria-label="Mobile navigation">{navigation.slice(0,3).map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined}><Icon size={20} aria-hidden="true" />{label}</Link>)}<DropdownMenu><DropdownMenuTrigger aria-label="More pages" aria-current={["/goals", "/accounts", "/settings"].includes(path) ? "page" : undefined}><Ellipsis size={20} aria-hidden="true" />More</DropdownMenuTrigger><DropdownMenuContent align="end" side="top" sideOffset={12}>{navigation.slice(3).map(({ href, label, icon: Icon }) => <DropdownMenuItem key={href} asChild><Link href={href}><Icon size={18} aria-hidden="true" />{label}</Link></DropdownMenuItem>)}<DropdownMenuItem asChild><Link href="/settings"><Settings2 size={18} aria-hidden="true" />Settings & preview</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href="/sign-in">Sign-in preview</Link></DropdownMenuItem></DropdownMenuContent></DropdownMenu></nav>
  </>;
}

export function MonthSelector() {
  const { month, setMonth } = usePrototype();
  const year = Number(month.slice(0,4));
  const months = Array.from({ length: 36 }, (_, index) => new Date(Date.UTC(year - 1, index, 1)).toISOString().slice(0,7));
  const shortLabel = new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(`${month}-01T12:00:00Z`));
  function shift(direction: number) {
    const date = new Date(`${month}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + direction);
    setMonth(date.toISOString().slice(0,7));
  }
  return <div className="month-control"><Button className="month-arrow" variant="ghost" size="icon" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft size={16} /></Button><Select value={month} onValueChange={setMonth}><SelectTrigger id="report-month" className="month-picker" aria-label="Report month"><CalendarDays size={16} aria-hidden="true" /><SelectValue>{shortLabel}</SelectValue></SelectTrigger><SelectContent position="popper" align="center">{months.map((value) => <SelectItem key={value} value={value}>{monthLabel(value)}</SelectItem>)}</SelectContent></Select><Button className="month-arrow" variant="ghost" size="icon" aria-label="Next month" onClick={() => shift(1)}><ChevronRight size={16} /></Button></div>;
}

export function PageHeading({ title, description, monthly = true, add = true }: { title: string; description: string; monthly?: boolean; add?: boolean }) {
  const { month } = usePrototype();
  return <div className="page-heading"><div><h1>{title}</h1><p>{description}</p></div><div className="heading-actions">{monthly && <MonthSelector />}{add && <AddTransaction key={month} />}</div></div>;
}

export function PreviewTools() {
  const { preview, setPreview, month } = usePrototype();
  return <div className="preview-tools"><span><FlaskConical size={14} className="inline mr-2" aria-hidden="true" />Mock snapshot · {monthLabel(month)}</span><label htmlFor="preview-state">Preview state<select id="preview-state" value={preview} onChange={(event) => setPreview(event.target.value as typeof preview)}><option value="ready">Ready</option><option value="loading">Loading</option><option value="empty">Empty</option><option value="error">Error</option></select><ChevronDown size={14} className="hidden" /></label></div>;
}
