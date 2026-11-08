'use client';

import { useActionState } from 'react';
import { manageWorkspace } from './actions';
import { Button } from '@/components/ui/button';

export function ManagementForm({ operation, label, children }: { operation: 'create' | 'invite' | 'accept'; label: string; children?: React.ReactNode }) {
  const [state, action, pending] = useActionState(manageWorkspace, { message: '' });
  return <form action={action} className="grid gap-3">
    <input type="hidden" name="operation" value={operation} />{children}
    <Button disabled={pending}>{pending ? 'Saving…' : label}</Button>
    <p role="status" aria-live="polite">{state.message}</p>
  </form>;
}
