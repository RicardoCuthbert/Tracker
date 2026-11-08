import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/supabase/database.types.ts';
import { financialError } from '../../lib/supabase/errors.ts';
import type { FinancialCommand } from './validation.ts';

export type SaveState = { status: 'idle' | 'saved' | 'invalid' | 'uncertain' | 'conflict' | 'denied'; message: string; errors?: Record<string, string> };
const uncertain: SaveState = { status: 'uncertain', message: 'Save could not be confirmed. Retry this exact operation before changing the draft or leaving.' };

export async function writeFinancialCommand(client: SupabaseClient<Database>, command: FinancialCommand): Promise<SaveState> {
  try {
    // Keep the discriminated argument types; all RPCs reauthorize and commit atomically.
    const response = command.name === 'save_transaction' ? await client.rpc(command.name, command.args)
      : command.name === 'save_financial_record' ? await client.rpc(command.name, command.args)
      : await client.rpc(command.name, command.args);
    if (response.error) {
      const code = response.error.code;
      if (code === '40001') return { status: 'conflict', message: 'Record or operation changed. Reload and compare before saving again.' };
      if (code === '42501') return { status: 'denied', message: 'Financial access is unavailable. Return to your workspaces.' };
      if (code.startsWith('22') || code.startsWith('23')) return { status: 'invalid', message: 'Save rejected. Check account opening dates, active accounts, category type and linked refunds; reload if they changed.' };
      if (financialError(response.error).kind === 'database_unavailable') return { status: 'invalid', message: 'Workspace service is not ready. Contact the project owner.' };
      return uncertain;
    }
    const row = response.data;
    const expectedId = command.name === 'void_transaction' ? command.args.item
      : (command.args.p as Record<string, unknown>).id;
    if (!row || typeof row !== 'object' || Array.isArray(row) || row.workspace_id !== command.args.w || row.id !== expectedId ||
      typeof row.version !== 'string' || !/^[1-9][0-9]*$/.test(row.version)) return uncertain;
    return { status: 'saved', message: command.name === 'void_transaction' ? 'Transaction voided. Balances updated; history retained.' : 'Saved to Supabase. Recorded balances updated.' };
  } catch { return uncertain; }
}
