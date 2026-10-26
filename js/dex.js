// Загрузка локального датасета покемонов (data/pokemon.json, собирается tools/build_pokemon.py).
let cache;
export const DEX = { list: [], byId: new Map(), byChain: new Map() };

export function loadDex() {
  if (cache) return cache;
  cache = fetch('data/pokemon.json').then(r => r.json()).then(list => {
    for (const p of list) {
      p.bst = p.s.reduce((a, b) => a + b, 0);
      DEX.byId.set(p.id, p);
      if (!DEX.byChain.has(p.ch)) DEX.byChain.set(p.ch, []);
      DEX.byChain.get(p.ch).push(p);
    }
    DEX.list = list;
    return DEX;
  });
  return cache;
}

export const get = id => DEX.byId.get(id);

// Стадии эволюции: массив уровней [[base], [stage2...], [stage3...]]
export function evoStages(p) {
  const fam = DEX.byChain.get(p.ch) || [p];
  const ids = new Set(fam.map(x => x.id));
  const levels = [];
  let cur = fam.filter(x => !x.ev || !ids.has(x.ev));
  while (cur.length) {
    levels.push(cur);
    const curIds = new Set(cur.map(x => x.id));
    cur = fam.filter(x => curIds.has(x.ev));
  }
  return levels;
}

// Описание из PokeAPI (с кэшем в sessionStorage)
export async function fetchSpecies(id) {
  const k = 'sp:' + id;
  try { const c = sessionStorage.getItem(k); if (c) return JSON.parse(c); } catch {}
  const r = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}/`);
  if (!r.ok) throw new Error(r.status);
  const d = await r.json();
  const flav = d.flavor_text_entries.filter(e => e.language.name === 'en');
  const out = {
    flavor: (flav.at(-1)?.flavor_text || '').replace(/[\f\n­]+/g, ' '),
    version: flav.at(-1)?.version?.name || '',
    capture: d.capture_rate, egg: d.egg_groups.map(e => e.name), habitat: d.habitat?.name || '',
    varieties: d.varieties.filter(v => !v.is_default).map(v => v.pokemon.name),
  };
  try { sessionStorage.setItem(k, JSON.stringify(out)); } catch {}
  return out;
}
