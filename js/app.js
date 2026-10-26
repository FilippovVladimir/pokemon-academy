import { loadDex } from './dex.js';
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
import { store } from './store.js';

const ROUTES = {
  '': home, pokedex, pokemon, types, games, trainers, quiz, team, guides, progress, more, profile,
};

const app = $('#app');
let cleanup = null;

async function route() {
  const [name = '', ...params] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const view = ROUTES[name] || home;
  const navKey = name || 'home';
  $$('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === navKey ||
    (navKey === 'pokemon' && a.dataset.nav === 'pokedex') ||
    (['trainers', 'types', 'team', 'guides', 'progress', 'profile'].includes(navKey) && a.dataset.nav === 'more' )));
  $('#nav').classList.remove('open');
  $('#menuBtn').setAttribute('aria-expanded', 'false');

  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  try {
    await loadDex();
    cleanup = await view.render(app, params);
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="card"><h2>Что-то пошло не так</h2><p class="muted">${e.message}</p><a class="btn" href="#/">На главную</a></div>`;
  }
  if (!history.state?.keepScroll) window.scrollTo(0, 0);
}

$('#menuBtn').addEventListener('click', () => {
  const open = $('#nav').classList.toggle('open');
  $('#menuBtn').setAttribute('aria-expanded', String(open));
});

// Кнопка профиля в шапке; при входе/выходе перерисовываем страницу с новым прогрессом
let lastUser = store.user();
const userBtn = $('#userBtn');
const drawUser = () => {
  userBtn.hidden = !store.cloudEnabled;
  const u = store.user(), s = store.sync().status;
  userBtn.textContent = u ? `${s === 'error' ? '⚠️' : s === 'saving' || s === 'loading' ? '⏳' : '👤'} ${u}` : '👤 Войти';
};
store.onChange(() => {
  drawUser();
  if (store.user() !== lastUser) { lastUser = store.user(); route(); }
});
drawUser();

window.addEventListener('hashchange', route);
route();
