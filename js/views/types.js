import { $, $$, typeBadge, typeBadges, fmtMult, img, esc } from '../util.js';
import { TYPES, TYPE_RU, EFF, defenseProfile, TYPE_TIPS } from '../data/types.js';
import { DEX } from '../dex.js';

const sel = new Set(['fire']);

export function render(app) {
  app.innerHTML = `
  <div class="section-head"><h1>Типы покемонов</h1><a class="btn small" href="#/quiz/matchup">Квиз по типам →</a></div>
  <p class="muted">18 типов — сердце боевой системы. Строки — тип атаки, столбцы — тип защищающегося покемона.</p>
  <div class="legend">
    <span><i style="background:#3fae5a"></i>×2 супер-эффективно</span>
    <span><i style="background:#e2584c"></i>×½ не очень эффективно</span>
    <span><i style="background:#333"></i>×0 не действует</span>
  </div>
  <div class="chart-wrap">
    <table class="tchart">
      <thead><tr><th>АТК ↓ / ЗАЩ →</th>${TYPES.map(t => `<th>${typeBadge(t)}</th>`).join('')}</tr></thead>
      <tbody>${TYPES.map(a => `<tr><th>${typeBadge(a)}</th>${TYPES.map(d => {
        const m = EFF[a][d]; const cls = m === 2 ? 'x2' : m === 0.5 ? 'x05' : m === 0 ? 'x0' : '';
        return `<td class="${cls}" title="${TYPE_RU[a]} → ${TYPE_RU[d]}: ×${fmtMult(m)}">${m === 1 ? '' : fmtMult(m)}</td>`;
      }).join('')}</tr>`).join('')}</tbody>
    </table>
  </div>

  <h2>Калькулятор защиты</h2>
  <p class="muted">Выбери один или два типа — узнаешь все слабости и сопротивления.</p>
  <div class="type-pick" id="pick">${TYPES.map(t => `<span class="type t-${t} ${sel.has(t) ? 'on' : ''}" data-t="${t}">${TYPE_RU[t]}</span>`).join('')}</div>
  <div class="grid cols-2" style="margin-top:14px">
    <div class="card" id="calc"></div>
    <div class="card" id="examples"></div>
  </div>

  <h2>Шпаргалка по каждому типу</h2>
  <div class="grid cols-3">${TYPES.map(t => {
    const strong = TYPES.filter(d => EFF[t][d] === 2), weak = TYPES.filter(a => EFF[a][t] === 2);
    return `<div class="card"><div style="margin-bottom:8px">${typeBadge(t)}</div>
      <p class="small">${TYPE_TIPS[t]}</p>
      <div class="small"><b>Бьёт ×2:</b> ${strong.length ? typeBadges(strong) : '—'}</div>
      <div class="small" style="margin-top:6px"><b>Слаб к:</b> ${typeBadges(weak)}</div></div>`;
  }).join('')}</div>`;

  const draw = () => {
    const ts = [...sel];
    if (!ts.length) { $('#calc').innerHTML = '<p class="muted">Выбери тип.</p>'; $('#examples').innerHTML = ''; return; }
    const prof = defenseProfile(ts);
    const rows = [4, 2, 1, 0.5, 0.25, 0].map(m => [m, TYPES.filter(t => prof[t] === m)]).filter(([, x]) => x.length);
    $('#calc').innerHTML = `<h3>${typeBadges(ts)}</h3>${rows.map(([m, x]) =>
      `<div class="eff-row"><b>×${fmtMult(m)}</b>${typeBadges(x)}</div>`).join('')}`;
    const ex = DEX.list.filter(p => p.t.length === ts.length && ts.every(t => p.t.includes(t))).slice(0, 12);
    $('#examples').innerHTML = `<h3>Покемоны с таким типом</h3>${ex.length ? `<div class="evo">${ex.map(p =>
      `<a href="#/pokemon/${p.id}">${img(p.id, '', p.n)}${esc(p.n)}</a>`).join('')}</div>` : '<p class="muted">Такого сочетания пока нет ни у одного покемона!</p>'}`;
  };
  $('#pick').addEventListener('click', e => {
    const b = e.target.closest('[data-t]'); if (!b) return;
    const t = b.dataset.t;
    if (sel.has(t)) sel.delete(t); else { if (sel.size >= 2) sel.delete([...sel][0]); sel.add(t); }
    $$('#pick .type').forEach(x => x.classList.toggle('on', sel.has(x.dataset.t)));
    draw();
  });
  draw();
}
