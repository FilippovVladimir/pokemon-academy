// Таблица типов (поколение 6+). EFF[атакующий][защитник] = множитель (по умолчанию 1).
import { settings } from '../settings.js';

export const TYPES = ['normal','fire','water','electric','grass','ice','fighting','poison','ground',
  'flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];

export const TYPE_RU = {
  normal: 'Нормальный', fire: 'Огненный', water: 'Водный', electric: 'Электрический', grass: 'Травяной',
  ice: 'Ледяной', fighting: 'Боевой', poison: 'Ядовитый', ground: 'Земляной', flying: 'Летающий',
  psychic: 'Психический', bug: 'Жук', rock: 'Каменный', ghost: 'Призрак', dragon: 'Драконий',
  dark: 'Тёмный', steel: 'Стальной', fairy: 'Фея',
};
export const TYPE_EN = Object.fromEntries(TYPES.map(t => [t, t[0].toUpperCase() + t.slice(1)]));

// Название типа на выбранном в настройках языке и на другом (для подсказки)
export const typeName = t => (settings.get('typeLang') === 'ru' ? TYPE_RU : TYPE_EN)[t];
export const typeAlt = t => (settings.get('typeLang') === 'ru' ? TYPE_EN : TYPE_RU)[t];

const CHART = {
  normal:   { x05: ['rock','steel'], x0: ['ghost'] },
  fire:     { x2: ['grass','ice','bug','steel'], x05: ['fire','water','rock','dragon'] },
  water:    { x2: ['fire','ground','rock'], x05: ['water','grass','dragon'] },
  electric: { x2: ['water','flying'], x05: ['electric','grass','dragon'], x0: ['ground'] },
  grass:    { x2: ['water','ground','rock'], x05: ['fire','grass','poison','flying','bug','dragon','steel'] },
  ice:      { x2: ['grass','ground','flying','dragon'], x05: ['fire','water','ice','steel'] },
  fighting: { x2: ['normal','ice','rock','dark','steel'], x05: ['poison','flying','psychic','bug','fairy'], x0: ['ghost'] },
  poison:   { x2: ['grass','fairy'], x05: ['poison','ground','rock','ghost'], x0: ['steel'] },
  ground:   { x2: ['fire','electric','poison','rock','steel'], x05: ['grass','bug'], x0: ['flying'] },
  flying:   { x2: ['grass','fighting','bug'], x05: ['electric','rock','steel'] },
  psychic:  { x2: ['fighting','poison'], x05: ['psychic','steel'], x0: ['dark'] },
  bug:      { x2: ['grass','psychic','dark'], x05: ['fire','fighting','poison','flying','ghost','steel','fairy'] },
  rock:     { x2: ['fire','ice','flying','bug'], x05: ['fighting','ground','steel'] },
  ghost:    { x2: ['psychic','ghost'], x05: ['dark'], x0: ['normal'] },
  dragon:   { x2: ['dragon'], x05: ['steel'], x0: ['fairy'] },
  dark:     { x2: ['psychic','ghost'], x05: ['fighting','dark','fairy'] },
  steel:    { x2: ['ice','rock','fairy'], x05: ['fire','water','electric','steel'] },
  fairy:    { x2: ['fighting','dragon','dark'], x05: ['fire','poison','steel'] },
};

export const EFF = {};
for (const a of TYPES) {
  EFF[a] = {};
  for (const d of TYPES) EFF[a][d] = 1;
  const c = CHART[a];
  (c.x2 || []).forEach(d => EFF[a][d] = 2);
  (c.x05 || []).forEach(d => EFF[a][d] = 0.5);
  (c.x0 || []).forEach(d => EFF[a][d] = 0);
}

// Множитель атаки типа atk по покемону с типами defTypes
export const mult = (atk, defTypes) => defTypes.reduce((m, d) => m * EFF[atk][d], 1);

// Все множители для защитника: { fire: 2, water: 0.5, ... }
export function defenseProfile(defTypes) {
  return Object.fromEntries(TYPES.map(a => [a, mult(a, defTypes)]));
}

export const TYPE_TIPS = {
  normal: 'Нет слабостей, кроме Боевого. Иммунитет к Призраку. Не может навредить Призраку.',
  fire: 'Сжигает Траву, Лёд, Жуков и Сталь. Боится Воды, Земли и Камня.',
  water: 'Самый частый тип. Силён против Огня, Земли и Камня; слаб к Траве и Электричеству.',
  electric: 'Бьёт Воду и Летающих. Земля полностью блокирует электрические атаки. Иммунитет к параличу.',
  grass: 'Атакует Воду, Землю и Камень, но слабо бьёт по 7 типам. Иммунитет к порошкам и Leech Seed.',
  ice: 'Отличный атакующий тип (4× по Драконам-Летающим вроде Dragonite), но плохая защита — 4 слабости.',
  fighting: 'Бьёт Нормальных, Лёд, Камень, Тьму и Сталь. Не попадает по Призракам.',
  poison: 'Супер-эффективен по Феям и Траве. Сталь иммунна к ядовитым атакам. Ядовитые не отравляются.',
  ground: 'Один из лучших атакующих типов. Иммунитет к Электричеству, но Летающие иммунны к Земле.',
  flying: 'Иммунитет к атакам Земли. Слаб к Камню, Льду и Электричеству.',
  psychic: 'Бьёт Боевых и Ядовитых. Тёмные полностью иммунны к психическим атакам.',
  bug: 'Бьёт Траву, Психических и Тёмных, но слабо бьёт по 7 типам.',
  rock: 'Бьёт Огонь, Лёд, Летающих и Жуков. Много слабостей: Вода, Трава, Боевой, Земля, Сталь.',
  ghost: 'Иммунитет к Нормальным и Боевым атакам. Слаб к Призраку и Тьме.',
  dragon: 'Бьёт только Драконов, но почти ничем не сдерживается — кроме Стали и Фей (иммунитет).',
  dark: 'Иммунитет к Психическим атакам. Слаб к Боевым, Жукам и Феям.',
  steel: 'Лучший защитный тип: 10 сопротивлений и иммунитет к Яду.',
  fairy: 'Появился в 6 поколении для баланса Драконов: иммунитет к Драконьим атакам.',
};
