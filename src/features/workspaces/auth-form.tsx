'use client';

import { useActionState } from 'react';
import { signInPassword, signUp } from '@/app/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AuthForm({ signup = false, configured }: { signup?: boolean; configured: boolean }) {
  const [state, action, pending] = useActionState(signup ? signUp : signInPassword, { message: '' });
  return <form action={action} className="grid gap-4 my-6">
    <div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required maxLength={320} /></div>
    <div className="grid gap-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={signup ? 8 : 1} maxLength={1024} /></div>
    <Button disabled={!configured || pending}>{pending ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</Button>
    <p role="status" aria-live="polite">{state.message}</p>
  </form>;
}
