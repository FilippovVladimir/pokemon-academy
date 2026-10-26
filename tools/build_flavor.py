"""Builds data/flavor_en.json (latest English Pokédex entry per species) from PokeAPI CSVs.
Usage: python3 tools/build_flavor.py <csv_dir>
"""
import csv, json, os, re, sys
d = sys.argv[1]
versions = {r['id']: r['identifier'] for r in csv.DictReader(open(os.path.join(d, 'versions.csv'), encoding='utf-8'))}
best = {}
for r in csv.DictReader(open(os.path.join(d, 'pokemon_species_flavor_text.csv'), encoding='utf-8')):
    if r['language_id'] != '9': continue
    sid, vid = int(r['species_id']), int(r['version_id'])
    if sid not in best or vid > best[sid][0]:
        best[sid] = (vid, r['flavor_text'])
clean = lambda t: re.sub(r'\s+', ' ', t.replace('­', '').replace('\f', ' ')).strip()
out = {sid: [versions[str(v)], clean(t)] for sid, (v, t) in sorted(best.items()) if sid <= 1025}
json.dump(out, open(os.path.join(os.path.dirname(__file__), '..', 'data', 'flavor_en.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'entries')
