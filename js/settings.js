// Настройки отображения (общие для всех игроков на устройстве).
const KEY = 'pokeacademy:settings';
const DEFAULTS = {
  typeLang: 'en', // названия типов: en | ru
  dexLang: 'ru',  // категория и описание покемона в покедексе: ru | en
};

let values = { ...DEFAULTS };
try { Object.assign(values, JSON.parse(localStorage.getItem(KEY)) || {}); } catch {}
const listeners = new Set();

export const settings = {
  get: k => values[k],
  set(k, v) {
    if (values[k] === v) return;
    values[k] = v;
    try { localStorage.setItem(KEY, JSON.stringify(values)); } catch {}
    listeners.forEach(f => f(k, v));
  },
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
