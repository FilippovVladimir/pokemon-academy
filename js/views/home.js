import { DEX, genus } from '../dex.js';
import { art, num, typeBadges, dayIndex, esc } from '../util.js';
import { store } from '../store.js';

const TILES = [
  ['#/pokedex', '📕', 'Покедекс', 'Все 1025 покемонов: типы, статы, эволюции, слабости.'],
  ['#/quiz/name', '❓', 'Кто этот покемон?', 'Угадай покемона по силуэту — вписав имя или выбрав из вариантов.'],
  ['#/quiz', '🧠', 'Все квизы', 'Типы, слабости, поколения, эволюции, статы, тренеры и игры.'],
  ['#/games', '🎮', 'Игры и поколения', '9 поколений, регионы, сюжеты, новые механики и спин-оффы.'],
  ['#/trainers', '🧢', 'Тренеры', 'Лидеры стадионов, Элита, чемпионы, злодеи и профессора.'],
  ['#/types', '🔥', 'Таблица типов', 'Кто кого бьёт: интерактивная таблица и калькулятор слабостей.'],
  ['#/team', '🛡️', 'Конструктор команды', 'Собери 6 покемонов и проверь общие слабости.'],
  ['#/guides/vgc', '🏆', 'Гайд по VGC', 'Официальный соревновательный формат: правила и стратегии.'],
];

export function render(app) {
  const p = DEX.list[dayIndex(DEX.list.length)];
  const caught = store.caughtCount();
  app.innerHTML = `
  <section class="hero">
    <img class="bg-ball" src="assets/icon.svg" alt="">
    <h1>ПокеАкадемия</h1>
    <p>Полное погружение во вселенную Pokémon: изучай покемонов, проходи квизы, узнавай историю игр и готовься к соревнованиям.</p>
    <div class="row">
      <a class="btn primary" href="#/quiz/name" style="background:#fff;color:#e3350d">Начать квиз</a>
      <a class="btn" href="#/pokedex" style="background:rgba(255,255,255,.2);color:#fff">Открыть покедекс</a>
    </div>
  </section>

  <div class="grid cols-2" style="margin-bottom:14px">
    <a class="card tile" href="#/pokemon/${p.id}">
      <div class="muted small" style="font-weight:700">ПОКЕМОН ДНЯ</div>
      <div class="potd">
        <img src="${art(p.id)}" alt="${esc(p.n)}">
        <div>
          <div class="muted small">${num(p.id)} · ${esc(genus(p))}</div>
          <h2 style="margin:2px 0 6px">${esc(p.n)}</h2>
          ${typeBadges(p.t)}
          <p class="small muted" style="margin-top:8px">Поколение ${p.gen} · сумма статов ${p.bst}</p>
        </div>
      </div>
    </a>
    <a class="card tile" href="#/progress">
      <div class="muted small" style="font-weight:700">ТВОЙ ПРОГРЕСС</div>
      <div class="progress-ring">${caught} <span class="muted" style="font-size:1rem">/ ${DEX.list.length} изучено</span></div>
      <div class="pbar"><i style="width:${(caught / DEX.list.length * 100).toFixed(1)}%"></i></div>
      <p class="small muted">Покемон считается изученным, когда ты правильно угадываешь его имя в квизе «Кто этот покемон?».</p>
    </a>
  </div>

  <div class="grid cols-4">
    ${TILES.map(([href, ico, t, d]) => `
      <a class="card tile" href="${href}"><div class="ico">${ico}</div><h3>${t}</h3><p>${d}</p></a>`).join('')}
  </div>`;
}
