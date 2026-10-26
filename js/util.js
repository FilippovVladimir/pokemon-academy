import { typeName, typeAlt } from './data/types.js';

const SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
export const art = id => `${SPR}/other/official-artwork/${id}.png`;
export const artShiny = id => `${SPR}/other/official-artwork/shiny/${id}.png`;
export const sprite = id => `${SPR}/${id}.png`;
export const cry = id => `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`;
export const trainerSprite = s => `https://play.pokemonshowdown.com/sprites/trainers/${s}.png`;

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const num = id => '#' + String(id).padStart(4, '0');

export const typeBadge = t => `<span class="type t-${t}" title="${typeAlt(t)}">${typeName(t)}</span>`;
export const typeBadges = ts => `<span class="types">${ts.map(typeBadge).join('')}</span>`;

// Спрайт с запасным вариантом: если маленького нет, грузим арт
export const img = (id, cls = '', alt = '') =>
  `<img src="${sprite(id)}" class="${cls}" alt="${esc(alt)}" loading="lazy" onerror="this.onerror=null;this.src='${art(id)}'">`;

export const rand = n => Math.floor(Math.random() * n);
export const pick = arr => arr[rand(arr.length)];
export function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// k случайных элементов arr, не равных exclude (сравнение через key)
export function sample(arr, k, exclude = [], key = x => x) {
  const ex = new Set(exclude.map(key));
  const out = [], seen = new Set();
  let guard = 0;
  while (out.length < k && guard++ < 5000) {
    const x = pick(arr), kx = key(x);
    if (ex.has(kx) || seen.has(kx)) continue;
    seen.add(kx); out.push(x);
  }
  return out;
}

export const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/♀/g, 'f').replace(/♂/g, 'm').replace(/[^a-zа-яё0-9]/g, '');

export function lev(a, b) {
  const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

export const fmtMult = m => ({ 0: '0', 0.25: '¼', 0.5: '½', 1: '1', 2: '2', 4: '4' }[m] ?? m);

export const STAT_NAMES = ['HP', 'Атака', 'Защита', 'Сп. атака', 'Сп. защита', 'Скорость'];
export const STAT_COLORS = ['#ff5959', '#f5ac78', '#fae078', '#9db7f5', '#a7db8d', '#fa92b2'];

// Детерминированный «покемон дня»
export function dayIndex(n) {
  const d = new Date(); const s = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  let x = s; x = ((x >>> 16) ^ x) * 0x45d9f3b; x = ((x >>> 16) ^ x) * 0x45d9f3b; x = (x >>> 16) ^ x;
  return Math.abs(x) % n;
}
