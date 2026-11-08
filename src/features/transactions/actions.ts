'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { verifiedSession } from '@/lib/supabase/session';
import { jakartaDate } from '@/lib/prototype';
import { validateFinancialForm } from './validation';
import { writeFinancialCommand, type SaveState } from './write';

export async function saveFinancial(_previous: SaveState, form: FormData): Promise<SaveState> {
  const session = await verifiedSession();
  if (!session.ok) {
    if (session.reason !== 'unavailable') redirect('/sign-in');
    return { status: 'uncertain', message: 'Authentication could not be verified. Retry this operation.' };
  }
  if (!(form instanceof FormData)) return { status: 'invalid', message: 'Invalid financial request.' };
  const input = validateFinancialForm(form, jakartaDate(new Date()));
  if (!input.ok) return { status: 'invalid', message: input.message, errors: input.errors };
  if (input.actor !== session.user.id) return { status: 'denied', message: 'Your identity changed. Return to your workspaces.' };
  const result = await writeFinancialCommand(session.client, input.command);
  if (result.status === 'saved') revalidatePath(`/w/${input.workspace}`);
  return result;
}
