// Прогресс игроков. Всё хранится в localStorage этого устройства: можно завести несколько игроков
// и перенести любого на другое устройство кодом (см. exportCode / importCode).
// Все обращения к localStorage в try/catch: в приватном режиме хранилище может быть недоступно.
const LEGACY_KEY = 'pokeacademy:v1';
const PROFILES_KEY = 'pokeacademy:profiles';
const dataKey = id => 'pokeacademy:p:' + id;
const LEARNED = 2; // сколько правильных ответов подряд нужно, чтобы вопрос считался выученным

const empty = () => ({ caught: [], quiz: {}, team: [], seen: [], items: {} });
const readLS = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const writeLS = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// { current, list: [{ id, name }] }; прогресс старой версии становится первым игроком
let profiles = readLS(PROFILES_KEY);
if (!profiles?.list?.length) {
  const id = newId();
  profiles = { current: id, list: [{ id, name: 'Игрок 1' }] };
  writeLS(dataKey(id), readLS(LEGACY_KEY) || empty());
  writeLS(LEGACY_KEY, null);
  writeLS(PROFILES_KEY, profiles);
}
if (!profiles.list.some(p => p.id === profiles.current)) profiles.current = profiles.list[0].id;

let state, caughtSet, seenSet;
const listeners = new Set();
const emit = () => listeners.forEach(f => f());

function setState(s) {
  state = Object.assign(empty(), s || {});
  // Ранние версии хранили время в миллисекундах
  for (const m of Object.values(state.items)) for (const it of Object.values(m)) if (it.t > 1e10) it.t = Math.floor(it.t / 6e4);
  caughtSet = new Set(state.caught);
  seenSet = new Set(state.seen);
}
setState(readLS(dataKey(profiles.current)));
const save = () => writeLS(dataKey(profiles.current), state);
const saveProfiles = () => writeLS(PROFILES_KEY, profiles);

// Объединение прогресса (при импорте в существующего игрока): ничего не теряем, берём лучшее
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

// Код переноса: "PA1." + base64url(gzip(JSON)); без CompressionStream — "PA0." без сжатия
const unb64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
function b64Big(bytes) { let out = ''; for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(out).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }

const summarize = d => {
  const quiz = Object.values(d.quiz || {});
  return {
    caught: (d.caught || []).length,
    correct: quiz.reduce((a, s) => a + (s.correct || 0), 0),
    learned: Object.values(d.items || {}).reduce((a, m) => a + Object.values(m).filter(x => x.s >= LEARNED).length, 0),
  };
};

export const store = {
  // --- игроки ---
  player: () => profiles.list.find(p => p.id === profiles.current),
  players: () => profiles.list.map(p => ({ ...p, current: p.id === profiles.current,
    ...summarize(p.id === profiles.current ? state : readLS(dataKey(p.id)) || {}) })),
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  switchTo(id) {
    if (!profiles.list.some(p => p.id === id)) return;
    profiles.current = id; saveProfiles(); setState(readLS(dataKey(id))); emit();
  },
  addPlayer(name, data = empty()) {
    const id = newId();
    profiles.list.push({ id, name: name.trim().slice(0, 24) || 'Игрок' }); writeLS(dataKey(id), data);
    store.switchTo(id); return id;
  },
  rename(id, name) {
    const p = profiles.list.find(x => x.id === id); if (!p || !name.trim()) return;
    p.name = name.trim().slice(0, 24); saveProfiles(); emit();
  },
  removePlayer(id) {
    if (profiles.list.length < 2) return;
    profiles.list = profiles.list.filter(p => p.id !== id); writeLS(dataKey(id), null);
    if (profiles.current === id) store.switchTo(profiles.list[0].id); else { saveProfiles(); emit(); }
  },
  async exportCode() {
    const json = new TextEncoder().encode(JSON.stringify({ v: 1, name: store.player().name, data: state }));
    if (typeof CompressionStream === 'undefined') return 'PA0.' + b64Big(json);
    return 'PA1.' + b64Big(await pipe(json, new CompressionStream('gzip')));
  },
  // Разбирает код и возвращает { name, data, summary } — без сохранения
  async parseCode(code) {
    const m = String(code).trim().replace(/\s+/g, '').match(/^PA([01])\.([A-Za-z0-9_-]+)$/);
    if (!m) throw new Error('Это не похоже на код ПокеАкадемии');
    let bytes = unb64(m[2]);
    if (m[1] === '1') {
      if (typeof DecompressionStream === 'undefined') throw new Error('Браузер слишком старый для этого кода');
      bytes = await pipe(bytes, new DecompressionStream('gzip'));
    }
    const obj = JSON.parse(new TextDecoder().decode(bytes));
    if (!obj?.data) throw new Error('Код повреждён');
    return { name: obj.name || 'Игрок', data: Object.assign(empty(), obj.data), summary: summarize(obj.data) };
  },
  // Загружает игрока из кода: в игрока с таким же именем — объединяет, иначе создаёт нового
  importPlayer({ name, data }) {
    const same = profiles.list.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (!same) return store.addPlayer(name, data);
    writeLS(dataKey(same.id), merge(readLS(dataKey(same.id)), data));
    store.switchTo(same.id); return same.id;
  },

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
    it.t = Math.floor(Date.now() / 6e4); save(); // минуты: код переноса получается короче
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
