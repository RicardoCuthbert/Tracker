import { BrandLogo } from '@/components/brand/brand-logo';
import { redirect } from 'next/navigation';
import { verifiedSession } from '@/lib/supabase/session';
import { financeReader } from '@/lib/supabase/finance';
import { financialError } from '@/lib/supabase/errors';
import { FinancialNotice, LiveHeading } from '@/features/workspaces/views';
import { ManagementForm } from '@/features/workspaces/management-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, LockKeyhole, Users } from 'lucide-react';

export default async function WorkspacesPage() {
  const session = await verifiedSession();
  if (!session.ok) {
    if (session.reason !== 'unavailable') redirect('/sign-in');
    return <FinancialNotice error={financialError(null)} retry="/workspaces" />;
  }
  const reader = financeReader(session.client);
  const provision = await reader.provisionPersonal();
  if (!provision.ok) return <><LiveHeading email={session.user.email} /><FinancialNotice error={provision.error} retry="/workspaces" /></>;
  const [result, invitations] = await Promise.all([reader.listWorkspaces(), reader.invitations()]);
  return <main className="live-discovery"><BrandLogo className="mb-8" /><LiveHeading email={session.user.email} />{!result.ok ? <FinancialNotice error={result.error} retry="/workspaces" /> :
    result.data.length === 0 ? <section className="panel grid gap-4"><h2>No accessible workspaces</h2><p>No membership was returned for your identity.</p><a className="text-link" href="/auth/ready">Check personal workspace setup</a></section> :
      <section className="live-workspace-cards" aria-label="Authorized workspaces">{result.data.map(w => <a key={w.id} className="panel live-workspace-card" href={`/w/${w.id}`}>
        {w.kind === 'personal' ? <LockKeyhole size={22} aria-hidden="true" /> : <Users size={22} aria-hidden="true" />}<h2>{w.name}</h2><p className="muted">{w.kind === 'personal' ? 'Personal · Private to you' : 'Shared · Visible to its members'}</p><span className="text-link">Open workspace<ArrowRight size={16} aria-hidden="true" /></span></a>)}</section>}
    {result.ok && <details className="panel live-sharing mt-6"><summary>Manage sharing</summary><section className="grid gap-6 mt-6" aria-label="Workspace management">
      <h2>Shared workspace setup</h2><p>Personal data stays private. Shared workspaces start with two participants, including the owner.</p>
      <p className="break-all">Your user ID: <code>{session.user.id}</code></p><p>Give this ID to someone you want to invite you. It identifies your account; it does not grant access.</p>
      {!result.data.some(w => w.kind === 'shared') && <ManagementForm operation="create" label="Create shared workspace" />}
      {result.data.filter(w => w.kind === 'shared' && w.role === 'owner').map(w => <div className="grid gap-3" key={w.id}>
        <h3>Invite to {w.name}</h3><p>Recipient must have a verified account. Invitations expire after seven days. Pending invitations reserve a seat.</p>
        <ManagementForm operation="invite" label="Save invitation"><input type="hidden" name="workspace" value={w.id} />
          <Label htmlFor={`recipient-${w.id}`}>Recipient user ID</Label><Input id={`recipient-${w.id}`} name="recipient" required maxLength={36} autoComplete="off" />
        </ManagementForm></div>)}
    </section></details>}
    {!invitations.ok ? <FinancialNotice error={invitations.error} retry="/workspaces" /> : <section className="panel grid gap-4 mt-6" aria-label="Workspace invitations">
      <h2>Pending invitations</h2>{invitations.data.length === 0 && <p>No pending invitations.</p>}
      {invitations.data.map(i => <div key={i.id} className="grid gap-2 border-t pt-4"><h3>{i.name}</h3>
        <p>Expires: {new Date(i.expires_at).toLocaleString('en-GB', { timeZone: 'Asia/Jakarta' })} Jakarta</p>
        {i.recipient_id === session.user.id ? <><p>Accept to share this workspace’s finances. Your personal workspace stays private.</p>
          <ManagementForm operation="accept" label="Accept invitation"><input type="hidden" name="invitation" value={i.id} /></ManagementForm></>
          : <p className="break-all">Awaiting acceptance by user {i.recipient_id}.</p>}
      </div>)}
    </section>}
    </main>;
}
