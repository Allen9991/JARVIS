"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getRedirectPath(formData: FormData) {
  const redirectTo = getString(formData, "redirectTo");
  return redirectTo.startsWith("/") ? redirectTo : "/dashboard";
}

export async function signUpWithPassword(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const email = getString(formData, "email");
  const password = getString(formData, "password");

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: "/auth/callback"
    }
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/onboarding/organisation");
}

export async function signInWithPassword(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const redirectTo = getRedirectPath(formData);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(redirectTo);
}

export async function sendMagicLink(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const email = getString(formData, "email");
  const redirectTo = getRedirectPath(formData);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`
    }
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?message=Check your email for a magic link.");
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const redirectTo = getRedirectPath(formData);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`
    }
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data.url) {
    redirect(data.url);
  }

  redirect("/login?error=Google sign in did not return a redirect URL.");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
