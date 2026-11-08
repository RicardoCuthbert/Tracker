"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { authConfig } from "@/lib/supabase/config";
import { credentials } from "@/lib/supabase/credentials";

export async function signInPassword(_state: { message: string }, form: FormData) {
  const input = credentials(form);
  if (!input) return { message: 'Enter a valid email and password.' };
  if (!authConfig()) return { message: 'Authentication is unavailable.' };
  try {
    const client = await createClient();
    const { error } = await client.auth.signInWithPassword(input);
    if (error) return { message: 'Sign-in failed. Check your credentials and confirm your email.' };
  } catch { return { message: 'Authentication could not be reached. Try again.' }; }
  revalidatePath('/', 'layout');
  redirect('/auth/ready');
}

export async function signUp(_state: { message: string }, form: FormData) {
  const input = credentials(form);
  if (!input || input.password.length < 8) return { message: 'Enter a valid email and a password of at least 8 characters.' };
  const config = authConfig();
  if (!config) return { message: 'Authentication is unavailable.' };
  let authenticated = false;
  try {
    const client = await createClient();
    const { data, error } = await client.auth.signUp({ ...input, options: { emailRedirectTo: `${config.site}/auth/callback` } });
    if (error) return { message: 'Signup could not be completed. Try again or sign in with an existing account.' };
    authenticated = Boolean(data.session);
  } catch { return { message: 'Authentication could not be reached. Try again.' }; }
  if (authenticated) {
    revalidatePath('/', 'layout');
    redirect('/auth/ready');
  }
  return { message: 'Check your email for confirmation. If you already have an account, sign in.' };
}

export async function signInGoogle() {
  const config = authConfig();
  if (!config) redirect("/sign-in?status=unavailable");
  let destination: string | undefined;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${config.site}/auth/callback`, queryParams: { prompt: "select_account" } },
    });
    if (!error && data.url) destination = data.url;
  } catch { /* Show only a safe provider failure. */ }
  redirect(destination ?? '/sign-in?status=failed');
}

export async function signOut() {
  let failed = false;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    failed = Boolean(error);
  } catch { failed = true; }
  if (failed) redirect("/auth/ready?status=signout-failed");
  revalidatePath("/", "layout");
  redirect("/sign-in");
}
