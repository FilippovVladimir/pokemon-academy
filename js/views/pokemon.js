import { DEX, get, evoStages, fetchSpecies } from '../dex.js';
import { $, esc, art, artShiny, cry, img, num, typeBadge, typeBadges, fmtMult, STAT_NAMES, STAT_COLORS } from '../util.js';
import { defenseProfile, TYPES, TYPE_RU, EFF } from '../data/types.js';
import { GENERATIONS } from '../data/games.js';
import { store } from '../store.js';

export function render(app, [idStr]) {
  const p = get(+idStr);
  if (!p) { app.innerHTML = '<p>Покемон не найден. <a href="#/pokedex">К покедексу</a></p>'; return; }
  store.see(p.id);
  const gen = GENERATIONS[p.gen - 1];
  const prev = get(p.id - 1), next = get(p.id + 1);
  const prof = defenseProfile(p.t);
  const groups = [4, 2, 0.5, 0.25, 0].map(m => [m, TYPES.filter(t => prof[t] === m)]).filter(([, ts]) => ts.length);
  const stab = TYPES.filter(d => p.t.some(a => EFF[a][d] === 2));
  const c1 = `var(--${p.t[0]})`, c2 = `var(--${p.t[1] || p.t[0]})`;
  const team = store.team();

  const evo = evoStages(p);
  const evoHtml = evo.length > 1 || evo[0].length > 1 ? `<div class="evo">${evo.map(lvl =>
    `<div style="display:flex;flex-direction:column;gap:4px">${lvl.map(e =>
      `<a href="#/pokemon/${e.id}" class="${e.id === p.id ? 'cur' : ''}">${img(e.id, '', e.n)}${esc(e.n)}</a>`).join('')}</div>`)
    .join('<span class="arrow">→</span>')}</div>` : '<p class="muted">Этот покемон не эволюционирует.</p>';

  app.innerHTML = `
  <div class="prevnext">
    ${prev ? `<a class="btn small" href="#/pokemon/${prev.id}">← ${num(prev.id)} ${esc(prev.n)}</a>` : '<span></span>'}
    ${next ? `<a class="btn small" href="#/pokemon/${next.id}">${num(next.id)} ${esc(next.n)} →</a>` : ''}
  </div>
  <div class="detail">
    <div class="card art-box">
      <div class="art-bg" style="background:linear-gradient(160deg, color-mix(in srgb, ${c1} 35%, transparent), color-mix(in srgb, ${c2} 20%, transparent))">
        <img class="art" id="art" src="${art(p.id)}" alt="${esc(p.n)}">
      </div>
      <div class="muted small" style="margin-top:10px">${num(p.id)} · ${esc(p.g)}</div>
      <h1 style="margin:4px 0">${esc(p.n)}</h1>
      <div class="muted small">${esc(p.jp)} (${esc(p.ro)})</div>
      <div class="types" style="justify-content:center;margin:10px 0">${p.t.map(typeBadge).join('')}</div>
      ${p.l ? `<div class="tag" style="margin-bottom:10px">${p.l === 2 ? '✨ Мифический' : '⭐ Легендарный'}</div>` : ''}
      <div class="row" style="justify-content:center">
        <button class="btn small" id="shiny">✨ Шайни</button>
        <button class="btn small" id="cry">🔊 Крик</button>
        <button class="btn small" id="toTeam" ${team.includes(p.id) || team.length >= 6 ? 'disabled' : ''}>${team.includes(p.id) ? '✓ В команде' : '+ В команду'}</button>
      </div>
      <p class="small muted" style="margin-top:10px">${store.isCaught(p.id) ? '✅ Изучен в квизе' : 'Ещё не изучен — угадай его в квизе!'}</p>
    </div>
    <div class="grid" style="align-content:start">
      <div class="card">
        <h3>Описание</h3>
        <p id="flavor" class="muted">Загрузка…</p>
        <div class="kv">
          <div><span>Поколение</span><a href="#/games/${p.gen}">${p.gen} · ${gen.region}</a></div>
          <div><span>Рост</span>${(p.h / 10).toFixed(1)} м</div>
          <div><span>Вес</span>${(p.w / 10).toFixed(1)} кг</div>
          <div><span>Способности</span>${p.a.map(a => a.endsWith('*') ? `<i title="Скрытая способность">${esc(a.slice(0, -1))} (скр.)</i>` : esc(a)).join('<br>')}</div>
          <div id="extra1"><span>Шанс поимки</span>…</div>
          <div id="extra2"><span>Группы яиц</span>…</div>
        </div>
      </div>
      <div class="card">
        <h3>Базовые характеристики</h3>
        ${p.s.map((v, i) => `<div class="stat"><span>${STAT_NAMES[i]}</span><b>${v}</b><div class="bar"><i style="width:${Math.min(100, v / 1.8)}%;background:${STAT_COLORS[i]}"></i></div></div>`).join('')}
        <div class="stat"><span><b>Сумма</b></span><b>${p.bst}</b><span class="muted small">${bstLabel(p.bst)}</span></div>
      </div>
      <div class="card">
        <h3>Получает урон от типов</h3>
        ${groups.map(([m, ts]) => `<div class="eff-row"><b>×${fmtMult(m)}</b>${typeBadges(ts)}</div>`).join('')}
        <h3 style="margin-top:14px">STAB-атаки супер-эффективны против</h3>
        ${stab.length ? typeBadges(stab) : '<span class="muted">—</span>'}
      </div>
      <div class="card">
        <h3>Эволюция</h3>
        ${evoHtml}
      </div>
    </div>
  </div>`;

  let shiny = false;
  $('#shiny').onclick = () => { shiny = !shiny; $('#art').src = shiny ? artShiny(p.id) : art(p.id); $('#shiny').classList.toggle('primary', shiny); };
  $('#cry').onclick = () => { const a = new Audio(cry(p.id)); a.volume = 0.4; a.play().catch(() => { $('#cry').textContent = '🔇 Нет звука'; }); };
  $('#toTeam').onclick = () => { store.setTeam([...store.team(), p.id]); $('#toTeam').textContent = '✓ В команде'; $('#toTeam').disabled = true; };

  fetchSpecies(p.id).then(s => {
    const fl = $('#flavor'); if (!fl) return;
    fl.textContent = s.flavor || '—';
    fl.insertAdjacentHTML('beforeend', s.version ? ` <span class="tag">${esc(s.version)}</span>` : '');
    $('#extra1').innerHTML = `<span>Шанс поимки</span>${s.capture} / 255`;
    $('#extra2').innerHTML = `<span>Группы яиц</span>${s.egg.map(esc).join(', ')}`;
    if (s.varieties.length) fl.insertAdjacentHTML('afterend', `<p class="small muted">Другие формы: ${s.varieties.map(esc).join(', ')}</p>`);
  }).catch(() => { const fl = $('#flavor'); if (fl) fl.textContent = 'Описание недоступно офлайн.'; });
}

function bstLabel(b) {
  if (b >= 670) return 'уровень легендарных';
  if (b >= 580) return 'псевдо-легендарный уровень';
  if (b >= 500) return 'сильный';
  if (b >= 400) return 'средний';
  return 'ранняя стадия';
}
