/**
 * auth-tg.js
 * Telegram-based auth without GoTrue: obtain custom JWT from Edge Function and
 * use it with Supabase (REST + Realtime) via Authorization header.
 *
 * Usage:
 *   import { initTelegramAuthUI, getSupabaseClient, signOut } from './auth-tg.js'
 *   initTelegramAuthUI({ botUsername: 'YOUR_BOT', functionUrl: '/functions/v1/tg_login' })
 */

const isNode = typeof process !== 'undefined' && process.versions?.node;
const { createClient } = isNode
  ? await import('@supabase/supabase-js')
  : await import('https://esm.sh/@supabase/supabase-js@2');

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/config.js';

let supabase = null;
let accessToken = null;

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error('Supabase is not initialized. Call initTelegramAuthUI() first.');
  }
  return supabase;
}

async function createClientWithToken(token) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  supabase.realtime.setAuth(token);
}

// Restore session if token exists
(async function restore() {
  if (typeof localStorage === 'undefined') return;
  const t = localStorage.getItem('sb_tg_token');
  if (t) {
    accessToken = t;
    await createClientWithToken(t);
  }
})();

async function exchangeTelegramUser(functionUrl, tgUserPayload) {
  const res = await fetch(functionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tgUserPayload),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}

/**
 * Render Telegram Login Widget and handle callback.
 * Options:
 *  - botUsername: string (without @)
 *  - functionUrl: string (Edge Function endpoint)
 *  - containerId?: string (DOM id to mount the button)
 *  - onLogin?: (profile) => void
 */
export function initTelegramAuthUI(opts) {
  if (typeof document === 'undefined') {
    throw new Error('initTelegramAuthUI is only available in browser environments');
  }
  const { botUsername, functionUrl, containerId = 'login-root', onLogin } = opts;
  if (!botUsername || !functionUrl) throw new Error('botUsername and functionUrl are required');

  const mount = document.getElementById(containerId) || document.body;

  // Create placeholder
  const wrap = document.createElement('div');
  wrap.id = 'tg-login-wrap';
  wrap.style.display = 'flex';
  wrap.style.justifyContent = 'center';
  wrap.style.padding = '24px';
  mount.appendChild(wrap);

  // Inject widget script
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://telegram.org/js/telegram-widget.js?22';
  script.setAttribute('data-telegram-login', botUsername);
  script.setAttribute('data-size', 'large');
  script.setAttribute('data-userpic', 'true');
  script.setAttribute('data-request-access', 'write');
  script.setAttribute('data-onauth', 'onTelegramAuth(user)');
  wrap.appendChild(script);

  // Expose global callback for the widget
  window.onTelegramAuth = async function(user) {
    try {
      const { access_token, profile } = await exchangeTelegramUser(functionUrl, user);
      accessToken = access_token;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('sb_tg_token', access_token);
      }
      await createClientWithToken(access_token);
      if (typeof onLogin === 'function') onLogin(profile);
    } catch (e) {
      console.error('Telegram auth failed:', e);
      if (typeof alert === 'function') alert('Не удалось войти через Telegram: ' + e.message);
    }
  };
}

export function isAuthenticated() {
  return Boolean(accessToken);
}

export function signOut() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('sb_tg_token');
    }
  } finally {
    accessToken = null;
    supabase = null;
    if (typeof location !== 'undefined' && typeof location.reload === 'function') {
      location.reload();
    }
  }
}

/**
 * Helper: ensure current user joined a room.
 * Call after auth before subscribing to messages / starting calls.
 */
export async function ensureJoined(roomId) {
  if (!isAuthenticated()) throw new Error('Not authenticated');
  const { error } = await getSupabaseClient().rpc('join_room', { p_room_id: roomId });
  if (error) throw error;
}

/**
 * Helper: create a room (and become its owner).
 */
export async function createRoom(roomId, isPrivate = true) {
  if (!isAuthenticated()) throw new Error('Not authenticated');
  const { error } = await getSupabaseClient().rpc('create_room', { p_room_id: roomId, p_private: isPrivate });
  if (error) throw error;
}
