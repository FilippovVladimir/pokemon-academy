import { GENERATIONS, SPINOFFS, PLAY_ORDER } from '../data/games.js';
import { TRAINERS, ROLE_RU } from '../data/trainers.js';
import { get } from '../dex.js';
import { esc, img, art, typeBadge } from '../util.js';

const monLink = id => { const p = get(id); return p ? `<a href="#/pokemon/${id}" title="${esc(p.n)}">${img(id, '', p.n)}${esc(p.n)}</a>` : ''; };

export function render(app, [genStr]) {
  if (genStr) return renderGen(app, +genStr);
  app.innerHTML = `
  <div class="section-head"><h1>Игры и поколения</h1><a class="btn small" href="#/quiz/games">Квиз по играм →</a></div>
  <p class="muted">Каждое поколение — новый регион, новые покемоны и новые механики. Нажми на поколение, чтобы узнать подробности и сюжет.</p>
  <div class="grid cols-3">
    ${GENERATIONS.map(g => `
      <a class="card tile gen-card" href="#/games/${g.gen}" style="border-top-color:${g.color}">
        <div class="muted small" style="font-weight:700">ПОКОЛЕНИЕ ${g.gen} · ${g.years}</div>
        <h3>${g.region} <span class="muted small">(${g.regionEn})</span></h3>
        <div class="starters">${g.starters.map(id => `<img src="${art(id)}" alt="" loading="lazy">`).join('')}</div>
        <p>${g.games.map(x => esc(x.title.replace('Pokémon ', ''))).join(' · ')}</p>
        <p class="small" style="margin-top:6px">№ ${g.range[0]}–${g.range[1]} · ${g.range[1] - g.range[0] + 1} новых покемонов</p>
      </a>`).join('')}
  </div>

  <h2>С чего начать играть</h2>
  <div class="grid cols-3">${PLAY_ORDER.map(o => `<div class="card"><h3>${o.title}</h3><ol>${o.items.map(i => `<li>${esc(i)}</li>`).join('')}</ol></div>`).join('')}</div>

  <h2>Хронология основной серии</h2>
  <div class="card"><div class="timeline">
    ${GENERATIONS.flatMap(g => g.games.map(x => ({ ...x, g }))).sort((a, b) => a.year - b.year).map(x => `
      <div class="ev"><b>${x.year}</b> — <a href="#/games/${x.g.gen}">${esc(x.title)}</a>
      <span class="muted small">· ${esc(x.platform)} · ${x.g.region}${x.remake ? ' · ремейк' : ''}</span></div>`).join('')}
  </div></div>

  <h2>Спин-оффы</h2>
  <div class="grid cols-3">${SPINOFFS.map(s => `<div class="card"><h3>${esc(s.title)}</h3><div class="muted small">${s.year} · ${esc(s.platform)}</div><p class="small" style="margin-top:6px">${esc(s.desc)}</p></div>`).join('')}</div>`;
}

function renderGen(app, n) {
  const g = GENERATIONS[n - 1];
  if (!g) { app.innerHTML = '<p>Нет такого поколения.</p>'; return; }
  const regionTrainers = TRAINERS.filter(t => t.region === g.region || (n === 8 && t.region === 'Хисуи'));
  app.innerHTML = `
  <a class="back" href="#/games">← Все поколения</a>
  <div class="hero" style="background:linear-gradient(135deg, ${g.color}, #222)">
    <div class="small" style="font-weight:700;opacity:.8">ПОКОЛЕНИЕ ${g.gen} · ${g.years}</div>
    <h1>${g.region} <span style="opacity:.7;font-size:.6em">${g.regionEn}</span></h1>
    <p>Прообраз: ${esc(g.inspired)}. Покемоны № ${g.range[0]}–${g.range[1]}.</p>
    <div class="row">
      <a class="btn" href="#/quiz/name?gen=${g.gen}" style="background:#fff;color:#222;border:0">Квиз по покемонам этого поколения</a>
    </div>
  </div>

  <div class="grid cols-2">
    <div class="card"><h3>Стартовые покемоны</h3><div class="evo">${g.starters.map(monLink).join('')}</div></div>
    <div class="card"><h3>Что нового</h3><ul>${g.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div>
  </div>

  <h2>Игры</h2>
  <div class="grid">${g.games.map(x => `
    <div class="card">
      <div class="row" style="align-items:flex-start">
        <div style="flex:1;min-width:220px">
          <h3 style="margin-bottom:2px">${esc(x.title)}</h3>
          <div class="muted small">${esc(x.ru)} · ${x.year} · ${esc(x.platform)} ${x.remake ? '<span class="tag">ремейк</span>' : ''}</div>
          ${x.note ? `<p class="small muted" style="margin-top:4px">${esc(x.note)}</p>` : ''}
          ${x.plot ? `<p style="margin-top:10px">${esc(x.plot)}</p>` : ''}
        </div>
        <div class="evo">${x.mascot.map(monLink).join('')}</div>
      </div>
    </div>`).join('')}
  </div>

  <h2>Легендарные и мифические</h2>
  <div class="card"><div class="evo">${g.legends.map(monLink).join('')}</div></div>

  ${regionTrainers.length ? `<h2>Тренеры региона</h2>
  <div class="grid cols-4">${regionTrainers.map(t => `
    <div class="card small"><b>${esc(t.ru)}</b> <span class="muted">(${esc(t.name)})</span><br>
    <span class="muted">${ROLE_RU[t.role]}</span> ${t.role === 'prof' ? '' : typeBadge(t.type)}</div>`).join('')}</div>` : ''}

  <div class="prevnext" style="margin-top:20px">
    ${n > 1 ? `<a class="btn" href="#/games/${n - 1}">← Поколение ${n - 1}</a>` : '<span></span>'}
    ${n < GENERATIONS.length ? `<a class="btn" href="#/games/${n + 1}">Поколение ${n + 1} →</a>` : ''}
  </div>`;
}
