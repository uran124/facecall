import { SUPABASE_URL, SUPABASE_ANON_KEY } from '/config/config.js';

export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
