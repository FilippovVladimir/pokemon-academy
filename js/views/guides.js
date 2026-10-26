import { GUIDES } from '../data/guides.js';

export function render(app, [id]) {
  const g = GUIDES.find(x => x.id === id);
  if (!g) {
    app.innerHTML = `<h1>Гайды</h1><p class="muted">Короткие статьи о механиках, соревновательных форматах и коллекционировании.</p>
    <div class="grid cols-2">${GUIDES.map(x => `<a class="card tile" href="#/guides/${x.id}"><div class="ico">${x.icon}</div><h3>${x.title}</h3><p>${x.desc}</p></a>`).join('')}
      <a class="card tile" href="#/games"><div class="ico">📜</div><h3>Сюжеты игр</h3><p>Краткие сюжеты всех основных игр — в разделе «Игры и поколения».</p></a>
      <a class="card tile" href="#/types"><div class="ico">🔥</div><h3>Типы и слабости</h3><p>Таблица типов, калькулятор и шпаргалка по каждому типу.</p></a>
    </div>`;
    return;
  }
  // Оглавление из заголовков статьи
  const toc = [...g.html.matchAll(/<h2 id="([^"]+)">([^<]+)<\/h2>/g)];
  app.innerHTML = `<a class="back" href="#/guides">← Все гайды</a>
    <article class="prose">
      <h1>${g.icon} ${g.title}</h1>
      <p class="muted">${g.desc}</p>
      ${toc.length > 2 ? `<div class="toc">${toc.map(([, hid, t]) => `<button class="chip" data-to="${hid}">${t}</button>`).join('')}</div>` : ''}
      ${g.html}
    </article>`;
  app.querySelector('.toc')?.addEventListener('click', e => {
    const b = e.target.closest('[data-to]');
    if (b) document.getElementById(b.dataset.to)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
