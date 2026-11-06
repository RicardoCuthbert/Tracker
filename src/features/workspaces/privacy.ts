export const sessionChannel = 'finance-session-invalidation';

export function watchPrivateView(page: Window, doc: Document, hide: () => void, reload: () => void) {
  const recheck = () => { hide(); reload(); };
  const visibility = () => { if (doc.visibilityState === 'hidden') hide(); else recheck(); };
  const restored = (event: PageTransitionEvent) => { if (event.persisted) recheck(); };
  page.addEventListener('blur', hide);
  page.addEventListener('focus', recheck);
  doc.addEventListener('visibilitychange', visibility);
  page.addEventListener('pageshow', restored);
  return () => {
    page.removeEventListener('blur', hide); page.removeEventListener('focus', recheck);
    doc.removeEventListener('visibilitychange', visibility); page.removeEventListener('pageshow', restored);
  };
}
