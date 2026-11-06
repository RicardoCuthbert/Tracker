import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authConfig } from "./config";
import type { Database } from "./database.types";

export async function createClient() {
  const config = authConfig();
  if (!config) throw new Error("Authentication is not configured");
  const store = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => {
        // Server Components cannot set cookies; Proxy refreshes those requests.
        try { values.forEach(({ name, value, options }) => store.set(name, value, options)); }
        catch (error) {
          if (!(error instanceof Error) || !error.message.includes("Cookies can only be modified")) throw error;
        }
      },
    },
  });
}
