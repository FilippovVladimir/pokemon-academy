// Меню «Ещё» для мобильной нижней панели
const LINKS = [
  ['#/trainers', '🧢', 'Тренеры'], ['#/types', '🔥', 'Типы'], ['#/team', '🛡️', 'Конструктор команды'],
  ['#/guides', '📘', 'Гайды'], ['#/guides/vgc', '🏆', 'Гайд по VGC'], ['#/progress', '📈', 'Мой прогресс'], ['#/profile', '👤', 'Игроки и перенос прогресса'],
];

export function render(app) {
  app.innerHTML = `<h1>Ещё</h1><div class="grid cols-2">${LINKS.map(([h, i, t]) =>
    `<a class="card tile row" href="${h}"><span class="ico">${i}</span><h3 style="margin:0">${t}</h3></a>`).join('')}</div>`;
}
