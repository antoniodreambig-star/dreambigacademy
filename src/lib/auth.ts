import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';
import { RULES_VERSION } from '@/lib/rules';

/** Signed-in profile without forcing the username/password setup (used by /welcome itself). */
export async function requireProfileRaw() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) redirect('/login');
  return { supabase, profile: profile as Profile };
}

/** Everyone must pick a username + password once, right after their first email-link sign-in. */
export async function requireProfile() {
  const ctx = await requireProfileRaw();
  if (!ctx.profile.username) redirect('/welcome');
  if (ctx.profile.role === 'student' && ctx.profile.rules_version !== RULES_VERSION) redirect('/rules');
  return ctx;
}

export async function requireInstructor() {
  const ctx = await requireProfile();
  if (ctx.profile.role !== 'instructor') redirect('/');
  return ctx;
}

export async function requireStudent() {
  const ctx = await requireProfile();
  if (ctx.profile.role !== 'student') redirect('/admin');
  return ctx;
}
