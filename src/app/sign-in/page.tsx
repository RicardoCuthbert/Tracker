import { BrandLogo } from '@/components/brand/brand-logo';
import Link from "next/link";
import { ArrowRight, Info, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authConfig } from "@/lib/supabase/config";
import { signInGoogle } from "../auth/actions";
import { SessionChanged } from "@/features/workspaces/session-controls";
import { AuthForm } from "@/features/workspaces/auth-form";

export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const configured = Boolean(authConfig());
  const { status } = await searchParams;
  return <main className="auth-page"><section className="auth-story"><BrandLogo href="/" /><div><p className="small">Warm Ledger</p><p className="auth-lede editorial">A little clarity.<br />A little more room to live.</p><p>A considered space for your own finances, and the life you share.</p><div className="border-t mt-12 pt-8"><p className="editorial text-[22px] leading-[30px]">One month at a time.</p><p className="small mt-4">Understand the everyday. Make room for what matters.</p></div></div><p className="small">Financial screens · Sample data only</p></section><section className="auth-form-side"><div className="auth-form"><div className="goal-icon mb-8"><LockKeyhole size={20} aria-hidden="true" /></div><h1>Welcome back.</h1><p className="muted">A quieter moment with your money.</p>
    <SessionChanged /><AuthForm configured={configured} /><p><Link href="/sign-up" className="text-link">Create an account</Link></p><form action={signInGoogle} className="my-6"><Button type="submit" disabled={!configured} className="w-full">Continue with Google</Button></form>
    {status === "failed" && <p role="alert">Sign-in or email confirmation failed. Try again.</p>}
    <div className="notice"><Info size={18} aria-hidden="true" /><p>{configured ? "Verify your email to access your private workspace. Shared access requires accepting an invitation." : "Authentication is unavailable until configured. You can explore sample data below."}</p></div><Button asChild variant="outline" className="mt-6 w-full"><Link href="/">Explore sample workspace<ArrowRight size={16} aria-hidden="true" /></Link></Button></div></section></main>;
}
