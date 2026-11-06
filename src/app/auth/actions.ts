"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { authConfig } from "@/lib/supabase/config";

export async function signInGoogle() {
  const config = authConfig();
  if (!config) redirect("/sign-in?status=unavailable");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${config.site}/auth/callback`, queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) redirect("/sign-in?status=failed");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) redirect("/auth/ready?status=signout-failed");
  revalidatePath("/", "layout");
  redirect("/sign-in");
}
