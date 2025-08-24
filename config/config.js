/**
 * Copy to config.js and replace placeholders for local development.
 * In production, provide these values via environment variables.
 */
export const ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302'] }, // Example STUN server
  // { urls: 'turns:turn.example.com:5349', username: 'user', credential: 'pass' }, // Example TURN server
];

const env = typeof process !== 'undefined' ? process.env : {};

export const SUPABASE_PROJECT_ID = env.SUPABASE_PROJECT_ID || 'cewbeibfnhszhywssbtq';
export const SUPABASE_URL =
  env.SUPABASE_URL || 'https://cewbeibfnhszhywssbtq.supabase.co';
export const SUPABASE_ANON_KEY =
  env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNld2JlaWJmbmhzemh5d3NzYnRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NjA4NzYsImV4cCI6MjA3MTUzNjg3Nn0.8krynDDOAxV12xkcgSBsQ-qxb3JrDysjQkzggFzPpPg';
export const TELEGRAM_BOT_USERNAME =
  env.TELEGRAM_BOT_USERNAME || 'YOUR_BOT';
export const TELEGRAM_BOT_TOKEN =
  env.TELEGRAM_BOT_TOKEN ||
  '8338260347:AAFaqaEfiWkIMISuvoZW2FTk5yaHwgwWxj0';
