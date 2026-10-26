# Инструменты данных

- `build_pokemon.py <csv_dir>` — собирает `data/pokemon.json` из CSV PokeAPI.
- `build_flavor.py <csv_dir>` — собирает `data/flavor_en.json` (последняя английская запись покедекса для каждого вида).
- `data/flavor_ru.json` — русский перевод категорий и описаний покедекса (`{ id: [категория, описание] }`), сделан вручную по `flavor_en.json`. Официального русского покедекса не существует.
