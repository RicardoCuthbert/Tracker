'use server';

import { verifiedSession } from '@/lib/supabase/session';
import { financeReader, validWorkspaceId } from '@/lib/supabase/finance';

export async function recheckPrivateAccess(actor: string, workspace: string): Promise<'allowed' | 'changed' | 'denied' | 'unavailable'> {
  const session = await verifiedSession();
  if (!session.ok) return session.reason === 'unavailable' ? 'unavailable' : 'changed';
  if (session.user.id !== actor) return 'changed';
  if (typeof workspace !== 'string' || !validWorkspaceId(workspace)) return 'denied';
  const result = await financeReader(session.client).workspace(workspace);
  return result.ok ? 'allowed' : result.error.kind === 'denied' ? 'denied' : 'unavailable';
}
