import { createClient, SupabaseClient } from '@supabase/supabase-js';

const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let clientInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (clientInstance) return clientInstance;

  const url = envUrl || (typeof localStorage !== 'undefined' ? localStorage.getItem('noto_supabase_url') || '' : '');
  const key = envKey || (typeof localStorage !== 'undefined' ? localStorage.getItem('noto_supabase_anon_key') || '' : '');

  if (url && key) {
    try {
      clientInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      return clientInstance;
    } catch (e) {
      console.warn('[Supabase] Failed to initialize client:', e);
      return null;
    }
  }

  return null;
}

export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null;
}

export function setCustomSupabaseConfig(url: string, key: string) {
  if (typeof localStorage !== 'undefined') {
    if (url && key) {
      localStorage.setItem('noto_supabase_url', url);
      localStorage.setItem('noto_supabase_anon_key', key);
    } else {
      localStorage.removeItem('noto_supabase_url');
      localStorage.removeItem('noto_supabase_anon_key');
    }
  }
  clientInstance = null;
  return getSupabase();
}
