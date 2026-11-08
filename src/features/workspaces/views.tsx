import Link from 'next/link';
import { SignOutButton } from './session-controls';
import type { FinancialFailure } from '@/lib/supabase/errors';

export function FinancialNotice({ error, retry }: { error: FinancialFailure; retry: string }) {
  return <section className="panel grid gap-4" role="alert"><h2>{error.kind === 'denied' ? 'Financial access unavailable' : 'Workspace service unavailable'}</h2>
    <p>{error.message}</p><p>No sample data is substituted for a failed database read.</p>
    <a className="text-link" href={retry}>Try again</a></section>;
}

export function LiveHeading({ email }: { email?: string }) {
  return <header className="page-heading"><div><h1>Your workspaces</h1><p>Choose a space for your everyday finances.</p><p className="small break-all">{email}</p></div>
    <SignOutButton /></header>;
}

export function SampleLink() {
  return <p className="small mt-6"><Link href="/budgets" prefetch={false}>Explore separate sample budgets and goals</Link></p>;
}
