import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { verifiedSession } from "@/lib/supabase/session";
import { financeReader } from "@/lib/supabase/finance";
import { financialError } from "@/lib/supabase/errors";
import { FinancialNotice } from "@/features/workspaces/views";
import { SessionChanged, SignOutButton } from "@/features/workspaces/session-controls";

export const dynamic = "force-dynamic";

export default async function AuthReadyPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await verifiedSession();
  if (!session.ok) {
    if (session.reason !== 'unavailable') redirect(session.reason === 'configuration' ? "/sign-in?status=unavailable" : "/sign-in");
    return <main className="content"><FinancialNotice error={financialError(null)} retry="/auth/ready" /></main>;
  }
  const access = await financeReader(session.client).provisionPersonal();
  const { status } = await searchParams;
  return <main className="content grid gap-6"><SessionChanged /><h1>Authentication confirmed.</h1><p className="break-all">{session.user.email}</p>
    {access.ok ? <><p>Your personal workspace access is confirmed.</p><Button asChild><a href="/workspaces">Open authorized workspaces</a></Button></> : <FinancialNotice error={access.error} retry="/auth/ready" />}
    {status === "signout-failed" && <p role="alert">Sign-out failed. Try again.</p>}
    <SignOutButton /><Button asChild variant="outline"><Link href="/" prefetch={false}>Explore separate sample workspace</Link></Button></main>;
}
