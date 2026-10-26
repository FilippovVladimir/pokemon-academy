import { DEX, get } from '../dex.js';
import { $, $$, esc, art, sprite, img, pick, shuffle, sample, norm, lev, typeBadge, typeBadges, fmtMult, trainerSprite, STAT_NAMES } from '../util.js';
import { TYPES, TYPE_RU, EFF, mult, defenseProfile } from '../data/types.js';
import { GENERATIONS, ALL_GAMES } from '../data/games.js';
import { TRAINERS, ROLE_RU, REGIONS_ORDER } from '../data/trainers.js';
import { store } from '../store.js';

const ROUND = 10;

// Каждый квиз — генератор вопросов. Вопрос: { html, options?: [{label, ok}], typePick?, input?, after? }
const QUIZZES = {
  name: { icon: '❓', title: 'Кто этот покемон?', desc: 'Угадай покемона по силуэту. Можно выбирать из вариантов или вписывать имя.', settings: ['gens', 'mode', 'sil'], gen: qName },
  type: { icon: '🎨', title: 'Угадай тип', desc: 'Выбери все типы показанного покемона (один или два).', settings: ['gens'], gen: qType },
  weak: { icon: '💥', title: 'Слабости покемона', desc: 'Какой тип атаки будет супер-эффективен против покемона?', settings: ['gens'], gen: qWeak },
  matchup: { icon: '⚔️', title: 'Тип против типа', desc: 'Какой множитель урона у атаки типа X по типу Y?', settings: ['level'], gen: qMatchup },
  gen: { icon: '🗺️', title: 'Какое поколение?', desc: 'Из какого поколения и региона этот покемон?', settings: [], gen: qGen },
  evo: { icon: '🧬', title: 'Эволюции', desc: 'В кого эволюционирует покемон — или из кого?', settings: ['gens'], gen: qEvo },
  stats: { icon: '📊', title: 'Кто сильнее?', desc: 'У кого из двух покемонов выше выбранная базовая характеристика?', settings: ['gens'], gen: qStats },
  trainers: { icon: '🧢', title: 'Тренеры', desc: 'Лидеры стадионов, чемпионы и злодеи: имя, тип, регион, фирменный покемон.', settings: ['regions'], gen: qTrainer },
  games: { icon: '🎮', title: 'Игры серии', desc: 'Регионы, годы выхода, стартеры и легендарные талисманы игр.', settings: [], gen: qGames },
};

let cfg = { gens: new Set(), mode: 'choice', sil: true, level: 'easy', regions: new Set() };

export function render(app, [idRaw]) {
  const [id, qs] = (idRaw || '').split('?');
  if (qs) {
    const g = new URLSearchParams(qs).get('gen');
    if (g) cfg.gens = new Set([+g]);
  }
  if (!id || !QUIZZES[id]) return renderHub(app);
  return renderSetup(app, id);
}

function renderHub(app) {
  app.innerHTML = `
  <h1>Квизы</h1>
  <p class="muted">Раунд — ${ROUND} вопросов. Лучшие результаты сохраняются на этом устройстве.</p>
  <div class="grid cols-3">${Object.entries(QUIZZES).map(([id, q]) => {
    const s = store.quizStats(id);
    return `<a class="card tile" href="#/quiz/${id}"><div class="ico">${q.icon}</div><h3>${q.title}</h3><p>${q.desc}</p>
      <p class="small" style="margin-top:8px">${s.played ? `🏅 Рекорд: ${s.best}/${ROUND} · точность ${Math.round(s.correct / s.answered * 100)}%` : '<span class="muted">Ещё не пройден</span>'}</p></a>`;
  }).join('')}</div>`;
}

function renderSetup(app, id) {
  const q = QUIZZES[id];
  const set = q.settings;
  app.innerHTML = `
  <a class="back" href="#/quiz">← Все квизы</a>
  <div class="quiz-box card quiz-settings">
    <div style="text-align:center"><div style="font-size:2.4rem">${q.icon}</div><h1>${q.title}</h1><p class="muted">${q.desc}</p></div>
    ${set.includes('gens') ? `<label>Поколения <span class="muted small">(ничего не выбрано = все)</span></label>
      <div class="chips" id="sGens">${GENERATIONS.map(g => `<button class="chip ${cfg.gens.has(g.gen) ? 'on' : ''}" data-v="${g.gen}">${g.gen} · ${g.region}</button>`).join('')}</div>` : ''}
    ${set.includes('regions') ? `<label>Регионы <span class="muted small">(ничего не выбрано = все)</span></label>
      <div class="chips" id="sRegions">${REGIONS_ORDER.map(r => `<button class="chip ${cfg.regions.has(r) ? 'on' : ''}" data-v="${r}">${r}</button>`).join('')}</div>` : ''}
    ${set.includes('mode') ? `<label>Режим ответа</label>
      <div class="chips" id="sMode">
        <button class="chip ${cfg.mode === 'choice' ? 'on' : ''}" data-v="choice">Варианты ответа</button>
        <button class="chip ${cfg.mode === 'input' ? 'on' : ''}" data-v="input">Вписать имя</button>
      </div>` : ''}
    ${set.includes('sil') ? `<label>Подсказка</label>
      <div class="chips" id="sSil">
        <button class="chip ${cfg.sil ? 'on' : ''}" data-v="1">Силуэт (сложнее)</button>
        <button class="chip ${!cfg.sil ? 'on' : ''}" data-v="0">Цветная картинка</button>
      </div>` : ''}
    ${set.includes('level') ? `<label>Сложность</label>
      <div class="chips" id="sLevel">
        <button class="chip ${cfg.level === 'easy' ? 'on' : ''}" data-v="easy">Один тип защиты</button>
        <button class="chip ${cfg.level === 'hard' ? 'on' : ''}" data-v="hard">Два типа защиты (×4, ×¼)</button>
      </div>` : ''}
    <div style="text-align:center;margin-top:22px"><button class="btn primary" id="start" style="min-width:200px">Начать</button></div>
  </div>`;

  const multi = (sel, key) => $(sel)?.addEventListener('click', e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    const v = key === 'gens' ? +b.dataset.v : b.dataset.v;
    cfg[key].has(v) ? cfg[key].delete(v) : cfg[key].add(v); b.classList.toggle('on');
  });
  const single = (sel, fn) => $(sel)?.addEventListener('click', e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    fn(b.dataset.v); $$(sel + ' .chip').forEach(c => c.classList.toggle('on', c === b));
  });
  multi('#sGens', 'gens'); multi('#sRegions', 'regions');
  single('#sMode', v => cfg.mode = v); single('#sSil', v => cfg.sil = v === '1'); single('#sLevel', v => cfg.level = v);
  $('#start').onclick = () => runQuiz(app, id);
}

// ---------- Движок ----------
function runQuiz(app, id) {
  const q = QUIZZES[id];
  let i = 0, score = 0, streak = 0, bestStreak = 0;
  const used = new Set();

  const next = () => {
    if (i >= ROUND) return finish();
    let question, guard = 0;
    do { question = q.gen(); } while (question.key && used.has(question.key) && guard++ < 30);
    if (question.key) used.add(question.key);
    i++;
    show(question);
  };

  const show = (qq) => {
    window.scrollTo(0, 0);
    app.innerHTML = `
    <div class="quiz-box">
      <div class="quiz-top">
        <a href="#/quiz/${id}" class="small">✕ Выйти</a>
        <div class="scorebar"><span>Вопрос ${i}/${ROUND}</span><span>✅ ${score}</span><span>🔥 ${streak}</span></div>
      </div>
      <div class="card pop" id="qcard">
        ${qq.html}
        <div id="answers"></div>
        <div class="feedback" id="fb"></div>
        <div id="nextWrap" style="display:none"><button class="btn primary" id="next">${i >= ROUND ? 'Результаты' : 'Дальше →'}</button></div>
      </div>
    </div>`;
    const done = (ok, msg) => {
      if (ok) { score++; streak++; bestStreak = Math.max(bestStreak, streak); } else streak = 0;
      store.recordAnswer(id, ok);
      qq.onResult?.(ok);
      const fb = $('#fb'); fb.className = 'feedback ' + (ok ? 'ok' : 'no');
      fb.innerHTML = (ok ? '✅ Верно! ' : '❌ Неверно. ') + (msg || '');
      if (!ok) $('#qcard').classList.add('shake');
      $('#nextWrap').style.display = '';
      $('#next').focus();
      $('#next').onclick = next;
      qq.reveal?.();
    };
    if (qq.options) renderOptions(qq, done);
    else if (qq.typePick) renderTypePick(qq, done);
    else if (qq.input) renderInput(qq, done);
    else if (qq.custom) qq.custom($('#answers'), done);
  };

  const finish = () => {
    store.recordRound(id, score, bestStreak);
    const s = store.quizStats(id);
    const mood = score === ROUND ? '🏆 Идеально! Ты настоящий мастер покемонов!' : score >= 7 ? '🎉 Отличный результат!' : score >= 4 ? '👍 Неплохо, продолжай тренироваться!' : '💪 Не сдавайся — повторение мать учения!';
    app.innerHTML = `
    <div class="quiz-box card pop">
      <div style="font-size:2.4rem">${q.icon}</div>
      <h2>${q.title}</h2>
      <div class="result-big">${score} / ${ROUND}</div>
      <p>${mood}</p>
      <p class="muted small">Лучшая серия в раунде: ${bestStreak} · Рекорд: ${s.best}/${ROUND} · Сыграно раундов: ${s.played}</p>
      <div class="row" style="justify-content:center;margin-top:12px">
        <button class="btn primary" id="again">Ещё раунд</button>
        <a class="btn" href="#/quiz">Другие квизы</a>
      </div>
    </div>`;
    $('#again').onclick = () => runQuiz(app, id);
  };
  next();
}

function renderOptions(qq, done) {
  const box = $('#answers');
  box.innerHTML = `<div class="options ${qq.stack ? 'stack' : ''}">${qq.options.map((o, k) => `<button class="btn opt" data-k="${k}">${o.label}</button>`).join('')}</div>`;
  box.addEventListener('click', e => {
    const b = e.target.closest('.opt'); if (!b || box.dataset.done) return;
    box.dataset.done = 1;
    const o = qq.options[+b.dataset.k];
    $$('.opt', box).forEach((x, k) => { x.disabled = true; if (qq.options[k].ok) x.classList.add('correct'); });
    if (!o.ok) b.classList.add('wrong');
    done(o.ok, qq.explain);
  });
}

function renderTypePick(qq, done) {
  const box = $('#answers'); const chosen = new Set();
  box.innerHTML = `<div class="type-pick">${TYPES.map(t => `<span class="type t-${t}" data-t="${t}">${TYPE_RU[t]}</span>`).join('')}</div>
    <div style="margin-top:14px"><button class="btn primary" id="check" disabled>Проверить</button></div>`;
  const pickEl = $('.type-pick', box);
  pickEl.addEventListener('click', e => {
    const b = e.target.closest('[data-t]'); if (!b || box.dataset.done) return;
    const t = b.dataset.t;
    if (chosen.has(t)) chosen.delete(t); else { if (chosen.size >= 2) return; chosen.add(t); }
    b.classList.toggle('on', chosen.has(t)); $('#check').disabled = !chosen.size;
  });
  $('#check').onclick = () => {
    box.dataset.done = 1; $('#check').style.display = 'none';
    const ans = new Set(qq.typePick);
    const ok = chosen.size === ans.size && [...chosen].every(t => ans.has(t));
    $$('.type', pickEl).forEach(x => {
      const t = x.dataset.t;
      if (ans.has(t)) x.classList.add('correct'); else if (chosen.has(t)) x.classList.add('wrong');
    });
    done(ok, `Правильный ответ: ${typeBadges(qq.typePick)}`);
  };
}

function renderInput(qq, done) {
  const box = $('#answers');
  box.innerHTML = `<form class="answer-form" autocomplete="off"><input type="text" id="ans" placeholder="Имя покемона (на английском)…" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done"><button class="btn primary">OK</button></form>
    <div class="row" style="justify-content:center;margin-top:10px"><button class="btn small" id="hint">💡 Подсказка</button><button class="btn small" id="skip">Сдаться</button></div>`;
  const input = $('#ans');
  setTimeout(() => input.focus(), 50);
  let hints = 0;
  const target = norm(qq.input);
  const finish = (ok) => { box.dataset.done = 1; input.disabled = true; $$('button', box).forEach(b => b.disabled = true); done(ok, qq.explain); };
  $('form', box).onsubmit = e => {
    e.preventDefault(); if (box.dataset.done) return;
    const v = norm(input.value); if (!v) return;
    const ok = v === target || (target.length >= 5 && lev(v, target) <= 1);
    if (ok) finish(true); else { input.classList.add('shake'); setTimeout(() => input.classList.remove('shake'), 400); input.select(); }
  };
  $('#hint').onclick = () => { hints++; input.placeholder = qq.input.slice(0, hints) + '_'.repeat(Math.max(0, qq.input.length - hints)); input.focus(); };
  $('#skip').onclick = () => finish(false);
}

// ---------- Пулы ----------
const pool = () => {
  const l = DEX.list.filter(p => !cfg.gens.size || cfg.gens.has(p.gen));
  return l.length ? l : DEX.list;
};
const monImg = (p, sil = false) => `<img class="q-img ${sil ? 'sil' : ''}" id="qimg" src="${art(p.id)}" alt="" draggable="false">`;
const linkTo = p => `<a href="#/pokemon/${p.id}" target="_blank">${esc(p.n)}</a>`;

// ---------- Генераторы ----------
function qName() {
  const P = pool(), p = pick(P);
  const base = {
    key: p.id,
    html: `<div class="q-text">Кто этот покемон?</div>${monImg(p, cfg.sil)}`,
    explain: `Это <b>${linkTo(p)}</b> ${typeBadges(p.t)}`,
    reveal: () => $('#qimg')?.classList.remove('sil'),
    onResult: ok => { if (ok && store.catch(p.id)) $('#fb').insertAdjacentHTML('beforeend', '<br><span class="small">📕 Добавлен в изученные!</span>'); },
  };
  if (cfg.mode === 'input') return { ...base, input: p.n };
  // Похожие варианты: сначала того же типа, чтобы было интереснее
  const similar = P.filter(x => x.id !== p.id && x.t.some(t => p.t.includes(t)));
  const wrong = sample(similar.length >= 3 ? similar : P, 3, [p], x => x.id);
  return { ...base, options: shuffle([{ label: esc(p.n), ok: true }, ...wrong.map(w => ({ label: esc(w.n), ok: false }))]) };
}

function qType() {
  const p = pick(pool());
  return {
    key: p.id, typePick: p.t,
    html: `<div class="q-text">Какого типа ${esc(p.n)}?</div>${monImg(p)}<p class="muted small">Выбери 1 или 2 типа</p>`,
  };
}

function qWeak() {
  const P = pool();
  let p, prof, strong;
  do { p = pick(P); prof = defenseProfile(p.t); strong = TYPES.filter(t => prof[t] >= 2); } while (!strong.length);
  const right = pick(strong);
  const wrong = sample(TYPES.filter(t => prof[t] < 2), 3, [right]);
  const all = TYPES.filter(t => prof[t] >= 2);
  return {
    key: p.id,
    html: `<div class="q-text">Какой тип атаки супер-эффективен против ${esc(p.n)}?</div>${monImg(p)}<div style="margin:-4px 0 12px">${typeBadges(p.t)}</div>`,
    options: shuffle([{ label: typeBadge(right), ok: true }, ...wrong.map(t => ({ label: typeBadge(t), ok: false }))]),
    explain: `Слабости ${esc(p.n)}: ${all.map(t => `${typeBadge(t)}<small>×${prof[t]}</small>`).join(' ')}`,
  };
}

function qMatchup() {
  const a = pick(TYPES);
  const def = cfg.level === 'hard' ? sample(TYPES, 2) : [pick(TYPES)];
  const m = mult(a, def);
  const opts = cfg.level === 'hard' ? [0, 0.25, 0.5, 1, 2, 4] : [0, 0.5, 1, 2];
  return {
    key: a + def.join(),
    html: `<div class="q-text">Атака ${typeBadge(a)} по покемону типа ${typeBadges(def)}</div><p class="muted">Какой множитель урона?</p>`,
    options: opts.map(o => ({ label: '×' + fmtMult(o), ok: o === m })),
    explain: def.length > 1 ? `${TYPE_RU[a]} → ${TYPE_RU[def[0]]} ×${fmtMult(EFF[a][def[0]])}, → ${TYPE_RU[def[1]]} ×${fmtMult(EFF[a][def[1]])}. Итого ×${fmtMult(m)}` : '',
  };
}

function qGen() {
  const p = pick(DEX.list);
  const g = GENERATIONS[p.gen - 1];
  const wrong = sample(GENERATIONS, 3, [g], x => x.gen);
  return {
    key: p.id,
    html: `<div class="q-text">Из какого поколения ${esc(p.n)}?</div>${monImg(p)}`,
    options: [g, ...wrong].sort((x, y) => x.gen - y.gen).map(x => ({ label: `${x.gen} · ${x.region}`, ok: x === g })),
    explain: `${linkTo(p)} впервые появился в поколении ${g.gen} (${g.region}, ${g.games[0].title.replace('Pokémon ', '')}).`,
  };
}

function qEvo() {
  const P = pool().filter(p => p.ev && get(p.ev));
  const p = pick(P.length ? P : DEX.list.filter(x => x.ev)), from = get(p.ev);
  const forward = Math.random() < .5;
  const ask = forward ? from : p, ans = forward ? p : from;
  const decoys = sample(DEX.list.filter(x => x.id !== ans.id && x.ch !== p.ch && x.t.some(t => ans.t.includes(t))), 3, [], x => x.id);
  return {
    key: p.id,
    html: `<div class="q-text">${forward ? `В кого эволюционирует ${esc(ask.n)}?` : `Из кого эволюционирует ${esc(ask.n)}?`}</div>${monImg(ask)}`,
    options: shuffle([ans, ...decoys]).map(x => ({ label: `<img src="${sprite(x.id)}" alt="" width="48" height="48" style="margin:-8px 0" onerror="this.remove()"> ${esc(x.n)}`, ok: x === ans })),
    explain: `${linkTo(from)} → ${linkTo(p)}`,
  };
}

function qStats() {
  const P = pool();
  const si = pick([0, 1, 2, 3, 4, 5, 6]); // 6 = сумма
  const val = p => si === 6 ? p.bst : p.s[si];
  let a, b; do { a = pick(P); b = pick(P); } while (a.id === b.id || val(a) === val(b));
  const label = si === 6 ? 'сумма базовых статов' : si === 0 ? 'HP' : STAT_NAMES[si].toLowerCase();
  return {
    key: a.id + '-' + b.id,
    html: `<div class="q-text">У кого выше: <u>${label}</u>?</div>`,
    custom(box, done) {
      box.innerHTML = `<div class="vs">
        <button class="side" data-k="0"><img src="${art(a.id)}" alt=""><div><b>${esc(a.n)}</b></div><div class="val" style="visibility:hidden">${val(a)}</div></button>
        <div class="mid">VS</div>
        <button class="side" data-k="1"><img src="${art(b.id)}" alt=""><div><b>${esc(b.n)}</b></div><div class="val" style="visibility:hidden">${val(b)}</div></button></div>`;
      box.addEventListener('click', e => {
        const s = e.target.closest('.side'); if (!s || box.dataset.done) return; box.dataset.done = 1;
        const winner = val(a) > val(b) ? 0 : 1;
        const sides = $$('.side', box);
        sides.forEach((x, k) => { x.disabled = true; $('.val', x).style.visibility = ''; if (k === winner) x.classList.add('correct'); });
        if (+s.dataset.k !== winner) s.classList.add('wrong');
        done(+s.dataset.k === winner, `${esc(a.n)}: ${val(a)} · ${esc(b.n)}: ${val(b)}`);
      });
    },
  };
}

function qTrainer() {
  const T = TRAINERS.filter(t => !cfg.regions.size || cfg.regions.has(t.region));
  const list = T.length >= 4 ? T : TRAINERS;
  const specialists = list.filter(t => t.spec);
  const gymLeaders = list.filter(t => t.role === 'gym');
  const kinds = ['who', 'region', 'role'];
  if (specialists.length) kinds.push('type', 'type');
  if (gymLeaders.length) kinds.push('city');
  if (list.some(t => t.ace)) kinds.push('ace');
  const kind = pick(kinds);
  const names = (t, others) => shuffle([t, ...sample(others, 3, [t], x => x.ru)]).map(x => ({ label: `${esc(x.ru)} <span class="muted small">(${esc(x.name)})</span>`, ok: x.ru === t.ru }));
  const pic = t => `<div class="trainer-q"><img src="${trainerSprite(t.sprite)}" alt="" onerror="this.remove()"></div>`;

  if (kind === 'type') {
    const t = pick(specialists);
    return { key: 'type' + t.name, html: `${pic(t)}<div class="q-text">На каком типе специализируется ${esc(t.ru)}?</div><p class="muted">${ROLE_RU[t.role]} · ${t.region}</p>`,
      options: shuffle([t.type, ...sample(TYPES, 3, [t.type])]).map(x => ({ label: typeBadge(x), ok: x === t.type })),
      explain: `${esc(t.ru)} — ${typeBadge(t.type)}. ${esc(t.note)}` };
  }
  if (kind === 'city') {
    const t = pick(gymLeaders);
    return { key: 'city' + t.name, html: `<div class="q-text">Кто лидер стадиона в ${esc(t.city)} (${t.region})?</div><p class="muted">Подсказка: тип ${typeBadge(t.type)}</p>`,
      options: names(t, TRAINERS.filter(x => x.city !== t.city)), stack: true, explain: `${esc(t.ru)}. Игры: ${esc(t.games)}` };
  }
  if (kind === 'ace') {
    const t = pick(list.filter(x => x.ace)), p = get(t.ace);
    return { key: 'ace' + t.name, html: `<div class="q-text">Чей это фирменный покемон?</div>${monImg(p)}<p class="muted">${esc(p.n)}</p>`,
      options: names(t, TRAINERS.filter(x => x.ace !== t.ace)), stack: true, explain: `${esc(p.n)} — ас тренера ${esc(t.ru)} (${ROLE_RU[t.role]}, ${t.region}).` };
  }
  if (kind === 'region') {
    const t = pick(list);
    const regs = shuffle([t.region, ...sample(REGIONS_ORDER, 3, [t.region])]);
    return { key: 'reg' + t.name, html: `${pic(t)}<div class="q-text">Из какого региона ${esc(t.ru)}?</div><p class="muted">${ROLE_RU[t.role]}</p>`,
      options: regs.map(r => ({ label: r, ok: r === t.region })), explain: `${esc(t.ru)} — ${t.region}. Игры: ${esc(t.games)}` };
  }
  if (kind === 'role') {
    const t = pick(list);
    const roles = shuffle([t.role, ...sample(Object.keys(ROLE_RU), 3, [t.role])]);
    return { key: 'role' + t.name, html: `${pic(t)}<div class="q-text">Кто такой(ая) ${esc(t.ru)} (${t.region})?</div>`,
      options: roles.map(r => ({ label: ROLE_RU[r], ok: r === t.role })), explain: esc(t.note || `${ROLE_RU[t.role]}, ${t.games}`) };
  }
  const t = pick(list);
  const hint = [ROLE_RU[t.role], t.region, t.spec ? typeBadge(t.type) : '', t.city ? esc(t.city) : ''].filter(Boolean).join(' · ');
  return { key: 'who' + t.name, html: `${pic(t)}<div class="q-text">Кто этот тренер?</div><p>${hint}</p><p class="muted small">${esc(t.games)}</p>`,
    options: names(t, TRAINERS), stack: true, explain: esc(t.note) };
}

function qGames() {
  const kind = pick(['region', 'region', 'year', 'starters', 'mascot', 'gen', 'feature']);
  const gm = pick(ALL_GAMES);
  const strip = s => esc(s.replace('Pokémon ', ''));
  if (kind === 'region') {
    const g = GENERATIONS[gm.gen - 1];
    return { key: 'r' + gm.title, html: `<div class="q-text">В каком регионе происходит ${strip(gm.title)}?</div>`,
      options: shuffle([g, ...sample(GENERATIONS, 3, [g], x => x.gen)]).map(x => ({ label: x.region, ok: x === g })),
      explain: `${strip(gm.title)} (${gm.year}) — ${g.region}, поколение ${g.gen}.` };
  }
  if (kind === 'year') {
    const years = shuffle([gm.year, ...sample([...new Set(ALL_GAMES.map(x => x.year))], 3, [gm.year])]);
    return { key: 'y' + gm.title, html: `<div class="q-text">В каком году вышла ${strip(gm.title)}?</div>`,
      options: years.sort().map(y => ({ label: String(y), ok: y === gm.year })), explain: `${gm.year}, ${esc(gm.platform)}` };
  }
  if (kind === 'starters') {
    const g = pick(GENERATIONS);
    return { key: 's' + g.gen, html: `<div class="q-text">Чьи это стартовые покемоны?</div><div class="evo" style="justify-content:center">${g.starters.map(id => img(id, '', '')).join('')}</div>`,
      options: shuffle([g, ...sample(GENERATIONS, 3, [g], x => x.gen)]).map(x => ({ label: `${x.region} (${x.gen} пок.)`, ok: x === g })),
      explain: g.starters.map(id => esc(get(id).n)).join(', ') };
  }
  if (kind === 'mascot') {
    const p = get(gm.mascot[0]);
    const others = sample(ALL_GAMES.filter(x => !x.mascot.includes(p.id)), 3, [], x => x.title);
    return { key: 'm' + gm.title, html: `<div class="q-text">Талисман какой игры этот покемон?</div>${monImg(p)}<p class="muted">${esc(p.n)}</p>`,
      options: shuffle([gm, ...others]).map(x => ({ label: strip(x.title), ok: x === gm })), stack: true,
      explain: `${esc(p.n)} — ключевой покемон ${strip(gm.title)}.` };
  }
  if (kind === 'feature') {
    const g = pick(GENERATIONS), f = pick(g.features);
    return { key: 'f' + f, html: `<div class="q-text">В каком поколении появилось: «${esc(f)}»?</div>`,
      options: shuffle([g, ...sample(GENERATIONS, 3, [g], x => x.gen)]).map(x => ({ label: `${x.gen} · ${x.region}`, ok: x === g })),
      explain: `Поколение ${g.gen}: ${g.games.map(x => strip(x.title)).join(', ')}` };
  }
  return { key: 'g' + gm.title, html: `<div class="q-text">К какому поколению относится ${strip(gm.title)}?</div>`,
    options: [gm.gen, ...sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 3, [gm.gen])].sort((a, b) => a - b)
      .map(n => ({ label: `Поколение ${n}`, ok: n === gm.gen })),
    explain: `${strip(gm.title)} — поколение ${gm.gen} (${gm.region}).` };
}
