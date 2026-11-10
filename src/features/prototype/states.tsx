"use client";

import { AlertCircle, Hourglass } from "lucide-react";
import { EmptyState } from "@/components/brand/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrototype } from "./context";

export function ContentState({ children, requireSnapshot = true, empty }: { children: React.ReactNode; requireSnapshot?: boolean; empty?: React.ReactNode }) {
  const { preview, setPreview, snapshot, month } = usePrototype();
  if (preview === "loading") return <section className="panel state-panel" role="status" aria-label="Loading preview"><Hourglass size={24} aria-hidden="true" /><h2>Loading your overview</h2><p>Loading state preview. No financial values are shown.</p><div className="skeleton-grid" aria-hidden="true"><Skeleton className="h-10 w-full" /><Skeleton className="h-32 w-full" /><Skeleton className="h-8 w-2/3" /></div><Button variant="outline" onClick={() => setPreview("ready")}>Finish preview</Button></section>;
  if (preview === "error") return <section className="panel state-panel" role="alert"><AlertCircle size={28} aria-hidden="true" /><h2>We couldn’t load this view</h2><p>Simulated error. Your sample data is still here. Retry to return to the ready state.</p><Button onClick={() => setPreview("ready")}>Retry</Button></section>;
  if (preview === "empty" || (requireSnapshot && !snapshot)) return <section className="panel">{empty ?? <EmptyState heading="h2" title="No sample activity for this month" description={`${month > "2026-11" ? "Cash projection unavailable. " : ""}Try November 2026 to explore the sample overview. Empty does not mean your balance is zero.`} action={<EmptyAction />} />}</section>;
  return children;
}
function EmptyAction() { const { setPreview, setMonth } = usePrototype(); return <Button onClick={() => { setPreview("ready"); setMonth("2026-11"); }}>View sample month</Button>; }
