import Link from "next/link";
import { ArrowRight, BookOpen, Info, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authConfig } from "@/lib/supabase/config";
import { signInGoogle } from "../auth/actions";
import { SessionChanged } from "@/features/workspaces/session-controls";

export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const configured = Boolean(authConfig());
  const { status } = await searchParams;
  return <main className="auth-page"><section className="auth-story"><Link href="/" className="brand"><span className="brand-mark"><BookOpen size={20} aria-hidden="true" /></span>Finance Planner</Link><div><p className="small">Warm Ledger</p><p className="auth-lede editorial">A little clarity.<br />A little more room to live.</p><p>A considered space for your own finances, and the life you share.</p><div className="border-t mt-12 pt-8"><p className="editorial text-[22px] leading-[30px]">One month at a time.</p><p className="small mt-4">Understand the everyday. Make room for what matters.</p></div></div><p className="small">Financial screens · Sample data only</p></section><section className="auth-form-side"><div className="auth-form"><div className="goal-icon mb-8"><LockKeyhole size={20} aria-hidden="true" /></div><h1>Welcome back.</h1><p className="muted">A quieter moment with your money.</p>
    <SessionChanged /><form action={signInGoogle}><Button type="submit" disabled={!configured} className="w-full">Continue with Google</Button></form>
    {status === "failed" && <p role="alert">Sign-in failed or workspace access is unavailable. Try your approved Google account.</p>}
    <div className="notice"><Info size={18} aria-hidden="true" /><p>{configured ? "Workspace access requires an approved identity. Financial screens still show sample data." : "Google sign-in is unavailable until authentication is configured. You can explore sample data below."}</p></div><Button asChild variant="outline" className="mt-6 w-full"><Link href="/">Explore sample workspace<ArrowRight size={16} aria-hidden="true" /></Link></Button></div></section></main>;
}
