import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() { return <div role="status" aria-label="Loading page" className="skeleton-grid"><p className="muted">Loading page…</p><Skeleton className="h-10 w-1/3" /><Skeleton className="h-32 w-full" /><Skeleton className="h-72 w-full" /></div>; }
