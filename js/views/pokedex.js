import { DEX } from '../dex.js';
import { $, $$, esc, img, num, typeBadges, norm } from '../util.js';
import { TYPES, TYPE_RU } from '../data/types.js';
import { GENERATIONS } from '../data/games.js';
import { store } from '../store.js';

const PAGE = 60;
// Фильтры живут между переходами, чтобы «назад» возвращал к тому же списку
const f = { q: '', gens: new Set(), type: '', sort: 'id', special: '', shown: PAGE };

function filtered() {
  const q = norm(f.q);
  let list = DEX.list.filter(p =>
    (!f.gens.size || f.gens.has(p.gen)) &&
    (!f.type || p.t.includes(f.type)) &&
    (!q || norm(p.n).includes(q) || String(p.id) === q.replace(/^0+/, '')) &&
    (f.special !== 'legend' || p.l > 0) &&
    (f.special !== 'caught' || store.isCaught(p.id)) &&
    (f.special !== 'new' || !store.isCaught(p.id)));
  const sorters = {
    id: (a, b) => a.id - b.id, name: (a, b) => a.n.localeCompare(b.n), bst: (a, b) => b.bst - a.bst,
    spe: (a, b) => b.s[5] - a.s[5], atk: (a, b) => Math.max(b.s[1], b.s[3]) - Math.max(a.s[1], a.s[3]),
  };
  return list.sort(sorters[f.sort]);
}

const card = p => `
  <a class="mon" href="#/pokemon/${p.id}">
    ${store.isCaught(p.id) ? '<img class="caught" src="assets/icon.svg" alt="изучен" title="Изучен">' : ''}
    ${img(p.id, '', p.n)}
    <div class="num">${num(p.id)}</div>
    <div class="nm">${esc(p.n)}</div>
    ${typeBadges(p.t)}
  </a>`;

export function render(app) {
  app.innerHTML = `
  <div class="section-head">
    <h1>Покедекс</h1>
    <span class="muted small" id="count"></span>
  </div>
  <div class="dex-controls">
    <input type="search" id="q" placeholder="Поиск по имени или номеру…" value="${esc(f.q)}" autocomplete="off">
    <select id="type"><option value="">Все типы</option>${TYPES.map(t => `<option value="${t}" ${f.type === t ? 'selected' : ''}>${TYPE_RU[t]}</option>`).join('')}</select>
    <select id="sort">
      ${[['id', 'По номеру'], ['name', 'По имени'], ['bst', 'По сумме статов'], ['spe', 'По скорости'], ['atk', 'По атаке']]
        .map(([v, l]) => `<option value="${v}" ${f.sort === v ? 'selected' : ''}>${l}</option>`).join('')}
    </select>
  </div>
  <div class="chips scroll" style="margin-bottom:8px" id="gens">
    ${GENERATIONS.map(g => `<button class="chip ${f.gens.has(g.gen) ? 'on' : ''}" data-gen="${g.gen}">${g.gen} · ${g.region}</button>`).join('')}
  </div>
  <div class="chips scroll" style="margin-bottom:14px" id="special">
    ${[['legend', '⭐ Легендарные и мифические'], ['caught', '✅ Изученные'], ['new', '🆕 Ещё не изученные']]
      .map(([v, l]) => `<button class="chip ${f.special === v ? 'on' : ''}" data-sp="${v}">${l}</button>`).join('')}
  </div>
  <div class="dex-grid" id="grid"></div>
  <div class="load-more"><button class="btn" id="more">Показать ещё</button></div>`;

  const grid = $('#grid'), more = $('#more');
  let list = [];
  const draw = (reset) => {
    if (reset) { list = filtered(); f.shown = PAGE; grid.innerHTML = ''; }
    const from = grid.children.length;
    grid.insertAdjacentHTML('beforeend', list.slice(from, f.shown).map(card).join(''));
    $('#count').textContent = `Найдено: ${list.length}`;
    more.style.display = f.shown < list.length ? '' : 'none';
    if (!list.length) grid.innerHTML = '<p class="muted">Ничего не найдено.</p>';
  };
  const shownBefore = f.shown;
  draw(true);
  if (shownBefore > PAGE) { f.shown = shownBefore; draw(false); }

  let t;
  $('#q').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { f.q = e.target.value; draw(true); }, 120); });
  $('#type').addEventListener('change', e => { f.type = e.target.value; draw(true); });
  $('#sort').addEventListener('change', e => { f.sort = e.target.value; draw(true); });
  $('#gens').addEventListener('click', e => {
    const b = e.target.closest('[data-gen]'); if (!b) return;
    const g = +b.dataset.gen; f.gens.has(g) ? f.gens.delete(g) : f.gens.add(g);
    b.classList.toggle('on'); draw(true);
  });
  $('#special').addEventListener('click', e => {
    const b = e.target.closest('[data-sp]'); if (!b) return;
    f.special = f.special === b.dataset.sp ? '' : b.dataset.sp;
    $$('#special .chip').forEach(c => c.classList.toggle('on', c.dataset.sp === f.special)); draw(true);
  });
  more.addEventListener('click', () => { f.shown += PAGE; draw(false); });

  // Автоподгрузка при прокрутке
  const io = new IntersectionObserver(es => { if (es[0].isIntersecting && f.shown < list.length) { f.shown += PAGE; draw(false); } }, { rootMargin: '600px' });
  io.observe(more);
  return () => io.disconnect();
}
