export function authConfig(env: Record<string, string | undefined> = process.env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const site = env.SITE_URL;
  if (!url || !key || !site) return null;
  try {
    for (const value of [url, site]) {
      const parsed = new URL(value);
      if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") return null;
      if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname))) return null;
    }
    if (!key.startsWith("sb_publishable_")) return null;
    return { url, key, site: new URL(site).origin };
  } catch { return null; }
}
