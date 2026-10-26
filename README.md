# ПокеАкадемия

Сайт для изучения вселенной Pokémon: покедекс на 1025 покемонов, квизы (имя, тип, слабости, эволюции, статы, поколения, тренеры, игры), поколения и сюжеты игр, тренеры, таблица типов, конструктор команды и гайд по VGC.

Чистые HTML/CSS/JS без сборки — работает на GitHub Pages.

## Облачные профили (Supabase)

Вход по нику и паролю, прогресс на всех устройствах и таблица лидеров. Без настройки сайт хранит прогресс только в браузере.

1. Создай бесплатный проект на [supabase.com](https://supabase.com).
2. Открой **SQL Editor**, вставь содержимое [`supabase/schema.sql`](supabase/schema.sql) и нажми **Run**.
3. В **Project Settings → API** скопируй **Project URL** и ключ **anon public** в [`js/config.js`](js/config.js).

## Разработка

- Локальный запуск: `python3 -m http.server 8765` и открыть http://localhost:8765
- Обновить данные покемонов: скачать CSV из [PokeAPI](https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv) и запустить `python3 tools/build_pokemon.py <папка_с_csv>`

Данные и изображения — [PokeAPI](https://pokeapi.co). Pokémon © Nintendo / Creatures / GAME FREAK.
