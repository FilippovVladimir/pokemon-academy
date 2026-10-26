// Вызовы SQL-функций Supabase (см. supabase/schema.sql) напрямую через REST, без SDK.
import { CONFIG } from './config.js';

export const cloudEnabled = !!(CONFIG.supabaseUrl && CONFIG.supabaseKey);

async function rpc(fn, args = {}, opts = {}) {
  const r = await fetch(`${CONFIG.supabaseUrl}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: CONFIG.supabaseKey,
      Authorization: `Bearer ${CONFIG.supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
    ...opts,
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.message || `Ошибка сервера (${r.status})`);
  }
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

export const register = (nick, pass) => rpc('pa_register', { p_nick: nick, p_pass: pass });
export const login = (nick, pass) => rpc('pa_login', { p_nick: nick, p_pass: pass });
export const load = token => rpc('pa_load', { p_token: token });
export const save = (token, data, keepalive = false) => rpc('pa_save', { p_token: token, p_data: data }, { keepalive });
export const leaderboard = () => rpc('pa_leaderboard');
