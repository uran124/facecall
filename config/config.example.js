/**
 * Copy to config.js and replace placeholders for local development.
 * In production, provide these values via environment variables.
 */
export const ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302'] }, // Example STUN server
  // { urls: 'turns:turn.example.com:5349', username: 'user', credential: 'pass' }, // Example TURN server
];

const env = typeof process !== 'undefined' ? process.env : {};

export const SUPABASE_PROJECT_ID = env.SUPABASE_PROJECT_ID || '<your-project-id>';
export const SUPABASE_URL = env.SUPABASE_URL || 'https://<your-project-ref>.supabase.co';
export const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || '<your-anon-key>';
export const TELEGRAM_BOT_USERNAME = env.TELEGRAM_BOT_USERNAME || '<your-bot-username>';
export const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN || '<your-bot-token>';
