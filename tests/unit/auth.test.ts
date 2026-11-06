import assert from "node:assert/strict";
import { test } from "node:test";
import { authConfig } from "../../src/lib/supabase/config.ts";

test("auth configuration uses publishable keys and a fixed safe callback origin", () => {
  const env = { NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_placeholder", SITE_URL: "http://127.0.0.1:3000" };
  assert.deepEqual(authConfig(env), { url: env.NEXT_PUBLIC_SUPABASE_URL, key: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, site: env.SITE_URL });
  for (const bad of [{ SITE_URL: undefined }, { SITE_URL: "//evil.test" }, { SITE_URL: "http://evil.test" },
    { SITE_URL: "https://example.test/auth?next=evil" }, { SITE_URL: "https://user:pass@example.test" },
    { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_placeholder" }, { NEXT_PUBLIC_SUPABASE_URL: "javascript:alert(1)" }]) {
    assert.equal(authConfig({ ...env, ...bad }), null);
  }
});
