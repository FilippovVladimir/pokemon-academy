import { loadDex, ensureFlavor } from './dex.js';
import { settings } from './settings.js';
import { $, $$ } from './util.js';
import * as home from './views/home.js';
import * as pokedex from './views/pokedex.js';
import * as pokemon from './views/pokemon.js';
import * as types from './views/types.js';
import * as games from './views/games.js';
import * as trainers from './views/trainers.js';
import * as quiz from './views/quiz.js';
import * as team from './views/team.js';
import * as guides from './views/guides.js';
import * as progress from './views/progress.js';
import * as more from './views/more.js';
import * as profile from './views/profile.js';
import * as settingsView from './views/settings.js';
import { store } from './store.js';

const ROUTES = {
  '': home, pokedex, pokemon, types, games, trainers, quiz, team, guides, progress, more, profile, settings: settingsView,
};

const app = $('#app');
let cleanup = null;

async function route({ keepScroll = false } = {}) {
  const [name = '', ...params] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const view = ROUTES[name] || home;
  const navKey = name || 'home';
  $$('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === navKey ||
    (navKey === 'pokemon' && a.dataset.nav === 'pokedex') ||
    (['trainers', 'types', 'team', 'guides', 'progress', 'profile', 'settings'].includes(navKey) && a.dataset.nav === 'more' )));
  $('#nav').classList.remove('open');
  $('#menuBtn').setAttribute('aria-expanded', 'false');

  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  try {
    await Promise.all([loadDex(), ensureFlavor()]);
    cleanup = await view.render(app, params);
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="card"><h2>Что-то пошло не так</h2><p class="muted">${e.message}</p><a class="btn" href="#/">На главную</a></div>`;
  }
  if (!keepScroll) window.scrollTo(0, 0);
}

$('#menuBtn').addEventListener('click', () => {
  const open = $('#nav').classList.toggle('open');
  $('#menuBtn').setAttribute('aria-expanded', String(open));
});

// Кнопка игрока в шапке; при переключении игрока перерисовываем страницу с его прогрессом
let lastPlayer = store.player().id;
const userBtn = $('#userBtn');
const drawUser = () => { userBtn.textContent = '👤 ' + store.player().name; };
store.onChange(() => {
  drawUser();
  if (store.player().id !== lastPlayer) { lastPlayer = store.player().id; route(); }
});
drawUser();

// Смена языка в настройках — перерисовываем текущую страницу
settings.onChange(() => route({ keepScroll: true }));

window.addEventListener('hashchange', () => route());
route();
