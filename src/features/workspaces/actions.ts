'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { verifiedSession } from '@/lib/supabase/session';
import { validWorkspaceId } from '@/lib/supabase/finance';

export async function manageWorkspace(_state: { message: string }, form: FormData) {
  const session = await verifiedSession();
  if (!session.ok) {
    if (session.reason === 'signed_out' || session.reason === 'configuration') redirect('/sign-in');
    return { message: 'Authentication could not be verified. Try again.' };
  }
  if (!(form instanceof FormData)) return { message: 'Invalid workspace action.' };
  const operation = form.get('operation');
  const w = form.get('workspace');
  const recipient = form.get('recipient');
  const invitation = form.get('invitation');
  let message: string;
  try {
    if (operation === 'create') {
      const { error } = await session.client.rpc('create_shared_workspace');
      if (error) return { message: 'Shared workspace creation could not be confirmed. Reload and try again.' };
      message = 'Shared workspace created.';
    } else if (operation === 'invite') {
      if (typeof w !== 'string' || !validWorkspaceId(w) || typeof recipient !== 'string' || !validWorkspaceId(recipient))
        return { message: 'Enter the recipient’s valid user ID.' };
      // User-scoped RPC checks shared ownership and capacity again under a row lock.
      const { error } = await session.client.rpc('invite_member', { w, recipient });
      if (error) return { message: 'Invitation unavailable. Check the user ID, existing membership and available seats.' };
      message = 'Invitation saved. The recipient must accept it in their workspace list.';
    } else if (operation === 'accept') {
      if (typeof invitation !== 'string' || !validWorkspaceId(invitation)) return { message: 'Invalid invitation.' };
      const { error } = await session.client.rpc('accept_invite', { invitation });
      if (error) return { message: 'Invitation unavailable. It may have expired, changed or reached capacity. Reload before retrying.' };
      message = 'Invitation accepted. Shared access is confirmed.';
    } else return { message: 'Invalid workspace action.' };
  } catch { return { message: 'The service could not be reached. Reload to check whether the operation completed.' }; }
  revalidatePath('/workspaces');
  return { message };
}
