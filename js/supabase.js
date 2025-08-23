import { SUPABASE_URL, SUPABASE_ANON_KEY } from '/config/config.js';

export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, detectSessionInUrl: false },
  global: { headers: {} }
});

export function setAuthToken(accessToken) {
  sb.rest.headers = { ...sb.rest.headers, Authorization: `Bearer ${accessToken}` };
  sb.realtime.setAuth(accessToken);
  localStorage.setItem('sb_tg_token', accessToken);
}

const savedToken = localStorage.getItem('sb_tg_token');
if (savedToken) setAuthToken(savedToken);
