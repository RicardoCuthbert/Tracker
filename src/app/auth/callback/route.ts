import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authConfig } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  const config = authConfig();
  if (!config) return new NextResponse("Authentication unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  const code = request.nextUrl.searchParams.get("code");
  const supabase = await createClient();
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user }, error: identityError } = await supabase.auth.getUser();
      if (!identityError && user?.email_confirmed_at) {
        // Authentication success is separate from allowlist/database readiness.
        return NextResponse.redirect(`${config.site}/auth/ready`, { headers: { "Cache-Control": "private, no-store" } });
      }
      await supabase.auth.signOut();
    }
  }
  // Fixed local destination. Never trust forwarded hosts or a caller's next URL.
  return NextResponse.redirect(`${config.site}/sign-in?status=failed`, { headers: { "Cache-Control": "private, no-store" } });
}
