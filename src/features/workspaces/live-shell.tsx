import { ArrowDownUp, BookOpen, ChevronDown, LayoutDashboard, LockKeyhole, Users, Wallet } from 'lucide-react';
import type { Workspace } from '@/lib/supabase/finance';
import { SignOutButton } from './session-controls';

const sections = [
  { href: '#overview', label: 'Overview', icon: LayoutDashboard },
  { href: '#transactions', label: 'Transactions', icon: ArrowDownUp },
  { href: '#accounts', label: 'Accounts', icon: Wallet },
];

export function LiveShell({ workspace, email, children }: { workspace: Workspace; email?: string; children: React.ReactNode }) {
  const Icon = workspace.kind === 'personal' ? LockKeyhole : Users;
  const brand = <a href="/workspaces" className="brand"><span className="brand-mark"><BookOpen size={20} aria-hidden="true" /></span>Finance Planner</a>;
  const switcher = <a href="/workspaces" className="workspace-control live-workspace-switch" aria-label={`Switch workspace: ${workspace.name}, ${workspace.kind}`}>
    <Icon size={18} aria-hidden="true" /><span className="workspace-copy"><span className="muted">{workspace.kind === 'personal' ? 'Private' : 'Shared'}</span><strong>{workspace.name}</strong></span><ChevronDown size={16} aria-hidden="true" />
  </a>;
  return <div className="live-app">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <aside className="sidebar" aria-label="Application sidebar">
      {brand}{switcher}
      <nav aria-label="Main navigation">{sections.map(({ href, label, icon: SectionIcon }) => <a key={href} href={href} className="nav-link"><SectionIcon size={18} aria-hidden="true" />{label}</a>)}</nav>
      <div className="sidebar-bottom"><a href="/workspaces" className="nav-link"><Users size={18} aria-hidden="true" />Manage workspaces</a>
        <p className="sidebar-note small muted">Your finances,<br />one workspace at a time.</p><SignOutButton />
      </div>
    </aside>
    <div className="app-main">
      <header className="topbar"><div className="topbar-left"><Icon size={16} aria-hidden="true" /><span className="small">{workspace.kind === 'personal' ? 'Your personal space' : 'Your shared space'}</span></div>{brand}
        <div className="live-topbar-identity"><span className="small live-email">{email}</span><SignOutButton /></div></header>
      <main id="main-content" className="content" tabIndex={-1}><div className="mobile-workspace">{switcher}</div>{children}
        <footer className="page-footer"><Icon size={16} aria-hidden="true" />{workspace.kind === 'personal' ? 'Private to you' : 'Visible to workspace members'} · IDR · Asia/Jakarta</footer>
      </main>
    </div>
    <nav className="mobile-nav" aria-label="Mobile navigation">{sections.map(({ href, label, icon: SectionIcon }) => <a key={href} href={href}><SectionIcon size={20} aria-hidden="true" />{label}</a>)}<a href="/workspaces"><Users size={20} aria-hidden="true" />Workspaces</a></nav>
  </div>;
}
