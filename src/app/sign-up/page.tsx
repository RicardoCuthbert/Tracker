import { BrandLogo } from '@/components/brand/brand-logo';
import Link from 'next/link';
import { authConfig } from '@/lib/supabase/config';
import { AuthForm } from '@/features/workspaces/auth-form';
import { SessionChanged } from '@/features/workspaces/session-controls';

export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  return <main className="content min-h-dvh grid place-items-center"><section className="panel w-full max-w-md">
    <BrandLogo className="mb-8" /><SessionChanged /><h1>Create your account</h1><p>Confirm your email to receive your private personal workspace.</p>
    <AuthForm signup configured={Boolean(authConfig())} /><Link className="text-link" href="/sign-in">Already have an account? Sign in</Link>
  </section></main>;
}
