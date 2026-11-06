import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Cohort, Profile } from '@/lib/types';
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

/** Owner = the main instructor account. Only the owner can add or remove other instructors. */
export async function requireOwner() {
  const ctx = await requireInstructor();
  const { data } = await ctx.supabase.rpc('is_owner');
  if (data !== true) redirect('/admin');
  return ctx;
}

/** Online-only students. In-person students (and the instructor) are sent to their own home page. */
export async function requireOnlineStudent() {
  const ctx = await requireStudent();
  if (!ctx.profile.cohort_id) redirect('/home');
  const { data } = await ctx.supabase.from('cohorts').select('*').eq('id', ctx.profile.cohort_id).single();
  const cohort = data as Cohort | null;
  if (!cohort || cohort.format !== 'online') redirect('/home');
  return { ...ctx, cohort };
}
