import { TRAINERS, ROLE_RU, REGIONS_ORDER } from '../data/trainers.js';
import { get } from '../dex.js';
import { $, $$, esc, typeBadge, trainerSprite, sprite } from '../util.js';

const f = { region: '', role: '' };

export function render(app) {
  app.innerHTML = `
  <div class="section-head"><h1>Тренеры</h1><a class="btn small" href="#/quiz/trainers">Квиз по тренерам →</a></div>
  <p class="muted">Лидеры стадионов, Элитная четвёрка, чемпионы, соперники, злодеи и профессора всех регионов.</p>
  <div class="chips scroll" id="regions" style="margin-bottom:8px">
    <button class="chip ${!f.region ? 'on' : ''}" data-r="">Все регионы</button>
    ${REGIONS_ORDER.map(r => `<button class="chip ${f.region === r ? 'on' : ''}" data-r="${r}">${r}</button>`).join('')}
  </div>
  <div class="chips scroll" id="roles" style="margin-bottom:14px">
    <button class="chip ${!f.role ? 'on' : ''}" data-ro="">Все роли</button>
    ${Object.entries(ROLE_RU).map(([k, v]) => `<button class="chip ${f.role === k ? 'on' : ''}" data-ro="${k}">${v}</button>`).join('')}
  </div>
  <div class="grid cols-3" id="list"></div>`;

  const draw = () => {
    const list = TRAINERS.filter(t => (!f.region || t.region === f.region) && (!f.role || t.role === f.role));
    $('#list').innerHTML = list.map(t => {
      const ace = t.ace ? get(t.ace) : null;
      return `<div class="card">
        <div class="trainer">
          <div class="av" style="background:var(--${t.type});position:relative">
            <span>${esc(t.ru[0])}</span>
            <img src="${trainerSprite(t.sprite)}" alt="" loading="lazy" style="position:absolute;inset:0" onerror="this.remove()">
          </div>
          <div style="flex:1;min-width:0">
            <h3>${esc(t.ru)} <span class="muted small">${esc(t.name)}</span></h3>
            <div class="role">${ROLE_RU[t.role]} · ${t.region}${t.city ? ' · ' + esc(t.city) : ''}</div>
            <div style="margin-top:4px">${t.role === 'prof' ? '' : typeBadge(t.type)}</div>
          </div>
          ${ace ? `<a href="#/pokemon/${ace.id}" title="Фирменный покемон: ${esc(ace.n)}"><img src="${sprite(ace.id)}" alt="${esc(ace.n)}" width="56" height="56" loading="lazy"></a>` : ''}
        </div>
        <p class="small" style="margin:10px 0 0"><b>Игры:</b> ${esc(t.games)}</p>
        ${t.note ? `<p class="small muted" style="margin:4px 0 0">${esc(t.note)}</p>` : ''}
      </div>`;
    }).join('') || '<p class="muted">Никого не найдено.</p>';
  };
  $('#regions').addEventListener('click', e => {
    const b = e.target.closest('[data-r]'); if (!b) return;
    f.region = b.dataset.r; $$('#regions .chip').forEach(c => c.classList.toggle('on', c === b)); draw();
  });
  $('#roles').addEventListener('click', e => {
    const b = e.target.closest('[data-ro]'); if (!b) return;
    f.role = b.dataset.ro; $$('#roles .chip').forEach(c => c.classList.toggle('on', c === b)); draw();
  });
  draw();
}
