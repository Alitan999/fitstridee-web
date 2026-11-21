/* FitStridee web v1 — lógica 100% local, sin servidor, sin cuentas, gratis.
   Datos: window.FIT_EXERCISES (1324) + window.FIT_CURATED (200) desde data/data.js
   (fuente: hasaneyldrm/exercises-dataset; GIFs © Gym visual, bajo demanda). */
'use strict';

/* ---------------- Datos ---------------- */
const EXERCISES = window.FIT_EXERCISES || [];
const CURATED = window.FIT_CURATED || [];
const byId = {};
EXERCISES.forEach(e => { byId[e.id] = e; });
const curatedMap = {};
CURATED.forEach(c => { curatedMap[c.id] = c; });
const GIF_BASE = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/';
const IMG_BASE = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/';
const gifUrl = ex => GIF_BASE + ex.gif;
const imgUrl = ex => IMG_BASE + ex.gif.replace(/\.gif$/i, '.jpg');
const displayName = ex => ex.name_es || ex.name;

/* ---------------- Etiquetas en español ---------------- */
const BODY_ES = { 'chest': 'Pecho', 'back': 'Espalda', 'upper legs': 'Piernas', 'shoulders': 'Hombros', 'upper arms': 'Brazos', 'waist': 'Core', 'lower legs': 'Pantorrillas', 'lower arms': 'Antebrazos', 'cardio': 'Cardio', 'neck': 'Cuello' };
const EQUIP_ES = { 'body weight': 'Peso corporal', 'dumbbell': 'Mancuerna', 'barbell': 'Barra', 'cable': 'Polea', 'leverage machine': 'Máquina', 'band': 'Banda', 'smith machine': 'Smith', 'kettlebell': 'Kettlebell', 'weighted': 'Con peso', 'stability ball': 'Pelota', 'ez barbell': 'Barra EZ', 'assisted': 'Asistido', 'sled machine': 'Trineo', 'medicine ball': 'Balón medicinal', 'rope': 'Cuerda', 'roller': 'Rodillo', 'resistance band': 'Banda', 'bosu ball': 'BOSU', 'olympic barbell': 'Barra olímpica', 'wheel roller': 'Rueda', 'upper body ergometer': 'Ergómetro', 'skierg machine': 'SkiErg', 'hammer': 'Martillo', 'stationary bike': 'Bici estática', 'tire': 'Llanta', 'trap bar': 'Barra hexagonal', 'elliptical machine': 'Elíptica', 'stepmill machine': 'Escaladora' };
const TARGET_ES = { 'abs': 'Abdomen', 'pectorals': 'Pecho', 'biceps': 'Bíceps', 'glutes': 'Glúteos', 'delts': 'Hombros', 'triceps': 'Tríceps', 'upper back': 'Espalda alta', 'lats': 'Dorsales', 'calves': 'Pantorrillas', 'quads': 'Cuádriceps', 'forearms': 'Antebrazos', 'cardiovascular system': 'Cardio', 'hamstrings': 'Isquiotibiales', 'spine': 'Espalda baja', 'traps': 'Trapecios', 'adductors': 'Aductores', 'serratus anterior': 'Serrato', 'abductors': 'Abductores', 'levator scapulae': 'Elevador de la escápula' };
const bodyEs = v => BODY_ES[v] || v;
const equipEs = v => EQUIP_ES[v] || v;
const targetEs = v => TARGET_ES[v] || v;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------- Estado local (localStorage) ---------------- */
const LS = {
  get(k, d) { try { const v = localStorage.getItem('fitstridee_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('fitstridee_' + k, JSON.stringify(v)); } catch (e) { /* almacenamiento lleno o bloqueado */ } }
};
let mode = LS.get('mode', 'casa');
let sessions = LS.get('sessions', []);
let weights = LS.get('weights', []);
if (!weights.length) { weights = [{ date: '2026-11-10', weight: 85.0 }]; LS.set('weights', weights); }
let measures = LS.get('measures', null);

/* ---------------- Modos ---------------- */
const MODES = {
  gym: {
    name: 'Gym', icon: '🏋️', tag: 'GYM',
    desc: 'Todo el gimnasio: barra, polea, máquinas y mancuernas. Para cuando vas al gym y quieres aprovecharlo entero.',
    equip: ['barbell', 'cable', 'leverage machine', 'smith machine', 'dumbbell', 'body weight', 'ez barbell', 'kettlebell'],
    note: 'Prioriza barra y polea en los compuestos; las mancuernas quedan para el trabajo de detalle.'
  },
  casa: {
    name: 'Casa', icon: '🏠', tag: 'EN CASA',
    desc: 'Peso corporal + tus 2 mancuernas de 7 kg. Sin máquinas, sin salir: la rutina mixta de Alan y cuerpo completo A/B/C.',
    equip: ['body weight', 'dumbbell'],
    note: 'Todo se puede hacer en casa. Si un ejercicio pide barra, aquí ya viene su versión con mancuerna o peso corporal.'
  },
  calistenia: {
    name: 'Calistenia', icon: '🤸', tag: 'CALISTENIA',
    desc: 'Solo peso corporal: dominadas, flexiones, fondos, sentadillas a una pierna. Fuerza con tu propio cuerpo y progresiones claras.',
    equip: ['body weight'],
    note: 'Sin material. Cada ejercicio tiene su progresión: empieza por la versión fácil y sube cuando completes todas las series.'
  }
};

/* Progresiones de calistenia: de fácil a difícil, por movimiento base */
const PROGRESSIONS = [
  { base: 'Flexiones', levels: ['Flexiones en pared', 'Flexiones de rodillas', 'Flexiones', 'Flexiones declinadas', 'Flexiones arquero', 'Flexiones a un brazo'] },
  { base: 'Dominadas', levels: ['Dominada escapular', 'Dominadas con agarre neutro', 'Dominadas', 'Dominadas con agarre amplio', 'Dominadas supinas'] },
  { base: 'Sentadilla', levels: ['Sentadilla asistida', 'Sentadillas búlgaras con peso corporal', 'Sentadilla sissy', 'Sentadilla a una pierna'] },
  { base: 'Fondos', levels: ['Fondos en banco con rodillas flexionadas', 'Fondos entre bancos', 'Fondos de pecho', 'Fondos de tríceps'] },
  { base: 'Plancha / core', levels: ['Plancha de rodillas con toque de hombro', 'Plancha frontal con giro', 'Plancha lateral inclinada', 'Elevación de piernas colgado'] }
];

/* ---------------- Rutinas por reglas ---------------- */
const ALAN_IDS = ['0662', '0813', '0410', '0464', '1760', '0292', '0405', '0336', '0294'];
const GYM_EQUIP_FIRST = ['barbell', 'cable', 'leverage machine', 'smith machine', 'ez barbell'];

function curatedPool(m) {
  const items = CURATED.map(c => byId[c.id]).filter(Boolean);
  if (m === 'gym') return items.slice().sort((a, b) => {
    const pa = GYM_EQUIP_FIRST.includes(a.equipment) ? 0 : 1;
    const pb = GYM_EQUIP_FIRST.includes(b.equipment) ? 0 : 1;
    return pa - pb || (a.id < b.id ? -1 : 1);
  });
  if (m === 'casa') return items.filter(e => e.equipment === 'body weight' || e.equipment === 'dumbbell');
  return items.filter(e => e.equipment === 'body weight'); // calistenia
}
function itemOf(ex) {
  const c = curatedMap[ex.id];
  return { id: ex.id, sets: (c && c.sets) || 3, reps: (c && c.reps) || '10-12', rest: (c && c.rest_seconds) || 60 };
}
function pick(pool, parts, count, exclude) {
  const ex = exclude || new Set();
  return pool.filter(e => parts.includes(e.body_part) && !ex.has(e.id)).slice(0, count);
}
function routine(id, title, subtitle, tag, list, durationMin, kcal) {
  return { id, title, subtitle, tag, durationMin: durationMin || 50, kcal: kcal || 340, level: 'Principiante', exercises: list.map(itemOf) };
}

function buildRoutines(m) {
  const pool = curatedPool(m);
  const a = pick(pool, ['chest', 'back', 'upper legs'], 6);
  const b = pick(pool, ['shoulders', 'upper arms', 'waist'], 6);
  const c = pick(pool, ['upper legs', 'chest', 'waist'], 6, new Set(a.map(e => e.id)));
  const push = pick(pool, ['chest', 'shoulders', 'upper arms'], 6).filter(e => ['pectorals', 'delts', 'triceps'].includes(e.target));
  const pull = pick(pool, ['back', 'upper arms'], 6).filter(e => ['lats', 'upper back', 'biceps', 'traps'].includes(e.target));
  const legs = pick(pool, ['upper legs', 'lower legs'], 6);
  const core = pick(pool, ['waist'], 6);
  const list = [];
  if (m === 'casa') {
    list.push(routine('casa-mixta', 'Casa mixta', 'Calistenia + mancuernas · la rutina de Alan', 'EN CASA',
      ALAN_IDS.map(id => byId[id]).filter(Boolean), 45, 320));
  }
  list.push(
    routine(m + '-a', 'Cuerpo completo A', 'Pecho · espalda · piernas', 'CUERPO COMPLETO', a, 50, 340),
    routine(m + '-b', 'Cuerpo completo B', 'Hombros · brazos · core', 'CUERPO COMPLETO', b, 50, 340),
    routine(m + '-c', 'Cuerpo completo C', 'Piernas · pecho · core', 'CUERPO COMPLETO', c, 50, 340),
    routine(m + '-empuje', 'Empuje', 'Pecho · hombros · tríceps', 'PUSH', push.length ? push : pick(pool, ['chest', 'shoulders'], 6), 45, 300),
    routine(m + '-jalon', 'Jalón', 'Espalda · bíceps', 'PULL', pull.length ? pull : pick(pool, ['back'], 6), 45, 300),
    routine(m + '-pierna', 'Pierna', 'Cuádriceps · glúteos · pantorrillas', 'LEGS', legs, 45, 320)
  );
  if (m === 'calistenia') {
    list.push(routine('calistenia-core', 'Circuito core', 'Abdomen · oblicuos · planchas', 'CORE', core, 20, 150));
  }
  return list.filter(r => r.exercises.length >= 4);
}
function allRoutines() {
  const out = {};
  ['gym', 'casa', 'calistenia'].forEach(m => { buildRoutines(m).forEach(r => { out[r.id] = Object.assign({ mode: m }, r); }); });
  return out;
}
const ROUTINES = allRoutines();
function findRoutine(id) { return ROUTINES[id] || null; }

/* Generador de semana por reglas: días × modo × nivel */
function buildPlan(m, days, level) {
  const rs = buildRoutines(m);
  const byTitle = {};
  rs.forEach(r => { byTitle[r.title] = r; });
  const seq = days <= 2 ? ['Cuerpo completo A', 'Cuerpo completo B']
    : days === 3 ? ['Cuerpo completo A', 'Cuerpo completo B', 'Cuerpo completo C']
    : days === 4 ? ['Empuje', 'Jalón', 'Pierna', 'Cuerpo completo A']
    : ['Empuje', 'Jalón', 'Pierna', 'Cuerpo completo A', 'Cuerpo completo B'];
  const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const setsByLevel = { 'Principiante': 3, 'Intermedio': 4, 'Avanzado': 4 };
  const restByLevel = { 'Principiante': 60, 'Intermedio': 75, 'Avanzado': 90 };
  const plan = [];
  seq.forEach((title, i) => {
    const base = byTitle[title];
    if (!base) return;
    // Reparte los días en la semana; con split empuje/jalón/pierna no se repite
    // el mismo músculo en días seguidos, así que se respeta el descanso de 48 h.
    const day = dayNames[Math.min(6, Math.floor(i * 7 / seq.length))];
    plan.push({
      day, routineId: base.id, title: base.title, subtitle: base.subtitle,
      exercises: base.exercises.map(e => ({ id: e.id, sets: setsByLevel[level] || 3, reps: e.reps, rest: restByLevel[level] || 60 }))
    });
  });
  return { mode: m, days, level, plan };
}

/* ---------------- Navegación ---------------- */
let currentView = 'home';
let lastView = 'home';
function go(view) {
  if (view !== currentView && currentView !== 'session') lastView = currentView;
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById('view-' + view);
  if (el) el.classList.add('active');
  document.querySelectorAll('nav.bottom button').forEach(b => b.classList.toggle('on', b.dataset.nav === view));
  window.scrollTo({ top: 0 });
  if (view === 'home') renderHome();
  if (view === 'train') renderTrain();
  if (view === 'explore') renderExplore();
  if (view === 'measure') renderMeasure();
}
function goBack() { go(lastView === 'detail' || lastView === 'session' ? 'explore' : lastView); }
function openGenerator() { go('generator'); renderGenerator(); }

/* ---------------- Toast ---------------- */
let toastTimer = null;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------------- Inicio ---------------- */
function weekStats() {
  const now = new Date();
  const start = new Date(now); start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0);
  const recent = sessions.filter(s => new Date(s.date) >= start);
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const n = sessions.filter(s => (s.date || '').slice(0, 10) === key).length;
    days.push({ label: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][d.getDay()], n });
  }
  let streak = 0;
  const daySet = new Set(sessions.map(s => (s.date || '').slice(0, 10)));
  const d = new Date(now);
  if (!daySet.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  while (daySet.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1); }
  return { recent: recent.length, days, streak };
}
function progressionTip() {
  if (!sessions.length) return 'Aún no hay sesiones registradas. Completa tu primera rutina y aquí te diré qué subir: primero reps, luego peso.';
  const last = sessions[sessions.length - 1];
  const done = (last.exercises || []).filter(e => (e.setsDone || 0) >= e.sets).length;
  const total = (last.exercises || []).length || 1;
  if (done === total) return 'La última sesión la completaste entera (' + esc(last.routineTitle || 'rutina') + '). Próxima vez: sube 1-2 reps en cada ejercicio; cuando llegues al tope del rango, sube peso.';
  return 'En tu última sesión completaste ' + done + ' de ' + total + ' ejercicios. Repite la misma rutina hasta completarla entera y luego sube reps.';
}
function renderHome() {
  const st = weekStats();
  document.getElementById('stat-sessions').textContent = sessions.length;
  document.getElementById('stat-streak').textContent = st.streak;
  const w = weights[weights.length - 1];
  document.getElementById('stat-weight').textContent = w ? w.weight.toFixed(1) : '—';
  const md = MODES[mode];
  document.getElementById('home-mode-card').innerHTML =
    '<div class="spread"><div><span class="tag">' + md.tag + '</span><h3 class="mt">' + md.icon + ' ' + md.name + '</h3>' +
    '<p class="muted small mt">' + esc(md.desc) + '</p></div></div>';
  const rs = buildRoutines(mode);
  const next = rs[0];
  document.getElementById('home-next').innerHTML = next ? routineCard(next, true) : '<p class="muted">Sin rutinas.</p>';
  const max = Math.max(1, ...st.days.map(d => d.n));
  document.getElementById('week-bars').innerHTML = st.days.map(d =>
    '<div class="bar-col"><b>' + d.n + '</b><i class="' + (d.n ? 'hot' : '') + '" style="height:' + Math.max(4, d.n / max * 72) + 'px"></i><span>' + d.label + '</span></div>').join('');
  document.getElementById('week-note').textContent = st.recent
    ? st.recent + (st.recent === 1 ? ' sesión ' : ' sesiones ') + 'esta semana. Las estadísticas son tuyas: aquí nunca van detrás de un pago.'
    : 'Sin sesiones esta semana todavía. Empieza con la rutina de hoy: son 45 minutos.';
  document.getElementById('home-progression').innerHTML = '<h3>📈 Qué toca subir</h3><p class="muted small mt">' + esc(progressionTip()) + '</p>';
  renderHomeCalories();
  renderHomeHeat();
}
function kcalOfSession(s) {
  const r = findRoutine(s.routineId);
  const base = r ? r.kcal : 300;
  const frac = s.setsTotal ? (s.setsDone / s.setsTotal) : 1;
  return Math.round(base * frac);
}
function renderHomeCalories() {
  const el = document.getElementById('home-calories');
  if (!el) return;
  const now = new Date();
  const days = [];
  let total = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const kcal = sessions.filter(s => (s.date || '').slice(0, 10) === key).reduce((n, s) => n + kcalOfSession(s), 0);
    total += kcal;
    days.push({ label: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][d.getDay()], kcal });
  }
  const max = Math.max(1, ...days.map(d => d.kcal));
  const trainedDays = days.filter(d => d.kcal).length;
  el.innerHTML = '<div class="spread"><h3>Calorías quemadas por semana</h3><span class="tag">Sin candado</span></div>' +
    '<div class="bars" style="margin-top:10px;">' + days.map(d =>
      '<div class="bar-col"><b>' + (d.kcal || '—') + '</b><i class="' + (d.kcal ? 'hot' : '') + '" style="height:' + Math.max(4, d.kcal / max * 72) + 'px"></i><span>' + d.label + '</span></div>').join('') + '</div>' +
    '<p class="small muted mt">Total esta semana: <b style="color:#fff;">' + total.toLocaleString('es-MX') + ' kcal</b>' +
    (trainedDays ? ' · promedio ' + Math.round(total / trainedDays) + ' kcal por sesión' : ' · sin sesiones todavía') + '</p>';
}
function renderHomeHeat() {
  const el = document.getElementById('home-heat');
  if (!el) return;
  const daySet = new Set(sessions.map(s => (s.date || '').slice(0, 10)));
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  let cells = '', trained = 0;
  for (let r = 3; r >= 0; r--) {
    for (let c = 0; c < 7; c++) {
      const d = new Date(now); d.setDate(now.getDate() - (r * 7 + (6 - c)));
      const key = d.toISOString().slice(0, 10);
      const done = daySet.has(key);
      if (done) trained++;
      cells += '<i class="' + (done ? 'done' : '') + (key === todayKey ? ' today' : '') + '"></i>';
    }
  }
  const st = weekStats();
  el.innerHTML = '<h3>Mapa de calor</h3><p class="small muted" style="margin-top:4px;">Últimas 4 semanas · blanco = entrenaste</p>' +
    '<div class="heatgrid">' + cells + '</div>' +
    '<p class="small muted mt">' + trained + ' sesiones en 28 días · racha actual: <b style="color:#fff;">' + st.streak + ' días</b></p>' +
    '<p class="small dim" style="margin-top:4px;">En FitStridee las estadísticas no van detrás de un pago. Todo visible, siempre.</p>';
}

/* ---------------- Entrenar ---------------- */
function renderTrain() {
  const grid = document.getElementById('mode-grid');
  grid.innerHTML = Object.keys(MODES).map(k => {
    const m = MODES[k];
    const n = buildRoutines(k).length;
    return '<button class="mode-card' + (mode === k ? ' selected' : '') + '" onclick="setMode(\'' + k + '\')">' +
      '<span class="ico">' + m.icon + '</span>' +
      '<span><h3>' + m.name + '</h3><p>' + esc(m.desc) + '</p><p class="small" style="margin-top:4px;"><b class="volt">' + n + ' rutinas</b> · ' + esc(m.equip.map(equipEs).join(' · ')) + '</p></span>' +
      '<span class="check">✓</span></button>';
  }).join('');
  const md = MODES[mode];
  document.getElementById('train-mode-name').textContent = md.name.toLowerCase();
  document.getElementById('mode-info').innerHTML =
    '<div class="card"><p class="small muted">' + esc(md.note) + '</p>' +
    (mode === 'calistenia' ? '<h3 class="mt">Progresiones</h3>' + PROGRESSIONS.map(p =>
      '<p class="small mt"><b>' + esc(p.base) + ':</b> <span class="muted">' + p.levels.map(esc).join(' → ') + '</span></p>').join('') : '') +
    '</div>';
  document.getElementById('routine-list').innerHTML = buildRoutines(mode).map(r => routineCard(r)).join('');
}
function setMode(m) {
  mode = m; LS.set('mode', m);
  renderTrain(); renderHome();
  toast('Modo ' + MODES[m].name + ' activado');
}
function routineCard(r, showStart) {
  const thumbs = r.exercises.slice(0, 6).map(e => {
    const ex = byId[e.id]; if (!ex) return '';
    return '<img src="' + imgUrl(ex) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">';
  }).join('');
  return '<button class="routine" onclick="openRoutine(\'' + r.id + '\')">' +
    '<div class="spread"><h3>' + esc(r.title) + '</h3><span class="tag">' + esc(r.tag) + '</span></div>' +
    '<p class="muted small" style="margin-top:4px;">' + esc(r.subtitle) + '</p>' +
    '<div class="meta"><span>⏱ <b>' + r.durationMin + ' min</b></span><span>🔥 <b>' + r.kcal + ' kcal</b></span>' +
    '<span>💪 <b>' + r.exercises.length + ' ejercicios</b></span><span>' + esc(r.level) + '</span></div>' +
    '<div class="thumb-strip">' + thumbs + '</div>' +
    '<p class="small volt" style="margin-top:10px;font-weight:700;">' + (showStart ? 'Empezar esta rutina →' : 'Ver ejercicios y empezar →') + '</p>' +
    '</button>';
}

/* ---------------- Mapa corporal (dibujo propio, esquemático) ---------------- */
const _BM_FILL = (key, worked, secondary) => worked.has(key) ? '#FFFFFF' : (secondary.has(key) ? '#6E6E73' : '#2C2C2E');
function bodyFigure(back, worked, secondary) {
  const base = '<circle cx="100" cy="24" r="17" fill="#2C2C2E" stroke="#55565A" stroke-width="2"/>' +
    '<rect x="92" y="40" width="16" height="16" rx="4" fill="#2C2C2E" stroke="#55565A" stroke-width="2"/>' +
    '<path d="M64 58 L136 58 L131 152 Q129 170 100 170 Q71 170 69 152 Z" fill="#2C2C2E" stroke="#55565A" stroke-width="2"/>' +
    '<rect x="44" y="60" width="18" height="100" rx="9" fill="#2C2C2E" stroke="#55565A" stroke-width="2"/>' +
    '<rect x="138" y="60" width="18" height="100" rx="9" fill="#2C2C2E" stroke="#55565A" stroke-width="2"/>' +
    '<rect x="76" y="170" width="20" height="132" rx="10" fill="#2C2C2E" stroke="#55565A" stroke-width="2"/>' +
    '<rect x="104" y="170" width="20" height="132" rx="10" fill="#2C2C2E" stroke="#55565A" stroke-width="2"/>' +
    '<circle cx="86" cy="352" r="9" fill="#2C2C2E" stroke="#55565A" stroke-width="2"/>' +
    '<circle cx="114" cy="352" r="9" fill="#2C2C2E" stroke="#55565A" stroke-width="2"/>';
  const parts = !back ? [
    ['delts', '<circle cx="60" cy="66" r="15" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['delts', '<circle cx="140" cy="66" r="15" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['pecs', '<rect x="72" y="72" width="26" height="34" rx="10" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['pecs', '<rect x="102" y="72" width="26" height="34" rx="10" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['biceps', '<rect x="44" y="86" width="15" height="36" rx="7" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['biceps', '<rect x="141" y="86" width="15" height="36" rx="7" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['abs', '<rect x="84" y="108" width="14" height="14" rx="4" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['abs', '<rect x="102" y="108" width="14" height="14" rx="4" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['abs', '<rect x="84" y="126" width="14" height="14" rx="4" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['abs', '<rect x="102" y="126" width="14" height="14" rx="4" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['abs', '<rect x="84" y="144" width="14" height="14" rx="4" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['abs', '<rect x="102" y="144" width="14" height="14" rx="4" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['forearms', '<rect x="44" y="128" width="15" height="28" rx="7" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['forearms', '<rect x="141" y="128" width="15" height="28" rx="7" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['quads', '<rect x="76" y="180" width="20" height="58" rx="10" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['quads', '<rect x="104" y="180" width="20" height="58" rx="10" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['calves', '<rect x="78" y="300" width="16" height="44" rx="8" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['calves', '<rect x="106" y="300" width="16" height="44" rx="8" fill="__F__" stroke="#55565A" stroke-width="2"/>']
  ] : [
    ['traps', '<polygon points="78,58 122,58 108,94 92,94" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['lats', '<rect x="70" y="92" width="28" height="60" rx="10" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['lats', '<rect x="102" y="92" width="28" height="60" rx="10" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['triceps', '<rect x="44" y="86" width="15" height="36" rx="7" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['triceps', '<rect x="141" y="86" width="15" height="36" rx="7" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['glutes', '<rect x="76" y="152" width="22" height="30" rx="10" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['glutes', '<rect x="102" y="152" width="22" height="30" rx="10" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['hams', '<rect x="76" y="188" width="20" height="52" rx="10" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['hams', '<rect x="104" y="188" width="20" height="52" rx="10" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['calves', '<rect x="78" y="300" width="16" height="44" rx="8" fill="__F__" stroke="#55565A" stroke-width="2"/>'],
    ['calves', '<rect x="106" y="300" width="16" height="44" rx="8" fill="__F__" stroke="#55565A" stroke-width="2"/>']
  ];
  const muscles = parts.map(([k, el]) => el.replace('__F__', _BM_FILL(k, worked, secondary))).join('');
  return '<svg viewBox="0 0 200 368" fill="none" role="img" aria-label="' + (back ? 'Espalda' : 'Frente') + '">' + base + muscles + '</svg>';
}
const TARGET_MUSCLE = {
  pectorals: ['pecs', 'front'], delts: ['delts', 'front'], biceps: ['biceps', 'front'],
  triceps: ['triceps', 'back'], abs: ['abs', 'front'], quads: ['quads', 'front'],
  glutes: ['glutes', 'back'], hamstrings: ['hams', 'back'], lats: ['lats', 'back'],
  'upper back': ['lats', 'back'], traps: ['traps', 'back'], calves: ['calves', 'both'],
  forearms: ['forearms', 'front'], adductors: ['quads', 'front'], abductors: ['quads', 'front'],
  spine: ['lats', 'back'], 'serratus anterior': ['abs', 'front'], 'levator scapulae': ['traps', 'back']
};
function musclesForRoutine(r) {
  const front = new Set(), back = new Set(), frontSec = new Set(), backSec = new Set();
  r.exercises.forEach(e => {
    const ex = byId[e.id]; if (!ex) return;
    const m = TARGET_MUSCLE[ex.target];
    if (m) { if (m[1] === 'front' || m[1] === 'both') front.add(m[0]); if (m[1] === 'back' || m[1] === 'both') back.add(m[0]); }
    (ex.secondary_muscles || []).forEach(t => {
      const s = TARGET_MUSCLE[t];
      if (s) { if (s[1] === 'front' || s[1] === 'both') frontSec.add(s[0]); if (s[1] === 'back' || s[1] === 'both') backSec.add(s[0]); }
    });
  });
  return { front, back, frontSec, backSec };
}
function fmtDuration(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
function intensityOf(r) { return r.kcal >= 330 ? 'alta' : (r.kcal >= 250 ? 'moderada' : 'suave'); }

/* ---------------- Detalle de rutina (layout referencia) ---------------- */
function routineTabs(m) {
  const rs = buildRoutines(m);
  const tabs = [];
  ['A', 'B', 'C'].forEach(l => {
    const r = rs.find(x => x.title === 'Cuerpo completo ' + l);
    if (r) tabs.push({ label: 'Rutina ' + l, id: r.id });
  });
  if (m === 'casa') {
    const mix = rs.find(x => x.id === 'casa-mixta');
    if (mix) tabs.push({ label: 'Mixta', id: mix.id });
  }
  if (!tabs.length) rs.slice(0, 3).forEach((r, i) => tabs.push({ label: 'Rutina ' + 'ABC'[i], id: r.id }));
  return tabs;
}
function openRoutine(id) {
  const r = findRoutine(id);
  if (!r) { toast('Rutina no encontrada'); return; }
  lastView = currentView === 'routine' ? lastView : currentView;
  currentView = 'routine';
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-routine').classList.add('active');
  document.querySelectorAll('nav.bottom button').forEach(b => b.classList.remove('on'));
  renderRoutine(id);
  window.scrollTo({ top: 0 });
}
function renderRoutine(id) {
  const r = findRoutine(id); if (!r) return;
  const tabs = routineTabs(r.mode);
  const mus = musclesForRoutine(r);
  const equipSet = [...new Set(r.exercises.map(e => { const ex = byId[e.id]; return ex ? equipEs(ex.equipment) : ''; }).filter(Boolean))];
  const rows = r.exercises.map((e, i) => {
    const ex = byId[e.id]; if (!ex) return '';
    return '<button class="refrow" onclick="openExercise(\'' + ex.id + '\')">' +
      '<span class="accent' + (i < 3 ? ' hot' : '') + '"></span>' +
      '<img src="' + imgUrl(ex) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' +
      '<span class="nm"><b>' + esc(displayName(ex)) + '</b><span>' + equipEs(ex.equipment) + ' · Bilateral</span></span>' +
      '<span class="setpill">' + e.sets + ' x ' + esc(e.reps) + ' · ' + e.rest + '</span></button>';
  }).join('');
  document.getElementById('routine-body').innerHTML =
    '<div class="topbar2"><button class="back" onclick="go(\'train\')" aria-label="Volver">←</button><div class="prog"><i style="width:78%"></i></div></div>' +
    '<div class="rtabs">' + tabs.map(t => '<button class="' + (t.id === id ? 'on' : '') + '" onclick="renderRoutine(\'' + t.id + '\')">' + esc(t.label) + '</button>').join('') + '</div>' +
    '<div class="rhead"><div class="info">' +
      '<h2>' + esc(r.title) + '</h2>' +
      '<div class="stat-line">⏱ <span>' + fmtDuration(r.durationMin) + '</span></div>' +
      '<div class="stat-line">🔥 <span>' + r.kcal + ' kcal</span></div>' +
      '<div class="stat-line">⚡ <span>' + intensityOf(r) + '</span></div>' +
      '<div class="stat-line" style="margin-top:12px;"><span class="muted">ejercicio</span> <b>x' + r.exercises.length + '</b></div>' +
      '<div class="stat-line" style="margin-top:10px;"><span class="muted">' + esc(equipSet.join(' · ') || MODES[r.mode].name) + '</span></div>' +
    '</div><div class="bodymap">' + bodyFigure(false, mus.front, mus.frontSec) + bodyFigure(true, mus.back, mus.backSec) + '</div></div>' +
    '<div style="margin-top:8px;">' + rows + '</div>' +
    '<button class="btn block big" style="margin-top:18px;" onclick="startRoutine(\'' + r.id + '\')">Continuar</button>' +
    '<p class="small dim mt" style="text-align:center;">' + esc(MODES[r.mode].name) + ' · FitStridee · Gratis, sin paywall</p>';
}

/* ---------------- Explorar ejercicios ---------------- */
let exploreState = { q: '', muscle: '', equip: '', shown: 30 };
function filteredExercises() {
  const q = exploreState.q.trim().toLowerCase();
  let list = EXERCISES.filter(e => {
    if (exploreState.muscle && e.body_part !== exploreState.muscle) return false;
    if (exploreState.equip && e.equipment !== exploreState.equip) return false;
    if (q && !(displayName(e).toLowerCase().includes(q) || e.name.toLowerCase().includes(q) || targetEs(e.target).toLowerCase().includes(q))) return false;
    return true;
  });
  // Curados primero (tienen nombre en español y series sugeridas), luego el resto por id.
  const cur = new Set(CURATED.map(c => c.id));
  list.sort((a, b) => ((cur.has(b.id) ? 1 : 0) - (cur.has(a.id) ? 1 : 0)) || (a.id < b.id ? -1 : 1));
  return list;
}
function renderExplore() {
  const muscles = [...new Set(EXERCISES.map(e => e.body_part))].sort();
  document.getElementById('filter-muscle').innerHTML =
    '<button class="chip' + (!exploreState.muscle ? ' on' : '') + '" onclick="setFilter(\'muscle\',\'\')">Todos los músculos</button>' +
    muscles.map(m => '<button class="chip' + (exploreState.muscle === m ? ' on' : '') + '" onclick="setFilter(\'muscle\',\'' + m + '\')">' + bodyEs(m) + '</button>').join('');
  const equips = [...new Set(EXERCISES.map(e => e.equipment))].sort();
  document.getElementById('filter-equip').innerHTML =
    '<button class="chip' + (!exploreState.equip ? ' on' : '') + '" onclick="setFilter(\'equip\',\'\')">Todo el equipo</button>' +
    equips.map(m => '<button class="chip' + (exploreState.equip === m ? ' on' : '') + '" onclick="setFilter(\'equip\',\'' + m + '\')">' + equipEs(m) + '</button>').join('');
  const list = filteredExercises();
  document.getElementById('explore-count').textContent = list.length.toLocaleString('es-MX') + ' ejercicios · mostrando ' + Math.min(exploreState.shown, list.length);
  document.getElementById('exercise-list').innerHTML = list.slice(0, exploreState.shown).map(ex => {
    const c = curatedMap[ex.id];
    return '<button class="ex-row" onclick="openExercise(\'' + ex.id + '\')">' +
      '<img src="' + imgUrl(ex) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' +
      '<span><h4>' + esc(displayName(ex)) + '</h4><p>' + bodyEs(ex.body_part) + ' · ' + targetEs(ex.target) + ' · ' + equipEs(ex.equipment) + (c ? ' · ' + c.sets + '×' + c.reps : '') + '</p></span>' +
      '<span class="go">›</span></button>';
  }).join('') || '<div class="empty"><div class="big">🔎</div><p>Nada por aquí. Prueba con otra palabra o quita un filtro.</p></div>';
  document.getElementById('load-more').style.display = list.length > exploreState.shown ? '' : 'none';
}
function setFilter(kind, val) {
  exploreState[kind] = val; exploreState.shown = 30; renderExplore();
}
function loadMore() { exploreState.shown += 30; renderExplore(); }

/* ---------------- Detalle de ejercicio ---------------- */
function openExercise(id) {
  lastView = currentView === 'detail' ? lastView : currentView;
  currentView = 'detail';
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-detail').classList.add('active');
  document.querySelectorAll('nav.bottom button').forEach(b => b.classList.remove('on'));
  const ex = byId[id]; if (!ex) return;
  const c = curatedMap[id];
  const alts = EXERCISES.filter(e => e.target === ex.target && e.id !== id && (mode === 'gym' || MODES[mode].equip.includes(e.equipment))).slice(0, 4);
  document.getElementById('detail-body').innerHTML =
    '<span class="tag">' + bodyEs(ex.body_part) + ' · ' + targetEs(ex.target) + '</span>' +
    '<h1 class="display" style="font-size:34px;">' + esc(displayName(ex)) + '</h1>' +
    '<p class="lead">' + esc(ex.name) + ' · ' + equipEs(ex.equipment) + (ex.muscle_group ? ' · ' + esc(ex.muscle_group) : '') + '</p>' +
    '<div class="gif-wrap"><img src="' + gifUrl(ex) + '" alt="Demostración de ' + esc(displayName(ex)) + '" loading="lazy" onerror="this.parentNode.innerHTML=\'<p class=&quot;empty&quot;>GIF no disponible sin internet. La explicación en texto sigue aquí abajo.</p>\'"></div>' +
    '<p class="small dim">GIF: © Gym visual — <a href="https://gymvisual.com/" target="_blank" rel="noopener">gymvisual.com</a></p>' +
    (c ? '<table class="set-table"><tr><th>Series</th><th>Reps</th><th>Descanso</th></tr><tr><td><b>' + c.sets + '</b></td><td><b>' + esc(c.reps) + '</b></td><td><b>' + c.rest_seconds + ' s</b></td></tr></table>' : '') +
    '<h2 class="sec">Cómo se hace</h2>' +
    '<ol class="steps">' + (ex.steps_es || []).map(s => '<li>' + esc(s) + '</li>').join('') + '</ol>' +
    (ex.secondary_muscles && ex.secondary_muscles.length ? '<p class="small muted">También trabajan: ' + ex.secondary_muscles.map(targetEs).join(', ') + '.</p>' : '') +
    '<h2 class="sec">Si no te sale, cambia a</h2>' +
    (alts.length ? alts.map(a => '<button class="ex-row" onclick="openExercise(\'' + a.id + '\')"><img src="' + imgUrl(a) + '" alt="" loading="lazy"><span><h4>' + esc(displayName(a)) + '</h4><p>' + equipEs(a.equipment) + ' · ' + targetEs(a.target) + '</p></span><span class="go">›</span></button>').join('') : '<p class="muted small">Sin alternativas en este modo.</p>') +
    '<button class="btn block big mt" onclick="startSingle(\'' + ex.id + '\')">Entrenar solo este ejercicio →</button>';
  window.scrollTo({ top: 0 });
}
function startSingle(id) {
  const ex = byId[id]; if (!ex) return;
  const c = curatedMap[id];
  startSession({ id: 'solo-' + id, title: displayName(ex), subtitle: 'Sesión individual', tag: 'SOLO', durationMin: 10, kcal: 60, level: 'Principiante', exercises: [{ id, sets: (c && c.sets) || 3, reps: (c && c.reps) || '10-12', rest: (c && c.rest_seconds) || 60 }] });
}

/* ---------------- Sesión (diario de entrenamiento) ---------------- */
let session = null;
let timerInt = null;
let timerLeft = 0;
let timerTotal = 0;
let clockInt = null;
let restSetKey = null;
let restChoice = 60;

function fmtHMS(s) { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return [h, m, ss].map(x => String(x).padStart(2, '0')).join(':'); }
function fmtRest(sec) { return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0'); }
function tickClock() {
  const el = document.getElementById('session-clock');
  if (!el || !session) return;
  el.textContent = fmtHMS(Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000));
}
function parseNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
function bestSet(it) {
  let best = null, bestScore = 0;
  it.checks.forEach(c => {
    const w = parseNum(c.weight), r = parseInt(c.reps, 10) || 0;
    if (w > 0 && r > 0) { const s = w * (1 + r / 30); if (s > bestScore) { bestScore = s; best = { weight: w, reps: r }; } }
  });
  return best;
}
function rmValues(best) {
  const one = best.weight * (1 + best.reps / 30);
  return [1, 3, 5, 6, 8, 10, 12, 15, 20].map(r => [r, r === 1 ? one.toFixed(1) : (one / (1 + r / 30)).toFixed(1)]);
}
function maxWeight(it) {
  let best = null;
  it.checks.forEach(c => {
    const w = parseNum(c.weight), r = parseInt(c.reps, 10) || 0;
    if (w > 0 && (!best || w > best.weight)) best = { weight: w, reps: r };
  });
  return best;
}
function volumeDone(it) {
  let kg = 0, sets = 0;
  it.checks.forEach(c => { if (c.done) { kg += parseNum(c.weight) * (parseInt(c.reps, 10) || 0); sets++; } });
  return { kg, sets };
}
function pickRest(sec) { restChoice = sec; startRest(sec); }

function startRoutine(id) {
  const r = findRoutine(id);
  if (!r) { toast('Rutina no encontrada'); return; }
  startSession(r);
}
function startSession(r) {
  stopTimer();
  session = {
    routineId: r.id, routineTitle: r.title, mode,
    durationMin: r.durationMin || 50, kcal: r.kcal || 300,
    startedAt: new Date().toISOString(),
    items: r.exercises.map(e => ({
      id: e.id, sets: e.sets, reps: e.reps, rest: e.rest,
      checks: Array.from({ length: e.sets }, () => ({ done: false, reps: '', weight: '' }))
    }))
  };
  restChoice = (r.exercises[0] && r.exercises[0].rest) || 60;
  restSetKey = null;
  if (clockInt) clearInterval(clockInt);
  clockInt = setInterval(tickClock, 1000);
  lastView = currentView === 'session' ? lastView : currentView;
  currentView = 'session';
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-session').classList.add('active');
  document.querySelectorAll('nav.bottom button').forEach(b => b.classList.remove('on'));
  renderSession();
  window.scrollTo({ top: 0 });
}
function sessionProgress() {
  if (!session) return 0;
  let done = 0, total = 0;
  session.items.forEach(it => it.checks.forEach(c => { total++; if (c.done) done++; }));
  return total ? Math.round(done / total * 100) : 0;
}
function renderSession() {
  if (!session) return;
  const pct = sessionProgress();
  const body = document.getElementById('session-body');
  const totalFmt = fmtDuration(session.durationMin || 50) + ':00';
  body.innerHTML =
    '<div class="diary-title">Tu diario de<br>entrenamiento</div>' +
    '<p class="diary-sub">' + esc(session.routineTitle) + ' · ' + esc(MODES[session.mode].name) + '</p>' +
    '<div class="timer-row"><span class="clock"><span id="session-clock">00:00:00</span> <span class="muted">/ ' + totalFmt + '</span></span>' +
    '<button class="btn sm" onclick="finishSession()">Finalizar ✓</button></div>' +
    '<div class="progress"><i style="width:' + pct + '%"></i></div>' +
    '<p class="small muted">' + pct + '% completado · toca el círculo al terminar una serie · el peso es opcional en peso corporal</p>' +
    '<div class="timer" id="timer-box" style="display:none;">' +
      '<div class="small muted">Descanso</div><div class="time volt" id="timer-time">0:00</div>' +
      '<div class="row" style="justify-content:center;margin-top:10px;">' +
      '<button class="btn ghost sm" onclick="addTime(15)">+15 s</button>' +
      '<button class="btn ghost sm" onclick="stopTimer()">Parar</button></div></div>' +
    session.items.map((it, i) => {
      const ex = byId[it.id]; if (!ex) return '';
      const best = bestSet(it), maxW = maxWeight(it), vol = volumeDone(it);
      const rm = best ? rmValues(best) : null;
      const firstOpen = it.checks.findIndex(c => !c.done);
      const next = (i < session.items.length - 1) ? session.items[i + 1] : null;
      const nextEx = next ? byId[next.id] : null;
      return '<div class="card">' +
        '<div class="spread"><h3>' + esc(displayName(ex)) + '</h3>' +
        '<button class="btn ghost sm" onclick="swapExercise(' + i + ')">Cambiar 🔀</button></div>' +
        '<p class="small muted">' + it.sets + '×' + esc(it.reps) + ' · descanso ' + it.rest + ' s · ' + equipEs(ex.equipment) + '</p>' +
        '<div class="row" style="margin-top:8px;"><img src="' + imgUrl(ex) + '" alt="" style="width:56px;height:56px;border-radius:12px;object-fit:cover;" loading="lazy">' +
        '<button class="btn ghost sm" onclick="openExercise(\'' + ex.id + '\')">Ver cómo se hace</button></div>' +
        '<div class="seg2"><span class="on">' + equipEs(ex.equipment) + '</span><span>Bilateral</span></div>' +
        '<div class="stat2">' +
          '<div><div class="k">Peso máx. ›</div><div class="v">' + (maxW ? maxW.weight + ' kg<br><small>x' + maxW.reps + ' rep.</small>' : '—<br><small>registra peso</small>') + '</div></div>' +
          '<div><div class="k">Volumen máx. ›</div><div class="v">' + (vol.kg > 0 ? vol.kg.toFixed(1) + ' kg<br><small>en ' + vol.sets + ' series</small>' : '—<br><small>completa una serie</small>') + '</div></div>' +
        '</div>' +
        (rm
          ? '<div style="background:var(--card2);border-radius:14px;padding:12px 14px;margin-top:12px;"><div class="spread"><span style="font-size:13px;font-weight:700;">Tabla de Rep Max estimadas</span><span class="small muted">RM x kg</span></div><div class="rmgrid">' + rm.map(([r, v]) => '<div><b>' + r + ' x</b><span>' + v + '</span></div>').join('') + '</div></div>'
          : '<p class="small muted" style="margin-top:12px;">Registra peso y reps en una serie para ver tu RM estimada (fórmula de Epley).</p>') +
        '<div class="row" style="justify-content:space-between;padding:0 8px;margin-top:14px;"><span style="width:44px"></span><span style="font-size:13px;font-weight:700;">Reps</span><span style="font-size:13px;font-weight:700;">Peso</span><span style="font-size:16px;font-weight:700;">+</span></div>' +
        it.checks.map((c, s) => {
          const key = i + ':' + s;
          const isCurrent = s === firstOpen;
          const resting = timerInt && restSetKey === key;
          const checkContent = resting ? String(Math.max(0, timerLeft)) : (c.done ? '✓' : '');
          const checkCls = resting ? 'now' : (c.done ? 'done' : '');
          return '<div class="setrow-d' + (isCurrent ? ' hot' : '') + '">' +
            '<span class="num' + (s === 0 ? ' w' : '') + '">' + (s + 1) + '</span>' +
            '<span class="cell"><input type="number" inputmode="numeric" placeholder="' + esc(it.reps) + '" value="' + esc(c.reps) + '" aria-label="Repeticiones" onchange="setField(' + i + ',' + s + ',\'reps\',this.value)"></span>' +
            '<span class="cell"><input type="number" inputmode="decimal" step="0.5" placeholder="kg" value="' + esc(c.weight) + '" aria-label="Peso en kg" onchange="setField(' + i + ',' + s + ',\'weight\',this.value)"></span>' +
            '<button class="check ' + checkCls + '" onclick="toggleSet(' + i + ',' + s + ')" aria-label="Marcar serie">' + checkContent + '</button></div>';
        }).join('') +
        '<div style="text-align:center;font-size:18px;color:var(--muted);padding:6px 0 2px;">+</div>' +
        '<div class="restchips"><span style="font-size:14px;color:var(--muted);">⏱</span>' +
          [30, 60, 90, 120].map(sec => '<button class="restchip' + (restChoice === sec ? ' on' : '') + '" onclick="pickRest(' + sec + ')">' + fmtRest(sec) + '</button>').join('') + '</div>' +
        '</div>' +
        (next && nextEx
          ? '<div class="card"><div class="small muted" style="letter-spacing:.1em;text-transform:uppercase;">Siguiente ejercicio</div>' +
            '<div class="row" style="margin-top:10px;"><img src="' + imgUrl(nextEx) + '" alt="" style="width:56px;height:56px;border-radius:12px;object-fit:cover;" loading="lazy">' +
            '<span style="flex:1;"><h4>' + esc(displayName(nextEx)) + '</h4><p class="small muted">' + next.sets + ' × ' + esc(next.reps) + ' · ' + equipEs(nextEx.equipment) + '</p></span>' +
            '<span style="font-size:20px;font-weight:700;">→</span></div></div>'
          : '');
    }).join('') +
    '<button class="btn block big" onclick="finishSession()">✅ Terminar sesión</button>' +
    '<p class="small dim mt" style="text-align:center;">Al terminar se guarda en tu historial y la próxima vez la app te dirá qué subir.</p>';
  tickClock();
  if (timerInt) {
    const b = document.getElementById('timer-box');
    if (b) { b.style.display = ''; const t = document.getElementById('timer-time'); if (t) t.textContent = fmtTime(timerLeft); }
  }
}
function toggleSet(i, s) {
  const c = session.items[i].checks[s];
  c.done = !c.done;
  if (c.done && !c.reps) c.reps = (session.items[i].reps.match(/\d+/) || [''])[0];
  if (c.done) { startRest(session.items[i].rest); restSetKey = i + ':' + s; }
  renderSession();
}
function setField(i, s, field, val) { session.items[i].checks[s][field] = val; }
function swapExercise(i) {
  const it = session.items[i];
  const ex = byId[it.id]; if (!ex) return;
  const pool = curatedPool(session.mode).filter(e => e.target === ex.target && e.id !== it.id && !session.items.some(x => x.id === e.id));
  if (!pool.length) { toast('Sin alternativa del mismo músculo en este modo'); return; }
  const alt = pool[Math.floor(Math.random() * pool.length)];
  session.items[i] = Object.assign({}, it, { id: alt.id, checks: Array.from({ length: it.sets }, () => ({ done: false, reps: '', weight: '' })) });
  renderSession();
  toast('Cambiado a ' + displayName(alt));
}
function confirmExitSession() {
  if (session && sessionProgress() > 0) {
    if (!confirm('¿Salir sin guardar? El progreso de esta sesión se perderá.')) return;
  }
  stopTimer(); session = null;
  if (clockInt) { clearInterval(clockInt); clockInt = null; }
  go('train');
}
function finishSession() {
  if (!session) return;
  const done = session.items.reduce((n, it) => n + it.checks.filter(c => c.done).length, 0);
  const total = session.items.reduce((n, it) => n + it.checks.length, 0);
  sessions.push({
    date: new Date().toISOString(), routineId: session.routineId, routineTitle: session.routineTitle, mode: session.mode,
    exercises: session.items.map(it => ({ id: it.id, sets: it.sets, setsDone: it.checks.filter(c => c.done).length })),
    setsDone: done, setsTotal: total
  });
  LS.set('sessions', sessions);
  stopTimer();
  if (clockInt) { clearInterval(clockInt); clockInt = null; }
  const pct = total ? Math.round(done / total * 100) : 0;
  session = null;
  toast(pct === 100 ? '¡Sesión completa! 💪' : 'Sesión guardada (' + pct + '%)');
  go('home');
}

/* Temporizador de descanso */
function fmtTime(s) { return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function startRest(seconds) {
  stopTimer();
  timerTotal = seconds; timerLeft = seconds;
  const box = document.getElementById('timer-box');
  if (!box) return;
  box.style.display = '';
  box.classList.remove('done');
  document.getElementById('timer-time').textContent = fmtTime(timerLeft);
  timerInt = setInterval(() => {
    timerLeft--;
    const t = document.getElementById('timer-time');
    if (t) t.textContent = fmtTime(Math.max(0, timerLeft));
    document.querySelectorAll('.check.now').forEach(el => { el.textContent = String(Math.max(0, timerLeft)); });
    if (timerLeft <= 0) {
      const doneEls = [...document.querySelectorAll('.check.now')];
      stopTimer();
      doneEls.forEach(el => { el.textContent = '✓'; el.classList.remove('now'); el.classList.add('done'); });
      const b = document.getElementById('timer-box');
      if (b) b.classList.add('done');
      if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator(); o.frequency.value = 880;
        o.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.15);
      } catch (e) { /* sin audio */ }
      toast('Descanso terminado — ¡a darle!');
    }
  }, 1000);
}
function addTime(s) { timerLeft += s; const t = document.getElementById('timer-time'); if (t) t.textContent = fmtTime(timerLeft); }
function stopTimer() {
  if (timerInt) { clearInterval(timerInt); timerInt = null; }
  document.querySelectorAll('.check.now').forEach(el => { el.textContent = '✓'; el.classList.remove('now'); el.classList.add('done'); });
  const b = document.getElementById('timer-box'); if (b) b.style.display = 'none';
}

/* ---------------- Generador ---------------- */
let genSel = { mode: mode, days: 3, level: 'Principiante' };
function renderGenerator() {
  genSel.mode = mode;
  document.getElementById('gen-mode').innerHTML = Object.keys(MODES).map(k =>
    '<button type="button" class="' + (genSel.mode === k ? 'on' : '') + '" onclick="genPick(\'mode\',\'' + k + '\')">' + MODES[k].icon + ' ' + MODES[k].name + '</button>').join('');
  document.getElementById('gen-days').innerHTML = [2, 3, 4, 5].map(d =>
    '<button type="button" class="' + (genSel.days === d ? 'on' : '') + '" onclick="genPick(\'days\',' + d + ')">' + d + ' días</button>').join('');
  document.getElementById('gen-level').innerHTML = ['Principiante', 'Intermedio', 'Avanzado'].map(l =>
    '<button type="button" class="' + (genSel.level === l ? 'on' : '') + '" onclick="genPick(\'level\',\'' + l + '\')">' + l + '</button>').join('');
}
function genPick(k, v) { genSel[k] = v; renderGenerator(); }
function generatePlan() {
  const g = generatePlanData(genSel.mode, genSel.days, genSel.level);
  document.getElementById('plan-result').innerHTML =
    '<h2 class="sec">Tu plan · ' + MODES[g.mode].name + ' · ' + g.days + ' días · ' + esc(g.level) + '</h2>' +
    g.plan.map(p => {
      const r = findRoutine(p.routineId);
      return '<div class="card"><div class="plan-day"><h4>' + p.day + ' — ' + esc(p.title) + '</h4>' +
        '<p>' + esc(p.subtitle) + ' · ' + p.exercises.length + ' ejercicios</p></div>' +
        p.exercises.map(e => { const ex = byId[e.id]; return ex ? '<p class="small" style="padding:3px 0;">· ' + esc(displayName(ex)) + ' — <b>' + e.sets + '×' + esc(e.reps) + '</b></p>' : ''; }).join('') +
        (r ? '<button class="btn block mt" onclick="startRoutine(\'' + r.id + '\')">Empezar ' + esc(p.title) + ' →</button>' : '') +
        '</div>';
    }).join('') +
    '<p class="small muted">Regla de progresión: completa todas las series con buena técnica y la próxima semana sube reps; al llegar al tope del rango, sube peso. Descansa 48 h entre sesiones del mismo músculo.</p>';
  document.getElementById('plan-result').scrollIntoView({ behavior: 'smooth' });
}
function generatePlanData(m, days, level) { return buildPlan(m, days, level); }

/* ---------------- Medir (regla de peso + figura con medidas) ---------------- */
let measureUnit = 'kg';
let rulerKg = 85.0;
let rulerRaf = null;
const MEASURE_FIELDS = [
  { key: 'neck', label: 'Cuello', top: '11%', left: '50%' },
  { key: 'chest', label: 'Pecho', top: '24%', left: '50%' },
  { key: 'waist', label: 'Cintura', top: '40%', left: '50%' },
  { key: 'arm', label: 'Brazo', top: '28%', left: '24%' },
  { key: 'hip', label: 'Cadera', top: '47%', left: '50%' },
  { key: 'thigh', label: 'Muslo', top: '58%', left: '42%' },
  { key: 'calf', label: 'Pantorrilla', top: '82%', left: '42%' }
];
const KG2LB = 2.20462;
function rulerCfg() {
  return measureUnit === 'kg'
    ? { min: 40, max: 200, step: 0.1, major: v => Math.abs(v - Math.round(v)) < 1e-9, label: v => Math.round(v) % 2 === 0 }
    : { min: 90, max: 440, step: 0.5, major: v => v % 10 === 0, label: v => v % 20 === 0 };
}
function rulerValToKg(v) { return measureUnit === 'kg' ? v : v / KG2LB; }
function kgToRuler(kg) { return measureUnit === 'kg' ? kg : kg * KG2LB; }
function buildRuler() {
  const cfg = rulerCfg();
  const strip = document.getElementById('ruler-strip');
  if (!strip) return;
  let html = '';
  for (let v = cfg.min; v <= cfg.max + 1e-9; v += cfg.step) {
    const vv = Math.round(v * 10) / 10;
    const major = cfg.major(vv);
    const mid = Math.abs((vv * 10) % 5) < 1e-9;
    const h = major ? 52 : (mid ? 34 : 22);
    html += '<div class="ruler-tick' + (major ? ' major' : '') + '"><i style="height:' + h + 'px"></i>' +
      (major && cfg.label(vv) ? '<span>' + Math.round(vv) + '</span>' : '<span></span>') + '</div>';
  }
  strip.innerHTML = html;
  centerRuler();
}
function centerRuler() {
  const wrap = document.getElementById('ruler-wrap');
  if (!wrap) return;
  const cfg = rulerCfg();
  const idx = Math.round((kgToRuler(rulerKg) - cfg.min) / cfg.step);
  wrap.scrollLeft = idx * 14 - wrap.clientWidth / 2 + 7;
}
function rulerScroll() {
  const wrap = document.getElementById('ruler-wrap');
  if (!wrap) return;
  const cfg = rulerCfg();
  const idx = Math.round((wrap.scrollLeft + wrap.clientWidth / 2 - 7) / 14);
  const v = cfg.min + idx * cfg.step;
  const clamped = Math.max(cfg.min, Math.min(cfg.max, v));
  rulerKg = rulerValToKg(clamped);
  updateBigNumber();
}
function updateBigNumber() {
  const disp = measureUnit === 'kg' ? rulerKg : rulerKg * KG2LB;
  const b = document.getElementById('measure-big');
  if (b) b.textContent = disp.toFixed(1);
  const u = document.getElementById('measure-big-unit');
  if (u) u.textContent = measureUnit;
}
function setUnit(u) {
  if (measureUnit === u) return;
  measureUnit = u;
  document.querySelectorAll('#unit-toggle button').forEach((b, i) => b.classList.toggle('on', (i === 0) === (u === 'kg')));
  buildRuler();
  updateBigNumber();
}
function saveWeightRuler() {
  const v = Math.round(rulerKg * 10) / 10;
  if (!v || v < 30 || v > 300) { toast('Escribe un peso válido, por ejemplo 85.0'); return; }
  const today = new Date().toISOString().slice(0, 10);
  weights = weights.filter(x => x.date !== today);
  weights.push({ date: today, weight: v });
  LS.set('weights', weights);
  renderMeasure(); renderHome();
  toast('Peso guardado: ' + v.toFixed(1) + ' kg');
}
function focusMeasure(key) {
  const el = document.getElementById('m-' + key);
  if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}
function renderMeasure() {
  const w = weights[weights.length - 1];
  if (w) rulerKg = w.weight;
  updateBigNumber();
  const first = weights[0];
  const bmi = w ? (w.weight / (1.65 * 1.65)).toFixed(1) : '—';
  const meta = document.getElementById('measure-meta');
  if (meta) meta.textContent =
    (first ? 'Peso inicial guardado: ' + first.weight.toFixed(1) + ' kg · ' + first.date + ' · ' : '') +
    'Meta: 75.0 kg · IMC ' + bmi;
  buildRuler();
  const last = weights.slice(-10);
  const min = Math.min(...last.map(x => x.weight)), max = Math.max(...last.map(x => x.weight));
  const span = Math.max(1, max - min);
  document.getElementById('weight-bars').innerHTML = last.map(x =>
    '<div class="bar-col"><b>' + x.weight.toFixed(1) + '</b><i class="hot" style="height:' + Math.max(8, 14 + (x.weight - min) / span * 58) + 'px"></i><span>' + esc((x.date || '').slice(5, 10)) + '</span></div>').join('');
  document.getElementById('weight-history').innerHTML = weights.slice().reverse().slice(0, 12).map(x =>
    '<div class="card" style="padding:12px 16px;"><div class="spread"><span>' + esc(x.date) + '</span><b>' + x.weight.toFixed(1) + ' kg</b></div></div>').join('') || '<p class="muted">Sin registros.</p>';
  document.getElementById('measure-fig').innerHTML =
    bodyFigure(false, new Set(), new Set()) +
    MEASURE_FIELDS.map((f, idx) => '<button class="dot" style="top:' + f.top + ';left:' + f.left + '" onclick="focusMeasure(\'' + f.key + '\')" title="' + f.label + '">' + (idx + 1) + '</button>').join('');
  document.getElementById('measure-fields').innerHTML = MEASURE_FIELDS.map((f, idx) =>
    '<div class="field"><label>' + (idx + 1) + '. ' + f.label + ' (cm)</label><input id="m-' + f.key + '" type="number" step="0.5" placeholder="—" value="' + (measures && measures[f.key] ? esc(measures[f.key]) : '') + '"></div>').join('');
  document.getElementById('measures-saved').textContent = measures
    ? 'Últimas medidas guardadas: ' + (measures.date || '') + ' · ' + MEASURE_FIELDS.filter(f => measures[f.key]).map(f => f.label.toLowerCase() + ' ' + measures[f.key] + ' cm').join(' · ') + '.'
    : '';
}
function saveMeasures() {
  const data = { date: new Date().toISOString().slice(0, 10) };
  let any = false;
  MEASURE_FIELDS.forEach(f => {
    const el = document.getElementById('m-' + f.key);
    const v = el ? el.value : '';
    if (v) { data[f.key] = v; any = true; }
  });
  if (!any) { toast('Escribe al menos una medida'); return; }
  measures = data;
  LS.set('measures', measures);
  renderMeasure();
  toast('Medidas guardadas');
}

/* ---------------- Inicio ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  const s = document.getElementById('search');
  if (s) s.addEventListener('input', () => { exploreState.q = s.value; exploreState.shown = 30; renderExplore(); });
  const rw = document.getElementById('ruler-wrap');
  if (rw) rw.addEventListener('scroll', () => {
    if (rulerRaf) return;
    rulerRaf = requestAnimationFrame(() => { rulerRaf = null; rulerScroll(); });
  });
  renderHome(); renderTrain(); renderExplore(); renderMeasure();
  setTimeout(() => document.getElementById('splash').classList.add('hide'), 700);
});
