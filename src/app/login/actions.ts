'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const BAD = 'Wrong username or password. You can also use the email link below.';

export async function passwordSignIn(identifier: string, password: string): Promise<{ error?: string }> {
  const id = identifier.trim().toLowerCase();
  if (!id || !password) return { error: BAD };

  let email = id;
  if (!id.includes('@')) {
    const admin = createAdminClient();
    if (!admin) return { error: 'Username sign-in isn’t set up yet. Use the email link below.' };
    const { data } = await admin.from('profiles').select('email').eq('username', id).maybeSingle();
    if (!data?.email) return { error: BAD };
    email = data.email;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { error: BAD } : {};
}
