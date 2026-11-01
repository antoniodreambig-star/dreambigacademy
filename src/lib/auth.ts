import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

export async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) redirect('/login');
  return { supabase, profile: profile as Profile };
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
