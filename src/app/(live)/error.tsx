'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="panel grid gap-4" role="alert"><h2>Workspace unavailable</h2><p>Your financial data could not be displayed. No sample values are substituted.</p><Button onClick={reset}>Try again</Button></section>;
}
