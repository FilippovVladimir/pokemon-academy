import { $$ } from '../util.js';
import { settings } from '../settings.js';

// Переключатель-«чипы» для одной настройки; используется и на других страницах
export const langSwitch = (key, label, opts) => `
  <div class="lang-switch"><span class="small muted">${label}</span>
    <span class="chips">${opts.map(([v, t]) => `<button class="chip ${settings.get(key) === v ? 'on' : ''}" data-set="${key}" data-v="${v}">${t}</button>`).join('')}</span>
  </div>`;
export const bindSwitches = root => $$('[data-set]', root).forEach(b => b.onclick = () => settings.set(b.dataset.set, b.dataset.v));

export const TYPE_SWITCH = () => langSwitch('typeLang', 'Названия типов:', [['en', 'English'], ['ru', 'Русский']]);
export const DEX_SWITCH = () => langSwitch('dexLang', 'Описание:', [['ru', 'Русский'], ['en', 'English']]);

export function render(app) {
  app.innerHTML = `
  <h1>Настройки</h1>
  <div class="grid cols-2">
    <div class="card">
      <h3>Типы покемонов</h3>
      <p class="small muted">Как подписывать типы везде на сайте: в покедексе, квизах, таблице типов. При наведении на значок типа видно название на другом языке.</p>
      ${TYPE_SWITCH()}
      <p class="small" style="margin-top:10px">Пример: <span class="type t-fire">${settings.get('typeLang') === 'ru' ? 'Огненный' : 'Fire'}</span> <span class="type t-fairy">${settings.get('typeLang') === 'ru' ? 'Фея' : 'Fairy'}</span></p>
    </div>
    <div class="card">
      <h3>Покедекс</h3>
      <p class="small muted">Язык категории («Seed Pokémon» / «Покемон-семя») и описания в карточке покемона. Русский перевод сделан для этого сайта — официального русского покедекса нет.</p>
      ${DEX_SWITCH()}
    </div>
  </div>
  <p class="small muted" style="margin-top:14px">Имена покемонов всегда на английском — так их называют в играх и в сообществе. Настройки общие для всех игроков на этом устройстве.</p>`;
  bindSwitches(app);
}
