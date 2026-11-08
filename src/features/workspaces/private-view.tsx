'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { sessionChannel, watchPrivateView } from './privacy';
import { PortalContainer, PortalConcealed } from '@/components/ui/portal-container';
import { recheckPrivateAccess } from './recheck';

export function PrivateView({ children, verification, actor }: { children: React.ReactNode; verification: string; actor: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [hidden, setHidden] = useState(false);
  const [discarded, setDiscarded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [stale, setStale] = useState(false);
  const [lastVerification, setLastVerification] = useState(verification);
  // A new server render has rechecked the identity and workspace permissions.
  if (lastVerification !== verification) {
    setLastVerification(verification); setHidden(false); setDiscarded(false); setUnavailable(false); setStale(false);
  }
  const resume = useCallback(async () => {
    if (!container?.querySelector('[role="dialog"]')) { router.refresh(); return; }
    // Reauthorize without replacing a live draft with an error/loading page.
    let result: Awaited<ReturnType<typeof recheckPrivateAccess>>;
    try { result = await recheckPrivateAccess(actor, pathname.split('/')[2] ?? ''); }
    catch { result = 'unavailable'; }
    if (result === 'allowed') { setHidden(false); setUnavailable(false); setStale(true); }
    else if (result === 'unavailable') setUnavailable(true);
    else { setDiscarded(true); router.refresh(); }
  }, [actor, container, pathname, router]);
  const subscribe = useCallback((notify: () => void) => {
    const hide = () => { setHidden(true); notify(); };
    const recheck = () => { setDiscarded(true); hide(); router.refresh(); };
    const cleanup = watchPrivateView(window, document, hide, () => { void resume(); });
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(sessionChannel) : null;
    if (channel) channel.onmessage = recheck;
    return () => { cleanup(); channel?.close(); };
  }, [router, resume]);
  // SSR starts hidden; the browser must have focus before revealing a verified view.
  const active = useSyncExternalStore(subscribe,
    () => document.hasFocus() && document.visibilityState === 'visible', () => false);
  const concealed = hidden || !active;
  return <>{concealed && <div role="status"><p>{unavailable ? 'Access verification unavailable. Your draft is concealed.' : 'Verifying access…'}</p>{unavailable && <button onClick={() => { void resume(); }}>Retry access verification</button>}</div>}
    {!concealed && stale && <p role="status">Access verified. Displayed records may have changed while away; saves check revisions. Reload after resolving your draft to refresh all records.</p>}
    <PortalConcealed.Provider value={concealed}><PortalContainer.Provider value={container ?? undefined}><div ref={setContainer} hidden={concealed} inert={concealed}>{discarded ? null : children}</div></PortalContainer.Provider></PortalConcealed.Provider></>;
}
