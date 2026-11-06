import { PrivateView } from '@/features/workspaces/private-view';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return <main className="content min-h-dvh"><PrivateView>{children}</PrivateView></main>;
}
