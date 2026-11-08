import { PrivateView } from '@/features/workspaces/private-view';
import { verifiedSession } from '@/lib/supabase/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LiveLayout({ children }: { children: React.ReactNode }) {
  const session = await verifiedSession();
  return <div className="min-h-dvh"><PrivateView key={session.ok ? session.user.id : session.reason} actor={session.ok ? session.user.id : ''} verification={crypto.randomUUID()}><div className="content live-boundary">{children}</div></PrivateView></div>;
}
