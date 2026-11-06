import { authConfig } from './config';
import { createClient } from './server';

export async function verifiedSession() {
  if (!authConfig()) return { ok: false, reason: 'configuration' } as const;
  try {
    const client = await createClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error) return { ok: false, reason: error.name === 'AuthSessionMissingError' || error.status === 401 || error.status === 403 ? 'signed_out' : 'unavailable' } as const;
    if (!user?.email_confirmed_at) return { ok: false, reason: 'signed_out' } as const;
    return { ok: true, client, user } as const;
  } catch { return { ok: false, reason: 'unavailable' } as const; }
}
