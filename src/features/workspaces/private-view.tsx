'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { sessionChannel, watchPrivateView } from './privacy';

export function PrivateView({ children }: { children: React.ReactNode }) {
  const [invalidated, setInvalidated] = useState(false);
  const subscribe = useCallback((notify: () => void) => {
    const hide = () => { setInvalidated(true); notify(); };
    const recheck = () => { hide(); window.location.reload(); };
    const cleanup = watchPrivateView(window, document, hide, () => window.location.reload());
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(sessionChannel) : null;
    if (channel) channel.onmessage = recheck;
    return () => { cleanup(); channel?.close(); };
  }, []);
  // SSR starts hidden; the browser must have focus before revealing a verified view.
  const active = useSyncExternalStore(subscribe,
    () => document.hasFocus() && document.visibilityState === 'visible', () => false);
  return invalidated || !active ? <p role="status">Verifying access…</p> : children;
}
