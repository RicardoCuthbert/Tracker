import { redirect } from 'next/navigation';
import { verifiedSession } from '@/lib/supabase/session';
import { financeReader } from '@/lib/supabase/finance';
import { financialError } from '@/lib/supabase/errors';
import { FinancialNotice, LiveHeading, SampleLink } from '@/features/workspaces/views';

export default async function WorkspacesPage() {
  const session = await verifiedSession();
  if (!session.ok) {
    if (session.reason !== 'unavailable') redirect('/sign-in');
    return <FinancialNotice error={financialError(null)} retry="/workspaces" />;
  }
  const result = await financeReader(session.client).listWorkspaces();
  return <><LiveHeading email={session.user.email} />{!result.ok ? <FinancialNotice error={result.error} retry="/workspaces" /> :
    result.data.length === 0 ? <section className="panel grid gap-4"><h2>No accessible workspaces</h2><p>No membership was returned for your identity.</p><a className="text-link" href="/auth/ready">Check personal workspace setup</a></section> :
      <section className="grid gap-4" aria-label="Authorized workspaces">{result.data.map(w => <a key={w.id} className="panel grid gap-2 no-underline" href={`/w/${w.id}`}><h2>{w.name}</h2><p>{w.kind === 'personal' ? 'Personal · Private to you' : 'Shared · Visible to its members'}</p><p className="small muted">{w.role}</p></a>)}</section>}
    <SampleLink /></>;
}
