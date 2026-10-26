// Прогресс игрока в localStorage (всё в try/catch: в приватном режиме хранилище может быть недоступно).
const KEY = 'pokeacademy:v1';
let state = { caught: [], quiz: {}, team: [], seen: [] };
try { Object.assign(state, JSON.parse(localStorage.getItem(KEY)) || {}); } catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

const caughtSet = new Set(state.caught);
const seenSet = new Set(state.seen);

export const store = {
  isCaught: id => caughtSet.has(id),
  catch(id) { if (!caughtSet.has(id)) { caughtSet.add(id); state.caught = [...caughtSet]; save(); return true; } return false; },
  caughtCount: () => caughtSet.size,
  caughtIds: () => caughtSet,
  see(id) { if (!seenSet.has(id)) { seenSet.add(id); state.seen = [...seenSet]; save(); } },
  seenCount: () => seenSet.size,

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

  team: () => state.team.slice(),
  setTeam(ids) { state.team = ids.slice(0, 6); save(); },

  reset() { state = { caught: [], quiz: {}, team: [], seen: [] }; caughtSet.clear(); seenSet.clear(); save(); },
};
