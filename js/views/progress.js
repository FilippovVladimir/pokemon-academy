import { DEX } from '../dex.js';
import { $, esc } from '../util.js';
import { GENERATIONS } from '../data/games.js';
import { store } from '../store.js';
import { QUIZZES } from './quiz.js';

export function render(app) {
  const caught = store.caughtIds();
  const stats = store.allQuizStats();
  const answered = Object.values(stats).reduce((a, s) => a + s.answered, 0);
  const correct = Object.values(stats).reduce((a, s) => a + s.correct, 0);
  const perfect = Object.values(stats).some(s => s.best >= 10);
  const genDone = GENERATIONS.filter(g => DEX.list.filter(p => p.gen === g.gen).every(p => caught.has(p.id)));

  const ACH = [
    ['🥚', 'Первый шаг', 'Ответь на первый вопрос', answered >= 1],
    ['📕', 'Юный исследователь', 'Изучи 25 покемонов', caught.size >= 25],
    ['🎒', 'Тренер', 'Изучи 151 покемона', caught.size >= 151],
    ['🏅', 'Знаток', 'Изучи 500 покемонов', caught.size >= 500],
    ['👑', 'Мастер покемонов', 'Изучи всех 1025', caught.size >= DEX.list.length],
    ['🎯', 'Идеальный раунд', '10 из 10 в любом квизе', perfect],
    ['🧠', 'Эрудит', '100 правильных ответов', correct >= 100],
    ['🗺️', 'Покоритель региона', 'Изучи всё поколение целиком', genDone.length > 0],
    ['🔎', 'Любопытный', 'Открой 50 карточек в покедексе', store.seenCount() >= 50],
  ];

  app.innerHTML = `
  <div class="section-head"><h1>Мой прогресс</h1><a class="btn small" href="#/profile">👤 ${esc(store.player().name)} · сменить игрока</a></div>
  <div class="grid cols-2">
    <div class="card">
      <div class="muted small" style="font-weight:700">ИЗУЧЕНО ПОКЕМОНОВ</div>
      <div class="progress-ring">${caught.size} <span class="muted" style="font-size:1rem">/ ${DEX.list.length}</span></div>
      <div class="pbar"><i style="width:${(caught.size / DEX.list.length * 100).toFixed(1)}%"></i></div>
      <p class="small muted">Угадывай покемонов в квизе <a href="#/quiz/name">«Кто этот покемон?»</a>, чтобы пополнять коллекцию.</p>
    </div>
    <div class="card">
      <div class="muted small" style="font-weight:700">ОТВЕТЫ В КВИЗАХ</div>
      <div class="progress-ring">${correct} <span class="muted" style="font-size:1rem">/ ${answered} верно</span></div>
      <p class="small muted">Точность: ${answered ? Math.round(correct / answered * 100) : 0}% · Открыто карточек: ${store.seenCount()}</p>
    </div>
  </div>

  <h2>По поколениям</h2>
  <div class="grid cols-3">${GENERATIONS.map(g => {
    const all = DEX.list.filter(p => p.gen === g.gen), c = all.filter(p => caught.has(p.id)).length;
    return `<a class="card tile" href="#/quiz/name?gen=${g.gen}"><b>${g.gen} · ${g.region}</b> <span class="muted small">${c}/${all.length}</span>
      <div class="pbar"><i style="width:${c / all.length * 100}%"></i></div></a>`;
  }).join('')}</div>

  <h2>Заучивание</h2>
  <p class="muted small">Вопрос считается выученным после ${store.LEARNED} правильных ответов подряд. Режим «Учить» сначала даёт вопросы с ошибками.</p>
  <div class="grid cols-3">${Object.entries(QUIZZES).filter(([, q]) => !q.noStudy).map(([id, q]) => {
    const it = store.itemSummary(id);
    return `<div class="card"><b>${q.icon} ${q.title}</b>
      <p class="small" style="margin:6px 0">Выучено: <b>${it.learned}</b> · на повторение: <b>${it.review}</b> · встречено: ${it.seen}</p>
      <a class="btn small ${it.review ? 'primary' : ''}" href="#/quiz/${id}?study=learn">${it.review ? '📚 Повторить ошибки' : '📚 Учить'}</a></div>`;
  }).join('')}</div>

  <h2>Достижения</h2>
  <div class="badge-grid">${ACH.map(([e, t, d, ok]) => `<div class="ach ${ok ? '' : 'locked'}"><div class="e">${e}</div><b>${t}</b><div class="small muted">${d}</div></div>`).join('')}</div>

  <div style="margin-top:30px"><button class="btn small" id="reset">Сбросить весь прогресс</button></div>`;

  $('#reset').onclick = () => { if (confirm('Точно сбросить весь прогресс? Это нельзя отменить.')) { store.reset(); render(app); } };
}
