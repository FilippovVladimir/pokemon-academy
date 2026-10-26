import { $, esc } from '../util.js';
import { store } from '../store.js';
import { DEX } from '../dex.js';

const SYNC_RU = { local: 'Только на этом устройстве', loading: '⏳ Загружаю из облака…', saving: '⏳ Сохраняю…', saved: '☁️ Сохранено в облаке', error: '⚠️ Ошибка синхронизации' };
let tab = 'login';

export function render(app) {
  const draw = () => {
    const user = store.user();
    if (!store.cloudEnabled) {
      app.innerHTML = `<h1>Профиль</h1><div class="card"><p>Облачные профили ещё не настроены — прогресс сохраняется только на этом устройстве.</p>
        <p class="muted small">Администратору: заполни <code>js/config.js</code> (см. README).</p></div>`;
      return;
    }
    const sync = store.sync();
    app.innerHTML = `
    <h1>Профиль</h1>
    <div class="grid cols-2">
      ${user ? `
      <div class="card">
        <div class="muted small" style="font-weight:700">ТЫ ВОШЁЛ КАК</div>
        <h2 style="margin:4px 0 8px">👤 ${esc(user)}</h2>
        <p class="small">${SYNC_RU[sync.status]}${sync.status === 'error' ? `: ${esc(sync.error)}` : ''}</p>
        <p class="small muted">Изучено покемонов: ${store.caughtCount()} / ${DEX.list.length}. Прогресс одинаков на всех устройствах, где ты вошёл под этим ником.</p>
        <div class="row"><a class="btn" href="#/progress">Мой прогресс</a><button class="btn" id="logout">Выйти</button></div>
      </div>` : `
      <div class="card">
        <div class="chips" style="margin-bottom:12px">
          <button class="chip ${tab === 'login' ? 'on' : ''}" data-tab="login">Вход</button>
          <button class="chip ${tab === 'register' ? 'on' : ''}" data-tab="register">Регистрация</button>
        </div>
        <form id="auth" class="grid" autocomplete="on">
          <input type="text" name="nick" placeholder="Ник" required minlength="2" maxlength="24" autocomplete="username" autocapitalize="off">
          <input type="password" name="pass" placeholder="Пароль" required minlength="4" autocomplete="${tab === 'login' ? 'current-password' : 'new-password'}"
            style="font:inherit;min-height:44px;padding:8px 12px;border-radius:11px;border:1px solid var(--border);background:var(--surface);color:var(--text)">
          ${tab === 'register' && store.caughtCount() + Object.keys(store.allQuizStats()).length ? `
            <label class="small"><input type="checkbox" name="keep" checked> Перенести в новый профиль текущий прогресс с этого устройства</label>` : ''}
          <button class="btn primary">${tab === 'login' ? 'Войти' : 'Создать профиль'}</button>
          <p class="small" id="authErr" style="color:var(--bad);margin:0"></p>
        </form>
        <p class="small muted" style="margin-top:10px">Без почты и GitHub — только ник и пароль. Пароль хранится в зашифрованном виде, но лучше не используй пароль от других сайтов.</p>
      </div>`}
      <div class="card">
        <h3>🏆 Таблица лидеров</h3>
        <div id="lb" class="small muted">Загрузка…</div>
      </div>
    </div>`;

    $('#logout')?.addEventListener('click', () => { store.logout(); });
    app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; draw(); });
    $('#auth')?.addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target, btn = f.querySelector('button'); btn.disabled = true; $('#authErr').textContent = '';
      try {
        if (tab === 'login') await store.login(f.nick.value.trim(), f.pass.value);
        else await store.register(f.nick.value.trim(), f.pass.value, !!f.keep?.checked);
      } catch (err) { $('#authErr').textContent = err.message; btn.disabled = false; }
    });
    loadBoard(user);
  };

  draw();
  // Смену пользователя перерисовывает роутер; здесь только обновляем статус синхронизации
  return store.onChange(() => {
    const p = app.querySelector('.card p.small');
    const s = store.sync();
    if (p && store.user()) p.textContent = SYNC_RU[s.status] + (s.status === 'error' ? ': ' + s.error : '');
  });
}

async function loadBoard(user) {
  const el = $('#lb'); if (!el) return;
  try {
    const rows = await store.leaderboard();
    if (!rows.length) { el.textContent = 'Пока никого нет — будь первым!'; return; }
    el.classList.remove('muted');
    el.innerHTML = `<table class="cov"><thead><tr><th>#</th><th style="text-align:left">Игрок</th><th title="Изучено покемонов">📕</th><th title="Выучено вопросов">📚</th><th title="Правильных ответов">✅</th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr ${r.nick === user ? 'style="font-weight:800"' : ''}><td>${i + 1}</td><td style="text-align:left">${esc(r.nick)}</td><td>${r.caught}</td><td>${r.learned}</td><td>${r.correct}</td></tr>`).join('')}
    </tbody></table>`;
  } catch (e) { el.textContent = 'Не удалось загрузить: ' + e.message; }
}
