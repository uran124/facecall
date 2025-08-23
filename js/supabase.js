import { SUPABASE_URL, SUPABASE_ANON_KEY } from '/config/config.js';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export { sb };