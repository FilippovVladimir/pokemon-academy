// Прогресс игрока. Гость хранит всё в localStorage; вошедший пользователь — ещё и в облаке (Supabase).
// Все обращения к localStorage в try/catch: в приватном режиме хранилище может быть недоступно.
import * as cloud from './cloud.js';

const GUEST_KEY = 'pokeacademy:v1';
const SESSION_KEY = 'pokeacademy:session';
const userKey = nick => 'pokeacademy:u:' + nick.toLowerCase();
const LEARNED = 2; // сколько правильных ответов подряд нужно, чтобы вопрос считался выученным

const empty = () => ({ caught: [], quiz: {}, team: [], seen: [], items: {} });
const readLS = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const writeLS = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };

let session = cloud.cloudEnabled ? readLS(SESSION_KEY) : null; // { nick, token }
let state, caughtSet, seenSet;
let syncStatus = session ? 'loading' : 'local'; // local | loading | saving | saved | error
let syncError = '';
const listeners = new Set();
const emit = () => listeners.forEach(f => f());

function setState(s) {
  state = Object.assign(empty(), s || {});
  caughtSet = new Set(state.caught);
  seenSet = new Set(state.seen);
}
setState(readLS(session ? userKey(session.nick) : GUEST_KEY));

let saveTimer;
function save() {
  writeLS(session ? userKey(session.nick) : GUEST_KEY, state);
  if (!session) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(pushCloud, 1500);
}
async function pushCloud(keepalive = false) {
  clearTimeout(saveTimer); saveTimer = null;
  if (!session) return;
  syncStatus = 'saving'; emit();
  try { await cloud.save(session.token, state, keepalive); syncStatus = 'saved'; syncError = ''; }
  catch (e) { syncStatus = 'error'; syncError = e.message; }
  emit();
}
// Не терять последние изменения при закрытии вкладки
document.addEventListener('visibilitychange', () => { if (document.hidden && saveTimer) pushCloud(true); });

// Объединение прогресса с двух устройств: ничего не теряем, берём лучшее
function merge(a, b) {
  a = Object.assign(empty(), a); b = Object.assign(empty(), b);
  const quiz = { ...a.quiz };
  for (const [id, s] of Object.entries(b.quiz)) {
    const x = quiz[id] || {};
    quiz[id] = Object.fromEntries(['played', 'answered', 'correct', 'best', 'bestStreak'].map(k => [k, Math.max(x[k] || 0, s[k] || 0)]));
  }
  const items = structuredClone(a.items);
  for (const [id, m] of Object.entries(b.items)) {
    items[id] ||= {};
    for (const [k, it] of Object.entries(m)) {
      const x = items[id][k];
      if (!x || (it.t || 0) > (x.t || 0)) items[id][k] = it;
    }
  }
  return {
    caught: [...new Set([...a.caught, ...b.caught])],
    seen: [...new Set([...a.seen, ...b.seen])],
    team: a.team.length ? a.team : b.team,
    quiz, items,
  };
}

async function syncFromCloud() {
  if (!session) return;
  syncStatus = 'loading'; emit();
  try {
    const r = await cloud.load(session.token);
    setState(merge(state, r.data));
    writeLS(userKey(session.nick), state);
    await pushCloud();
  } catch (e) {
    syncStatus = 'error'; syncError = e.message;
    if (/Сессия устарела/.test(e.message)) logoutLocal();
  }
  emit();
}
function logoutLocal() {
  session = null; writeLS(SESSION_KEY, null);
  setState(readLS(GUEST_KEY)); syncStatus = 'local';
}
if (session) syncFromCloud();

export const store = {
  // --- профиль ---
  cloudEnabled: cloud.cloudEnabled,
  user: () => session?.nick || null,
  sync: () => ({ status: syncStatus, error: syncError }),
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  async register(nick, pass, keepGuest) {
    const r = await cloud.register(nick, pass);
    const guest = readLS(GUEST_KEY);
    session = { nick: r.nick, token: r.token }; writeLS(SESSION_KEY, session);
    setState(keepGuest ? guest : empty());
    if (keepGuest) writeLS(GUEST_KEY, null);
    writeLS(userKey(r.nick), state);
    await pushCloud(); emit();
  },
  async login(nick, pass) {
    const r = await cloud.login(nick, pass);
    session = { nick: r.nick, token: r.token }; writeLS(SESSION_KEY, session);
    setState(readLS(userKey(r.nick)));
    await syncFromCloud();
  },
  logout() { if (saveTimer) pushCloud(true); logoutLocal(); emit(); },
  leaderboard: () => cloud.leaderboard(),

  // --- изученные покемоны ---
  isCaught: id => caughtSet.has(id),
  catch(id) { if (!caughtSet.has(id)) { caughtSet.add(id); state.caught = [...caughtSet]; save(); return true; } return false; },
  caughtCount: () => caughtSet.size,
  caughtIds: () => caughtSet,
  see(id) { if (!seenSet.has(id)) { seenSet.add(id); state.seen = [...seenSet]; save(); } },
  seenCount: () => seenSet.size,

  // --- статистика квизов ---
  quizStats: id => state.quiz[id] || { played: 0, answered: 0, correct: 0, best: 0, bestStreak: 0 },
  allQuizStats: () => state.quiz,
  recordAnswer(id, ok) {
    const s = state.quiz[id] = store.quizStats(id);
    s.answered++; if (ok) s.correct++; save();
  },
  recordRound(id, score, streak) {
    const s = state.quiz[id] = store.quizStats(id);
    s.played++; s.best = Math.max(s.best, score); s.bestStreak = Math.max(s.bestStreak, streak); save();
  },

  // --- заучивание: по каждому вопросу { c: всего верно, w: всего ошибок, s: верно подряд, t: время } ---
  LEARNED,
  item: (id, key) => state.items[id]?.[key],
  recordItem(id, key, ok) {
    const m = state.items[id] ||= {};
    const it = m[key] ||= { c: 0, w: 0, s: 0, t: 0 };
    if (ok) { it.c++; it.s++; } else { it.w++; it.s = 0; }
    it.t = Date.now(); save();
  },
  // Ключи на повторение: сначала с ошибками, затем давно не встречавшиеся
  reviewKeys(id) {
    return Object.entries(state.items[id] || {})
      .filter(([, x]) => x.s < LEARNED)
      .sort(([, x], [, y]) => (y.w > 0) - (x.w > 0) || x.t - y.t)
      .map(([k]) => k);
  },
  itemSummary(id) {
    const all = Object.values(state.items[id] || {});
    return {
      seen: all.length,
      learned: all.filter(x => x.s >= LEARNED).length,
      review: all.filter(x => x.w > 0 && x.s < LEARNED).length,
    };
  },

  team: () => state.team.slice(),
  setTeam(ids) { state.team = ids.slice(0, 6); save(); },

  reset() { setState(empty()); save(); emit(); },
};
