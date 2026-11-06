import { Skeleton } from '@/components/ui/skeleton';
export default function Loading() {
  return <section className="panel grid gap-4" role="status"><h2>Loading workspace</h2><p>Verifying access and reading the database.</p><Skeleton className="h-12 w-full" /></section>;
}
