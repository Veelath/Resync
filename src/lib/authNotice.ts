import type { User } from '@supabase/supabase-js';
import type { QuickNotice } from './notify';

export function authNotice(user: Pick<User, 'created_at' | 'last_sign_in_at' | 'user_metadata'> | null, action: 'signup' | 'signin' | 'refresh', now = Date.now()): QuickNotice | null {
  if (!user || action === 'refresh') return null;
  const created = Date.parse(user.created_at);
  const signedIn = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : created;
  // shortcut: timestamps approximate a first sign-in, use an authoritative sign-in count if available.
  const isNew = action === 'signup' || (now >= created && now - created <= 5 * 60_000 && signedIn >= created && signedIn - created <= 10_000);
  const meta = user.user_metadata;
  const firstName = (meta?.first_name || meta?.given_name || meta?.full_name?.trim().split(/\s+/)[0] || '').trim();
  return isNew
    ? { kind: 'success', title: 'Account created', message: firstName ? `Welcome to Resync, ${firstName}!` : 'Welcome to Resync!' }
    : { kind: 'success', title: 'Signed in successfully', message: firstName ? `Welcome back, ${firstName}!` : 'Welcome back!' };
}
