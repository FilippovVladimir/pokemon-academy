import { $, esc } from '../util.js';
import { store } from '../store.js';
import { DEX } from '../dex.js';

export function render(app) {
  const players = store.players().sort((a, b) => b.caught - a.caught || b.correct - a.correct);
  const me = store.player();

  app.innerHTML = `
  <h1>Игроки</h1>
  <p class="muted">Прогресс хранится на этом устройстве. Здесь можно завести несколько игроков и перенести прогресс на другое устройство кодом.</p>
  <div class="grid cols-2">
    <div class="card">
      <h3>🏆 Игроки на этом устройстве</h3>
      <table class="cov"><thead><tr><th>#</th><th style="text-align:left">Игрок</th><th title="Изучено покемонов">📕</th><th title="Выучено вопросов">📚</th><th title="Правильных ответов">✅</th><th></th></tr></thead><tbody>
      ${players.map((p, i) => `<tr ${p.current ? 'style="font-weight:800"' : ''}>
        <td>${i + 1}</td><td style="text-align:left">${esc(p.name)}</td><td>${p.caught}</td><td>${p.learned}</td><td>${p.correct}</td>
        <td>${p.current ? '<span class="tag">это ты</span>' : `<button class="btn small" data-switch="${p.id}">Играть</button>`}</td></tr>`).join('')}
      </tbody></table>
      <form id="add" class="answer-form" style="margin-top:14px" autocomplete="off">
        <input type="text" name="name" placeholder="Имя нового игрока" maxlength="24" required>
        <button class="btn">+ Добавить</button>
      </form>
    </div>

    <div class="card">
      <h3>👤 Сейчас играет: ${esc(me.name)}</h3>
      <p class="small muted">Изучено покемонов: ${store.caughtCount()} / ${DEX.list.length}</p>
      <form id="rename" class="answer-form" autocomplete="off">
        <input type="text" name="name" value="${esc(me.name)}" maxlength="24" required>
        <button class="btn">Переименовать</button>
      </form>
      ${players.length > 1 ? '<button class="btn small" id="remove" style="margin-top:10px">Удалить этого игрока</button>' : ''}
    </div>

    <div class="card">
      <h3>📤 Перенести на другое устройство</h3>
      <ol class="small" style="padding-left:18px;margin:0 0 10px">
        <li>Нажми «Скопировать код» и отправь его себе (в мессенджер или на почту).</li>
        <li>На другом устройстве открой эту страницу и вставь код в поле «Загрузить».</li>
      </ol>
      <div class="row">
        <button class="btn primary" id="copy">📋 Скопировать код</button>
        <button class="btn" id="file">💾 Скачать файлом</button>
      </div>
      <p class="small" id="copyMsg" style="margin:8px 0 0"></p>
    </div>

    <div class="card">
      <h3>📥 Загрузить с другого устройства</h3>
      <textarea id="code" rows="3" placeholder="Вставь код, который начинается с PA1." style="width:100%;font:inherit;font-size:.85rem;padding:8px 12px;border-radius:11px;border:1px solid var(--border);background:var(--surface);color:var(--text);resize:vertical"></textarea>
      <div class="row" style="margin-top:8px">
        <button class="btn primary" id="check">Проверить код</button>
        <label class="btn">📂 Из файла<input type="file" id="upload" accept=".txt,text/plain" hidden></label>
      </div>
      <div id="preview" class="small" style="margin-top:10px"></div>
    </div>
  </div>`;

  app.querySelectorAll('[data-switch]').forEach(b => b.onclick = () => store.switchTo(b.dataset.switch));
  $('#add').onsubmit = e => { e.preventDefault(); store.addPlayer(e.target.name.value); };
  $('#rename').onsubmit = e => { e.preventDefault(); store.rename(me.id, e.target.name.value); render(app); };
  $('#remove')?.addEventListener('click', () => {
    if (confirm(`Удалить игрока «${me.name}» и весь его прогресс? Это нельзя отменить.`)) store.removePlayer(me.id);
  });

  const msg = t => { $('#copyMsg').textContent = t; };
  $('#copy').onclick = async () => {
    const code = await store.exportCode();
    try { await navigator.clipboard.writeText(code); msg(`✅ Код скопирован (${code.length} символов). Вставь его на другом устройстве.${code.length > 4000 ? ' Код длинный — мессенджер может разбить его на части, надёжнее «Скачать файлом».' : ''}`); }
    catch { $('#code').value = code; msg('Не удалось скопировать автоматически — код появился в поле справа/ниже, скопируй его вручную.'); }
  };
  $('#file').onclick = async () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([await store.exportCode()], { type: 'text/plain' }));
    a.download = `pokeacademy-${me.name}.txt`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    msg('✅ Файл сохранён — открой его на другом устройстве через «Из файла».');
  };

  const showPreview = async code => {
    const box = $('#preview');
    try {
      const parsed = await store.parseCode(code);
      const exists = store.players().some(p => p.name.toLowerCase() === parsed.name.toLowerCase());
      box.innerHTML = `<p>Игрок <b>${esc(parsed.name)}</b>: изучено ${parsed.summary.caught}, выучено вопросов ${parsed.summary.learned}, правильных ответов ${parsed.summary.correct}.</p>
        <p class="muted">${exists ? 'Такой игрок уже есть на этом устройстве — прогресс объединится, ничего не пропадёт.' : 'Будет добавлен новый игрок.'}</p>
        <button class="btn primary" id="doImport">Загрузить</button>`;
      $('#doImport').onclick = () => { store.importPlayer(parsed); render(app); };
    } catch (e) { box.innerHTML = `<p style="color:var(--bad)">${esc(e.message)}</p>`; }
  };
  $('#check').onclick = () => showPreview($('#code').value);
  $('#upload').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    const text = await f.text(); $('#code').value = text.trim(); showPreview(text);
  };
}
