import { DEX, get } from '../dex.js';
import { $, esc, img, norm, typeBadge, typeBadges, fmtMult } from '../util.js';
import { TYPES, EFF, defenseProfile } from '../data/types.js';
import { store } from '../store.js';

export function render(app, [shared]) {
  if (shared) store.setTeam(shared.split(',').map(Number).filter(id => get(id)));
  let team = store.team();

  app.innerHTML = `
  <div class="section-head"><h1>Конструктор команды</h1><button class="btn small" id="share">🔗 Поделиться</button></div>
  <p class="muted">Собери до 6 покемонов и проверь, нет ли у команды общих слабостей. Полезно для прохождения игр и VGC.</p>
  <div style="position:relative;max-width:480px;margin-bottom:14px">
    <input type="search" id="add" placeholder="Добавить покемона: имя или номер…" autocomplete="off">
    <div class="suggest" id="sug" style="display:none;position:absolute;left:0;right:0;z-index:5"></div>
  </div>
  <div class="team-slots" id="slots"></div>
  <div class="grid cols-2" style="margin-top:16px">
    <div class="card"><h3>Защита: слабости команды</h3><div style="overflow-x:auto" id="def"></div></div>
    <div class="card"><h3>Атака: покрытие STAB</h3><p class="small muted">Какие типы команда бьёт супер-эффективно атаками своих типов.</p><div id="off"></div></div>
  </div>`;

  const draw = () => {
    store.setTeam(team);
    $('#slots').innerHTML = Array.from({ length: 6 }, (_, i) => {
      const p = get(team[i]);
      return p ? `<div class="slot filled"><button class="x" data-rm="${i}" aria-label="Убрать">✕</button>
        <a href="#/pokemon/${p.id}">${img(p.id, '', p.n)}</a><div class="nm">${esc(p.n)}</div>${typeBadges(p.t)}</div>`
        : `<div class="slot"><span class="muted small">Пусто</span></div>`;
    }).join('');

    const mons = team.map(get).filter(Boolean);
    if (!mons.length) { $('#def').innerHTML = '<p class="muted">Добавь покемонов, чтобы увидеть анализ.</p>'; $('#off').innerHTML = ''; return; }
    const profs = mons.map(p => defenseProfile(p.t));
    $('#def').innerHTML = `<table class="cov"><thead><tr><th>Атака</th>${mons.map(p => `<th>${img(p.id, '', p.n).replace('<img', '<img width="36" height="36"')}</th>`).join('')}<th>Слаб</th><th>Резист</th></tr></thead>
      <tbody>${TYPES.map(t => {
        const ms = profs.map(pr => pr[t]);
        const w = ms.filter(m => m > 1).length, r = ms.filter(m => m < 1).length;
        return `<tr><td>${typeBadge(t)}</td>${ms.map(m => `<td class="${m > 1 ? 'w' : m < 1 ? 'r' : ''}">${m === 1 ? '·' : '×' + fmtMult(m)}</td>`).join('')}
          <td class="${w >= 3 || (w >= 2 && !r) ? 'danger w' : ''}">${w}</td><td>${r}</td></tr>`;
      }).join('')}</tbody></table>
      <p class="small muted">Красным подсвечены типы, к которым слабы 3+ покемона (или 2 без единого резиста).</p>`;

    const stabTypes = [...new Set(mons.flatMap(p => p.t))];
    const covered = TYPES.filter(d => stabTypes.some(a => EFF[a][d] === 2));
    const uncovered = TYPES.filter(d => !covered.includes(d));
    $('#off').innerHTML = `<p><b>Типы атак:</b> ${typeBadges(stabTypes)}</p>
      <p><b>Бьём ×2 (${covered.length}/18):</b> ${covered.length ? typeBadges(covered) : '—'}</p>
      <p><b>Нет супер-эффективного STAB против:</b> ${uncovered.length ? typeBadges(uncovered) : 'идеальное покрытие! 🎉'}</p>`;
  };

  $('#slots').addEventListener('click', e => {
    const b = e.target.closest('[data-rm]'); if (!b) return;
    team.splice(+b.dataset.rm, 1); draw();
  });

  const input = $('#add'), sug = $('#sug');
  input.addEventListener('input', () => {
    const q = norm(input.value);
    if (!q) { sug.style.display = 'none'; return; }
    const res = DEX.list.filter(p => norm(p.n).startsWith(q) || String(p.id) === q).slice(0, 8);
    sug.innerHTML = res.map(p => `<button data-id="${p.id}">${esc(p.n)} <span class="muted small">#${p.id}</span></button>`).join('');
    sug.style.display = res.length ? '' : 'none';
  });
  sug.addEventListener('click', e => {
    const b = e.target.closest('[data-id]'); if (!b) return;
    if (team.length < 6 && !team.includes(+b.dataset.id)) team.push(+b.dataset.id);
    input.value = ''; sug.style.display = 'none'; draw();
  });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sug.querySelector('button')?.click(); } });

  $('#share').onclick = async () => {
    const url = location.href.split('#')[0] + '#/team/' + team.join(',');
    try { await navigator.clipboard.writeText(url); $('#share').textContent = '✓ Ссылка скопирована'; }
    catch { prompt('Скопируй ссылку:', url); }
  };
  draw();
}
