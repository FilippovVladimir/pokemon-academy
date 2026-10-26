"""Builds data/pokemon.json from PokeAPI CSV dumps.
Usage: python3 tools/build_pokemon.py <csv_dir>
CSVs: https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv
"""
import csv, json, sys, os
from collections import defaultdict

d = sys.argv[1]
def rows(name):
    with open(os.path.join(d, name + '.csv'), encoding='utf-8') as f:
        return list(csv.DictReader(f))

types = {r['id']: r['identifier'] for r in rows('types')}
ab_names = {r['ability_id']: r['name'] for r in rows('ability_names') if r['local_language_id'] == '9'}
species = {r['id']: r for r in rows('pokemon_species')}
names = defaultdict(dict)
for r in rows('pokemon_species_names'):
    names[r['pokemon_species_id']][r['local_language_id']] = r
ptypes = defaultdict(list)
for r in sorted(rows('pokemon_types'), key=lambda r: int(r['slot'])):
    ptypes[r['pokemon_id']].append(types[r['type_id']])
stats = defaultdict(lambda: [0]*6)
for r in rows('pokemon_stats'):
    stats[r['pokemon_id']][int(r['stat_id']) - 1] = int(r['base_stat'])
abil = defaultdict(list)
for r in sorted(rows('pokemon_abilities'), key=lambda r: int(r['slot'])):
    n = ab_names.get(r['ability_id'])
    if n: abil[r['pokemon_id']].append(n + ('*' if r['is_hidden'] == '1' else ''))

out = []
for p in rows('pokemon'):
    if p['is_default'] != '1': continue
    sid = p['species_id']; s = species[sid]; nm = names[sid]
    en = nm.get('9', {})
    out.append({
        'id': int(sid),
        'n': en.get('name') or s['identifier'].title(),
        'jp': nm.get('1', {}).get('name', ''),
        'ro': nm.get('2', {}).get('name', ''),
        'g': en.get('genus', ''),
        't': ptypes[p['id']],
        's': stats[p['id']],
        'a': abil[p['id']],
        'h': int(p['height']), 'w': int(p['weight']),
        'gen': int(s['generation_id']),
        'ev': int(s['evolves_from_species_id']) if s['evolves_from_species_id'] else 0,
        'ch': int(s['evolution_chain_id']) if s['evolution_chain_id'] else 0,
        'l': 2 if s['is_mythical'] == '1' else (1 if s['is_legendary'] == '1' else 0),
    })
out.sort(key=lambda x: x['id'])
json.dump(out, open(os.path.join(os.path.dirname(__file__), '..', 'data', 'pokemon.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'pokemon')
