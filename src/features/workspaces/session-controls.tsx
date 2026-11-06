'use client';

import { useEffect } from 'react';
import { signOut } from '@/app/auth/actions';
import { Button } from '@/components/ui/button';
import { sessionChannel } from './privacy';

function invalidateOtherWindows() {
  if (typeof BroadcastChannel === 'undefined') return;
  const channel = new BroadcastChannel(sessionChannel);
  channel.postMessage('recheck'); channel.close();
}

export function SessionChanged() {
  useEffect(() => { invalidateOtherWindows(); }, []);
  return null;
}

export function SignOutButton() {
  return <form action={signOut} onSubmit={invalidateOtherWindows}><Button variant="outline">Sign out</Button></form>;
}
