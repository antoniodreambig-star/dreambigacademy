'use server';

import { redirect } from 'next/navigation';
import { requireProfileRaw } from '@/lib/auth';
import { RULES_VERSION } from '@/lib/rules';

export async function acceptRules(f: FormData) {
  const { supabase, profile } = await requireProfileRaw();
  const name = String(f.get('signed_name') ?? '').trim().slice(0, 120);
  const agree = f.get('agree') === '1';
  const under18 = f.get('under_18') === '1';
  const guardian = f.get('guardian') === '1';
  if (!agree || name.length < 2) redirect('/rules?err=agree');
  if (under18 && !guardian) redirect('/rules?err=guardian');
  const { error } = await supabase
    .from('profiles')
    .update({ rules_version: RULES_VERSION, rules_accepted_at: new Date().toISOString(), rules_signed_name: name, under_18: under18, guardian_ack: under18 && guardian })
    .eq('id', profile.id);
  if (error) redirect('/rules?err=save');
  redirect('/');
}
