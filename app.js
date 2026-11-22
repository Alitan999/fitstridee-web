/* FitStridee web v1.1.0 — lógica 100% local, sin servidor, sin cuentas, gratis.
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
let measuresHistory = LS.get('measuresHistory', []);
if (!measuresHistory.length && measures) measuresHistory = [measures];
let customRoutines = LS.get('customRoutines', []);
let leoState = LS.get('leo', { startDate: null, days: {} });

/* ---------------- Programa de Leo (@84leo_24) ---------------- */
/* Reel "Beginner chest workout at home (easy)", https://www.instagram.com/reel/DdOod-lMTLq/
   Series y reps EXACTAS del reel, sin inventar nada. El reel muestra un gráfico
   Día 1 a Día 14 pero no detalla reps por día, así que el programa repite cada día
   las 3 variantes con sus series del reel y marca el día completo cuando haces las 3. */
const LEO = {
  title: 'Pecho en casa — Día 1 a Día 14',
  creator: 'Leo (@84leo_24)',
  url: 'https://www.instagram.com/reel/DdOod-lMTLq/',
  totalDays: 14,
  variants: [
    { id: '3211', label: 'Flexiones de rodillas normales', sets: 3, reps: '8-12', rest: 60 },
    { id: '0283', label: 'Flexiones de rodillas diamante', sets: 3, reps: '10-12', rest: 60 },
    { id: '1311', label: 'Flexiones de rodillas con manos abiertas', sets: 3, reps: '10-15', rest: 60 }
  ]
};
function leoDoneDays() { return Object.keys(leoState.days || {}).filter(d => leoState.days[d] && leoState.days[d].done).length; }
function leoNextDay() { for (let d = 1; d <= LEO.totalDays; d++) { if (!leoState.days[d] || !leoState.days[d].done) return d; } return null; }
function leoSave() { LS.set('leo', leoState); }

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
function customRoutineObj(c) {
  return { id: c.id, title: c.title, subtitle: c.subtitle || 'Rutina propia · ' + MODES[c.mode].name, tag: 'MÍA', durationMin: c.durationMin || 45, kcal: c.kcal || 300, level: 'Principiante', mode: c.mode, custom: true, exercises: c.exercises };
}
function findRoutine(id) {
  const c = customRoutines.find(x => x.id === id);
  if (c) return customRoutineObj(c);
  return ROUTINES[id] || null;
}
function saveCustomRoutines() { LS.set('customRoutines', customRoutines); }

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
  if (view === 'leo') renderLeo();
  if (view === 'stats') renderStats();
  if (view === 'custom') renderCustomEditor();
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
/* ---------------- Progresión automática (regla visible) ---------------- */
/* Doble progresión: primero subes reps hasta el tope del rango; cuando completas
   todas las series al tope, subes peso (con mancuernas fijas o peso corporal,
   subes reps o pasas a una variante más difícil). Cada 4ª semana es descarga:
   menos series, mismo peso. La regla se muestra en cada ejercicio, no es secreta. */
function parseRepsRange(reps) {
  const m = String(reps || '').match(/(\d+)\s*-\s*(\d+)/);
  if (m) return [parseInt(m[1], 10), parseInt(m[2], 10)];
  const n = parseInt(String(reps || '').match(/\d+/) || '', 10);
  return isNaN(n) ? null : [n, n];
}
function lastPerformance(exId) {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const s = sessions[i];
    const ex = (s.exercises || []).find(e => e.id === exId);
    if (!ex) continue;
    const detail = (ex.setsDetail || []).filter(d => d.done);
    return {
      date: s.date, sets: ex.sets, setsDone: ex.setsDone || detail.length,
      reps: detail.map(d => parseInt(d.reps, 10) || 0),
      weights: detail.map(d => parseNum(d.weight)),
      completedAll: (ex.setsDone || 0) >= (ex.sets || 0) && (ex.sets || 0) > 0
    };
  }
  return null;
}
function weekInCycle() {
  if (!sessions.length) return 1;
  const first = new Date(sessions[0].date).getTime();
  const weeks = Math.max(0, Math.floor((Date.now() - first) / (7 * 24 * 3600 * 1000)));
  return (weeks % 4) + 1;
}
function suggestionFor(ex, base) {
  const range = parseRepsRange(base.reps);
  const cycle = weekInCycle();
  const deload = cycle === 4;
  const last = lastPerformance(ex.id);
  const isFixed = ex.equipment === 'body weight' || ex.equipment === 'dumbbell';
  if (!range) return { reps: '', weight: '', sets: base.sets, deload, text: 'Hazlo con calma y marca cada serie que completes.' };
  const [lo, hi] = range;
  if (deload) {
    return {
      reps: String(lo), weight: last && Math.max.apply(null, last.weights.concat([0])) > 0 ? String(Math.max.apply(null, last.weights)) : (ex.equipment === 'dumbbell' ? '7' : ''),
      sets: Math.max(2, base.sets - 1), deload: true,
      text: 'Semana 4 de 4: descarga. Haz ' + Math.max(2, base.sets - 1) + ' series con ' + lo + ' reps y el mismo peso de la semana pasada, para recuperarte. La semana que viene vuelves a subir.'
    };
  }
  if (!last) {
    return {
      reps: String(lo), weight: ex.equipment === 'dumbbell' ? '7' : '', sets: base.sets, deload: false,
      text: 'Primera vez con este ejercicio: empieza con ' + lo + ' reps por serie' + (ex.equipment === 'dumbbell' ? ' con tus mancuernas de 7 kg' : '') + '. Si completas todas las series, la próxima vez subes.'
    };
  }
  const lastWeight = Math.max.apply(null, last.weights.concat([0]));
  const topReps = last.reps.length ? Math.min.apply(null, last.reps) : 0;
  const atTop = last.completedAll && topReps >= hi;
  if (atTop) {
    if (isFixed) {
      return {
        reps: String(hi + 2), weight: lastWeight > 0 ? String(lastWeight) : (ex.equipment === 'dumbbell' ? '7' : ''), sets: base.sets, deload: false,
        text: 'La última vez completaste todas las series con ' + hi + ' reps. Hoy intenta ' + (hi + 2) + ' reps por serie con el mismo peso. Con mancuernas fijas se progresa por reps.'
      };
    }
    const nextW = lastWeight > 0 ? (lastWeight + (lastWeight >= 20 ? 2.5 : 1)) : '';
    return {
      reps: String(lo), weight: nextW === '' ? '' : String(nextW), sets: base.sets, deload: false,
      text: 'La última vez completaste todas las series con ' + hi + ' reps y ' + lastWeight + ' kg. Hoy sube a ' + nextW + ' kg y vuelve a ' + lo + ' reps por serie.'
    };
  }
  return {
    reps: String(hi), weight: lastWeight > 0 ? String(lastWeight) : (ex.equipment === 'dumbbell' ? '7' : ''), sets: base.sets, deload: false,
    text: 'La última vez hiciste ' + (last.setsDone || 0) + ' de ' + (last.sets || base.sets) + ' series. Hoy repite el mismo peso e intenta llegar a ' + hi + ' reps en todas las series.'
  };
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
  document.getElementById('home-progression').innerHTML = '<h3>📈 Qué toca subir</h3><p class="muted small mt">' + esc(progressionTip()) + '</p>' +
    '<p class="small muted mt">Regla: primero subes reps hasta el tope del rango; cuando completas todas las series al tope, subes peso. Con mancuernas fijas o peso corporal, subes por reps. Semana ' + weekInCycle() + ' de 4' + (weekInCycle() === 4 ? ' (descarga: menos series, mismo peso)' : '') + '.</p>';
  const leoEl = document.getElementById('home-leo-card');
  if (leoEl) {
    const done = leoDoneDays(), next = leoNextDay();
    leoEl.innerHTML = '<div class="spread"><h3>💪 Pecho en casa — Leo</h3><span class="tag">' + done + '/14 días</span></div>' +
      '<div class="progress" style="margin-top:10px;"><i style="width:' + Math.round(done / 14 * 100) + '%"></i></div>' +
      '<p class="muted small mt">' + (next ? 'Te toca el día ' + next + ': 3 variantes de flexiones de rodillas.' : '¡Programa completado! Ya puedes probar las flexiones normales.') + '</p>' +
      '<button class="btn ghost block mt" onclick="go(\'leo\')">' + (next ? 'Ver el día ' + next + ' →' : 'Ver mi progreso →') + '</button>';
  }
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
  el.innerHTML = '<div class="spread"><h3>Calorías por semana (estimación)</h3><span class="tag">Sin candado</span></div>' +
    '<div class="bars" style="margin-top:10px;">' + days.map(d =>
      '<div class="bar-col"><b>' + (d.kcal || '—') + '</b><i class="' + (d.kcal ? 'hot' : '') + '" style="height:' + Math.max(4, d.kcal / max * 72) + 'px"></i><span>' + d.label + '</span></div>').join('') + '</div>' +
    '<p class="small muted mt">Total esta semana: <b style="color:#fff;">' + total.toLocaleString('es-MX') + ' kcal (estimación)</b>' +
    (trainedDays ? ' · promedio ' + Math.round(total / trainedDays) + ' kcal por sesión' : ' · sin sesiones todavía') + ' · Es una estimación según la rutina, no una medición.</p>';
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
  const mine = customRoutines.filter(c => c.mode === mode);
  document.getElementById('custom-list').innerHTML = mine.length
    ? mine.map(c => {
        const r = customRoutineObj(c);
        return '<div class="card"><div class="spread"><div><span class="tag">MÍA · ' + MODES[c.mode].name.toUpperCase() + '</span><h3 class="mt">' + esc(c.title) + '</h3>' +
          '<p class="muted small mt">' + r.exercises.length + ' ejercicios · ' + (c.durationMin || 45) + ' min</p></div></div>' +
          '<div class="row mt"><button class="btn sm" style="flex:1;" onclick="openRoutine(\'' + c.id + '\')">Ver y empezar →</button>' +
          '<button class="btn ghost sm" onclick="openCustomEditor(\'' + c.id + '\')">Editar</button>' +
          '<button class="btn ghost sm" onclick="duplicateCustom(\'' + c.id + '\')">Duplicar</button>' +
          '<button class="btn danger sm" onclick="deleteCustom(\'' + c.id + '\')">Eliminar</button></div></div>';
      }).join('')
    : '<p class="muted small">Aún no tienes rutinas propias en ' + MODES[mode].name + '. Crea una con los ejercicios que tú elijas.</p>';
  const leoMini = document.getElementById('leo-mini');
  if (leoMini) {
    const done = leoDoneDays();
    leoMini.innerHTML = '<div class="progress" style="margin-top:10px;"><i style="width:' + Math.round(done / 14 * 100) + '%"></i></div><p class="small muted mt">' + done + ' de 14 días completados.</p>';
  }
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
    '<div class="meta"><span>⏱ <b>' + r.durationMin + ' min</b></span><span>🔥 <b>≈' + r.kcal + ' kcal</b></span>' +
    '<span>💪 <b>' + r.exercises.length + ' ejercicios</b></span><span>' + esc(r.level) + '</span></div>' +
    '<div class="thumb-strip">' + thumbs + '</div>' +
    '<p class="small volt" style="margin-top:10px;font-weight:700;">' + (showStart ? 'Empezar esta rutina →' : 'Ver ejercicios y empezar →') + '</p>' +
    '</button>';
}

/* ---------------- Mapa corporal v3.3 (figuras propias, anatómicas) ---------------- */
/* Formas en design/assets/figures.py (fuente única); aquí van incrustadas. */
const _BM_FILL = (key, worked, secondary) => worked.has(key) ? '#FFFFFF' : (secondary.has(key) ? '#6E6E73' : '#2C2C2E');
const _BM_MIRROR = el => '<g transform="translate(200,0) scale(-1,1)">' + el + '</g>';
const _BM_BASE = '<circle cx="100" cy="23" r="16" fill="__BF__" stroke="__BS__" stroke-width="2"/><path d="M93,36 L107,36 L109,52 L91,52 Z" fill="__BF__" stroke="__BS__" stroke-width="2"/><path d="M64,56 L136,56 L132,118 C130,142 126,156 121,166 L79,166 C74,156 70,142 68,118 Z" fill="__BF__" stroke="__BS__" stroke-width="2"/><path d="M48,60 C43,72 42,98 45,118 C47,128 53,128 55,120 L57,92 C58,78 58,68 57,60 Z" fill="__BF__" stroke="__BS__" stroke-width="2"/><path d="M45,124 C43,136 43,150 46,158 C48,164 54,163 55,156 L56,130 C56,124 50,120 45,124 Z" fill="__BF__" stroke="__BS__" stroke-width="2"/><ellipse cx="50" cy="170" rx="6" ry="9" fill="__BF__" stroke="__BS__" stroke-width="2"/><path d="M75,166 L97,166 L95,246 C94,258 88,260 84,252 L78,200 C76,186 75,174 75,166 Z" fill="__BF__" stroke="__BS__" stroke-width="2"/><circle cx="86" cy="258" r="7" fill="__BF__" stroke="__BS__" stroke-width="2"/><path d="M79,258 C76,274 76,302 80,320 C83,330 89,329 90,318 L90,266 C90,258 83,256 79,258 Z" fill="__BF__" stroke="__BS__" stroke-width="2"/><rect x="81" y="326" width="10" height="18" rx="4" fill="__BF__" stroke="__BS__" stroke-width="2"/><ellipse cx="86" cy="350" rx="10" ry="8" fill="__BF__" stroke="__BS__" stroke-width="2"/><g transform="translate(200,0) scale(-1,1)"><path d="M48,60 C43,72 42,98 45,118 C47,128 53,128 55,120 L57,92 C58,78 58,68 57,60 Z" fill="__BF__" stroke="__BS__" stroke-width="2"/><path d="M45,124 C43,136 43,150 46,158 C48,164 54,163 55,156 L56,130 C56,124 50,120 45,124 Z" fill="__BF__" stroke="__BS__" stroke-width="2"/><ellipse cx="50" cy="170" rx="6" ry="9" fill="__BF__" stroke="__BS__" stroke-width="2"/><path d="M75,166 L97,166 L95,246 C94,258 88,260 84,252 L78,200 C76,186 75,174 75,166 Z" fill="__BF__" stroke="__BS__" stroke-width="2"/><circle cx="86" cy="258" r="7" fill="__BF__" stroke="__BS__" stroke-width="2"/><path d="M79,258 C76,274 76,302 80,320 C83,330 89,329 90,318 L90,266 C90,258 83,256 79,258 Z" fill="__BF__" stroke="__BS__" stroke-width="2"/><rect x="81" y="326" width="10" height="18" rx="4" fill="__BF__" stroke="__BS__" stroke-width="2"/><ellipse cx="86" cy="350" rx="10" ry="8" fill="__BF__" stroke="__BS__" stroke-width="2"/></g>'.replaceAll('__BF__', '#2C2C2E').replaceAll('__BS__', '#55565A');
const _BM_FRONT = [
    ['delts', '<path d="M62,55 C50,57 43,67 44,79 C45,89 51,95 59,94 C65,93 68,85 67,75 C66,66 66,59 62,55 Z" fill="__FILL__" stroke="__STROKE__" stroke-width="2"/>', true],
    ['pecs', '<path d="M70,63 C78,58 90,58 98,62 L98,84 C98,93 93,99 85,98 C75,97 68,89 68,78 C68,72 68,67 70,63 Z" fill="__FILL__" stroke="__STROKE__" stroke-width="2"/>', true],
    ['biceps', '<path d="M46,83 C42,91 42,107 45,119 C47,127 53,128 55,121 L55,93 C55,85 50,80 46,83 Z" fill="__FILL__" stroke="__STROKE__" stroke-width="2"/>', true],
    ['abs', '<path d="M85,107 L96,107 Q98,107 98,110 L98,119 Q98,122 95,122 L86,122 Q83,122 83,119 L83,110 Q83,107 85,107 Z" fill="__FILL__" stroke="__STROKE__" stroke-width="2"/>', true],
    ['abs', '<path d="M85,125 L96,125 Q98,125 98,128 L98,137 Q98,140 95,140 L86,140 Q83,140 83,137 L83,128 Q83,125 85,125 Z" fill="__FILL__" stroke="__STROKE__" stroke-width="2"/>', true],
    ['abs', '<path d="M86,143 L95,143 Q97,143 97,146 L97,155 Q97,158 94,158 L87,158 Q84,158 84,155 L84,146 Q84,143 86,143 Z" fill="__FILL__" stroke="__STROKE__" stroke-width="2"/>', true],
    ['abs', '<path d="M68,109 C72,119 72,137 68,151 C66,157 70,159 73,153 L76,119 C77,111 72,105 68,109 Z" fill="__FILL__" stroke="__STROKE__" stroke-width="2"/>', true],
    ['forearms', '<path d="M46,125 C43,135 43,149 46,157 C48,163 54,162 55,155 L55,131 C55,125 49,121 46,125 Z" fill="__FILL__" stroke="__STROKE__" stroke-width="2"/>', true],
    ['quads', '<path d="M77,178 C71,192 70,222 75,244 C78,254 87,254 89,244 L90,194 C90,182 84,174 77,178 Z" fill="__FILL__" stroke="__STROKE__" stroke-width="2"/>', true],
    ['quads', '<path d="M91,180 C89,192 89,222 91,242 C93,250 99,248 99,236 L99,192 C99,183 95,178 91,180 Z" fill="__FILL__" stroke="__STROKE__" stroke-width="2"/>', true],
    ['calves', '<path d="M79,262 C75,278 75,304 79,318 C82,328 88,327 89,316 L89,270 C89,262 83,260 79,262 Z" fill="__FILL__" stroke="__STROKE__" stroke-width="2"/>', true],
    ['calves', '<path d="M91,264 C89,278 89,302 91,314 C93,322 98,320 98,310 L98,272 C98,264 94,261 91,264 Z" fill="__FILL__" stroke="__STROKE__" stroke-width="2"/>', true]
  ];
const _BM_BACK = [
    ['traps', '<path d="M88,52 L112,52 L108,72 C105,88 102,98 100,102 C98,98 95,88 92,72 Z" fill="__FILL__" stroke="__STROKE__" stroke-width="2"/>', false],
    ['delts', '<path d="M62,59 C50,61 43,71 44,83 C45,93 51,99 59,98 C65,97 68,89 67,79 C66,70 66,63 62,59 Z" fill="__FILL__" stroke="__STROKE__" stroke-width="2"/>', true],
    ['triceps', '<path d="M46,83 C42,93 42,109 45,121 C47,129 53,128 55,120 L55,93 C55,85 50,80 46,83 Z" fill="__FILL__" stroke="__STROKE__" stroke-width="2"/>', true],
    ['lats', '<path d="M70,86 C78,82 90,82 97,86 L97,118 C97,134 92,146 84,148 C76,146 70,134 69,116 C68,104 68,94 70,86 Z" fill="__FILL__" stroke="__STROKE__" stroke-width="2"/>', true],
    ['erectors', '<rect x="94" y="150" width="5" height="16" rx="2" fill="__FILL__" stroke="__STROKE__" stroke-width="2"/>', true],
    ['forearms', '<path d="M46,125 C43,135 43,149 46,157 C48,163 54,162 55,155 L55,131 C55,125 49,121 46,125 Z" fill="__FILL__" stroke="__STROKE__" stroke-width="2"/>', true],
    ['glutes', '<path d="M78,152 C73,160 73,174 78,183 C82,189 90,189 93,183 L94,160 C94,152 84,148 78,152 Z" fill="__FILL__" stroke="__STROKE__" stroke-width="2"/>', true],
    ['hams', '<path d="M78,186 C74,200 74,226 78,244 C81,252 88,251 89,240 L89,196 C89,186 83,182 78,186 Z" fill="__FILL__" stroke="__STROKE__" stroke-width="2"/>', true],
    ['hams', '<path d="M92,188 C89,200 89,224 92,242 C94,248 99,246 99,236 L99,196 C99,188 96,185 92,188 Z" fill="__FILL__" stroke="__STROKE__" stroke-width="2"/>', true],
    ['calves', '<path d="M79,262 C75,278 75,304 79,318 C82,328 88,327 89,316 L89,270 C89,262 83,260 79,262 Z" fill="__FILL__" stroke="__STROKE__" stroke-width="2"/>', true],
    ['calves', '<path d="M91,264 C89,278 89,302 91,314 C93,322 98,320 98,310 L98,272 C98,264 94,261 91,264 Z" fill="__FILL__" stroke="__STROKE__" stroke-width="2"/>', true]
  ];
function bodyFigure(back, worked, secondary) {
  const parts = back ? _BM_BACK : _BM_FRONT;
  const muscles = parts.map(([k, el, sym]) => { const e = el.replace('__FILL__', _BM_FILL(k, worked, secondary)).replace('__STROKE__', '#55565A'); return e + (sym ? _BM_MIRROR(e) : ''); }).join('');
  return '<svg viewBox="0 0 200 368" fill="none" role="img" aria-label="' + (back ? 'Espalda' : 'Frente') + '">' + _BM_BASE + muscles + '</svg>';
}
/* Figura de Medir: ilustración frontal detallada (los puntos 1-7 son botones HTML encima). */
function measureFigure() {
  return `<svg viewBox="0 0 200 368" fill="none" role="img" aria-label="Figura de medida"><path d="M87,18 C87,7 93,3 100,3 C107,3 113,7 113,18 C113,30 108,37 100,37 C92,37 87,30 87,18 Z" fill="#E8E8E8" stroke="#0B0B0B" stroke-width="2"/><ellipse cx="86" cy="20" rx="2.5" ry="4.5" fill="#E8E8E8" stroke="#0B0B0B" stroke-width="1.5"/><ellipse cx="114" cy="20" rx="2.5" ry="4.5" fill="#E8E8E8" stroke="#0B0B0B" stroke-width="1.5"/><path d="M86,17 C84,4 92,0 100,0 C108,0 116,4 114,17 C112,11 110,8 106,8 L104,12 C101,8 97,8 94,12 C90,9 88,12 86,17 Z" fill="#0B0B0B"/><path d="M90,21 Q93,19 96,21 M104,21 Q107,19 110,21" fill="none" stroke="#0B0B0B" stroke-width="1.6" stroke-linecap="round"/><path d="M100,23 L99,28" fill="none" stroke="#0B0B0B" stroke-width="1.5" stroke-linecap="round"/><path d="M96,31 Q100,33 104,31" fill="none" stroke="#0B0B0B" stroke-width="1.6" stroke-linecap="round"/><path d="M87,22 L87,29 C88,37 93,43 100,43 C107,43 112,37 113,29 L113,22 C112,29 110,34 106,36 L106,33 C103,35 97,35 94,33 L94,36 C90,34 88,29 87,22 Z" fill="#0B0B0B"/><path d="M93,38 L107,38 L109,52 L91,52 Z" fill="#E8E8E8" stroke="#0B0B0B" stroke-width="2"/><path d="M91,52 L78,58 M109,52 L122,58" fill="none" stroke="#0B0B0B" stroke-width="1.5" stroke-linecap="round"/><path d="M64,58 C72,51 84,49 92,50 L108,50 C116,49 128,51 136,58 C138,72 136,90 133,106 C130,126 126,144 122,156 L78,156 C74,144 70,126 67,106 C64,90 62,72 64,58 Z" fill="#E8E8E8" stroke="#0B0B0B" stroke-width="2"/><path d="M70,66 C78,61 90,61 98,65 M102,65 C110,61 122,61 130,66" fill="none" stroke="#0B0B0B" stroke-width="1.4" stroke-linecap="round"/><path d="M71,82 C76,92 84,96 93,94 M129,82 C124,92 116,96 107,94" fill="none" stroke="#0B0B0B" stroke-width="1.4" stroke-linecap="round"/><circle cx="81" cy="84" r="1.6" fill="#0B0B0B"/><circle cx="119" cy="84" r="1.6" fill="#0B0B0B"/><path d="M100,60 L100,102 M83,112 Q100,116 117,112 M83,126 Q100,130 117,126 M84,140 Q100,144 116,140" fill="none" stroke="#0B0B0B" stroke-width="1.4" stroke-linecap="round"/><ellipse cx="100" cy="149" rx="2" ry="3" fill="#0B0B0B"/><path d="M70,108 C73,122 73,138 70,150 M130,108 C127,122 127,138 130,150" fill="none" stroke="#0B0B0B" stroke-width="1.3" stroke-linecap="round"/><path d="M64,58 C56,62 50,74 49,90 L48,120 C48,130 54,132 56,124 L58,96 C59,82 60,70 62,60 Z" fill="#E8E8E8" stroke="#0B0B0B" stroke-width="2"/><path d="M48,124 C46,136 46,150 48,158 C50,164 55,163 56,156 L57,130" fill="#E8E8E8" stroke="#0B0B0B" stroke-width="2"/><path d="M48,158 C46,166 46,174 49,179 C52,183 57,182 57,176 L57,160" fill="#E8E8E8" stroke="#0B0B0B" stroke-width="2"/><path d="M50,168 L54,168 M50,173 L54,173" stroke="#0B0B0B" stroke-width="1.2" stroke-linecap="round"/><path d="M56,96 C58,104 58,112 56,120" fill="none" stroke="#0B0B0B" stroke-width="1.3" stroke-linecap="round"/><path d="M136,58 C144,62 150,74 151,90 L152,120 C152,130 146,132 144,124 L142,96 C141,82 140,70 138,60 Z" fill="#E8E8E8" stroke="#0B0B0B" stroke-width="2"/><path d="M152,124 C154,136 154,150 152,158 C150,164 145,163 144,156 L143,130" fill="#E8E8E8" stroke="#0B0B0B" stroke-width="2"/><path d="M152,158 C154,166 154,174 151,179 C148,183 143,182 143,176 L143,160" fill="#E8E8E8" stroke="#0B0B0B" stroke-width="2"/><path d="M146,168 L150,168 M146,173 L150,173" stroke="#0B0B0B" stroke-width="1.2" stroke-linecap="round"/><path d="M144,96 C142,104 142,112 144,120" fill="none" stroke="#0B0B0B" stroke-width="1.3" stroke-linecap="round"/><path d="M76,154 L124,154 L128,182 C128,188 122,190 116,190 L104,190 L100,174 L96,190 L84,190 C78,190 72,188 72,182 Z" fill="#2C2C2E" stroke="#0B0B0B" stroke-width="2"/><path d="M74,159 L126,159" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="5 4"/><path d="M76,162 L74,186 M124,162 L126,186" stroke="#55565A" stroke-width="1.2"/><path d="M75,188 L97,188 L95,246 C94,258 88,260 84,252 L78,204 C76,194 75,190 75,188 Z" fill="#E8E8E8" stroke="#0B0B0B" stroke-width="2"/><path d="M125,188 L103,188 L105,246 C106,258 112,260 116,252 L122,204 C124,194 125,190 125,188 Z" fill="#E8E8E8" stroke="#0B0B0B" stroke-width="2"/><path d="M86,196 C88,212 88,228 86,242 M114,196 C112,212 112,228 114,242" fill="none" stroke="#0B0B0B" stroke-width="1.3" stroke-linecap="round"/><circle cx="86" cy="258" r="6" fill="#E8E8E8" stroke="#0B0B0B" stroke-width="1.5"/><circle cx="114" cy="258" r="6" fill="#E8E8E8" stroke="#0B0B0B" stroke-width="1.5"/><path d="M79,258 C76,274 76,302 80,320 C83,330 89,329 90,318 L90,266 C90,258 83,256 79,258 Z" fill="#E8E8E8" stroke="#0B0B0B" stroke-width="2"/><rect x="81" y="326" width="10" height="18" rx="4" fill="#E8E8E8" stroke="#0B0B0B" stroke-width="2"/><path d="M121,258 C124,274 124,302 120,320 C117,330 111,329 110,318 L110,266 C110,258 117,256 121,258 Z" fill="#E8E8E8" stroke="#0B0B0B" stroke-width="2"/><rect x="109" y="326" width="10" height="18" rx="4" fill="#E8E8E8" stroke="#0B0B0B" stroke-width="2"/><path d="M84,272 C86,288 86,304 84,318 M116,272 C114,288 114,304 116,318" fill="none" stroke="#0B0B0B" stroke-width="1.3" stroke-linecap="round"/><ellipse cx="86" cy="350" rx="10" ry="8" fill="#E8E8E8" stroke="#0B0B0B" stroke-width="2"/><ellipse cx="114" cy="350" rx="10" ry="8" fill="#E8E8E8" stroke="#0B0B0B" stroke-width="2"/><path d="M80,348 L92,348 M108,348 L120,348" stroke="#0B0B0B" stroke-width="1.3" stroke-linecap="round"/></svg>`;
}
const TARGET_MUSCLE = {
  pectorals: ['pecs', 'front'], delts: ['delts', 'front'], biceps: ['biceps', 'front'],
  triceps: ['triceps', 'back'], abs: ['abs', 'front'], quads: ['quads', 'front'],
  glutes: ['glutes', 'back'], hamstrings: ['hams', 'back'], lats: ['lats', 'back'],
  'upper back': ['lats', 'back'], traps: ['traps', 'back'], calves: ['calves', 'both'],
  forearms: ['forearms', 'front'], adductors: ['quads', 'front'], abductors: ['quads', 'front'],
  spine: ['erectors', 'back'], 'serratus anterior': ['abs', 'front'], 'levator scapulae': ['traps', 'back']
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
  const m = Math.round(min);
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60), r = m % 60;
  return h + ' h' + (r ? ' ' + String(r).padStart(2, '0') + ' min' : '');
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
  const tabs = r.custom ? [{ label: 'Mi rutina', id }] : routineTabs(r.mode);
  const mus = musclesForRoutine(r);
  const equipSet = [...new Set(r.exercises.map(e => { const ex = byId[e.id]; return ex ? equipEs(ex.equipment) : ''; }).filter(Boolean))];
  const rows = r.exercises.map((e, i) => {
    const ex = byId[e.id]; if (!ex) return '';
    const sug = suggestionFor(ex, e);
    return '<div class="refwrap">' +
      '<button class="refrow" onclick="openExercise(\'' + ex.id + '\')">' +
      '<span class="accent' + (i < 3 ? ' hot' : '') + '"></span>' +
      '<img src="' + imgUrl(ex) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' +
      '<span class="nm"><b>' + esc(displayName(ex)) + '</b><span>' + equipEs(ex.equipment) + ' · Bilateral</span></span>' +
      '<span class="setpill">' + e.sets + ' x ' + esc(e.reps) + ' · ' + e.rest + ' s</span></button>' +
      '<div class="rowline"><button class="btn ghost sm" onclick="swapInRoutine(\'' + r.id + '\',' + i + ')">Cambiar 🔀</button>' +
      '<span class="small muted">' + esc(sug.text) + '</span></div></div>';
  }).join('');
  const customActions = r.custom
    ? '<div class="row" style="margin-top:14px;"><button class="btn ghost" style="flex:1;" onclick="openCustomEditor(\'' + r.id + '\')">Editar rutina</button>' +
      '<button class="btn ghost" style="flex:1;" onclick="duplicateCustom(\'' + r.id + '\')">Duplicar</button>' +
      '<button class="btn danger" onclick="deleteCustom(\'' + r.id + '\')">Eliminar</button></div>'
    : '<p class="small muted mt" style="text-align:center;">Si cambias un ejercicio de esta rutina, se guarda como una copia tuya para no perder la original.</p>';
  document.getElementById('routine-body').innerHTML =
    '<div class="topbar2"><button class="back" onclick="go(\'train\')" aria-label="Volver">←</button><div class="prog"><i style="width:78%"></i></div></div>' +
    '<div class="rtabs">' + tabs.map(t => '<button class="' + (t.id === id ? 'on' : '') + '" onclick="renderRoutine(\'' + t.id + '\')">' + esc(t.label) + '</button>').join('') + '</div>' +
    '<div class="rhead"><div class="info">' +
      '<h2>' + esc(r.title) + '</h2>' +
      '<div class="stat-line">⏱ <span>' + fmtDuration(r.durationMin) + '</span></div>' +
      '<div class="stat-line">🔥 <span>≈' + r.kcal + ' kcal (estimación)</span></div>' +
      '<div class="stat-line">⚡ <span>' + intensityOf(r) + '</span></div>' +
      '<div class="stat-line" style="margin-top:12px;"><span class="muted">ejercicios</span> <b>' + r.exercises.length + '</b></div>' +
      '<div class="stat-line" style="margin-top:10px;"><span class="muted">' + esc(equipSet.join(' · ') || MODES[r.mode].name) + '</span></div>' +
    '</div><div class="bodymap">' + bodyFigure(false, mus.front, mus.frontSec) + bodyFigure(true, mus.back, mus.backSec) + '</div></div>' +
    '<div style="margin-top:8px;">' + rows + '</div>' +
    (routineSwap && routineSwap.routineId === id ? (function () {
      const cur = r.exercises[routineSwap.idx];
      const ex = cur ? byId[cur.id] : null;
      if (!ex) return '';
      const alts = swapCandidates(ex, r.mode, r.exercises.map(e => e.id));
      return '<div class="card" id="routine-swap" style="margin-top:12px;"><p style="font-weight:700;">Cambiar «' + esc(displayName(ex)) + '» por uno del mismo músculo y equipo:</p>' +
        (alts.length ? alts.map(a => '<button class="ex-row" style="margin-top:8px;" onclick="applyRoutineSwap(\'' + a.id + '\')"><img src="' + imgUrl(a) + '" alt="" loading="lazy"><span><h4>' + esc(displayName(a)) + '</h4><p>' + equipEs(a.equipment) + ' · ' + targetEs(a.target) + '</p></span><span class="go">›</span></button>').join('') : '<p class="muted small mt">No hay otro ejercicio del mismo músculo con el mismo equipo en este modo.</p>') +
        '<button class="btn ghost sm block mt" onclick="routineSwap=null;renderRoutine(\'' + id + '\');">Cancelar</button></div>';
    })() : '') +
    customActions +
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
    items: r.exercises.map(e => {
      const ex = byId[e.id];
      const sug = ex ? suggestionFor(ex, e) : null;
      return {
        id: e.id, sets: sug ? sug.sets : e.sets, reps: e.reps, rest: e.rest,
        suggestion: sug ? sug.text : '',
        checks: Array.from({ length: sug ? sug.sets : e.sets }, () => ({ done: false, reps: sug ? sug.reps : '', weight: sug ? sug.weight : '' }))
      };
    })
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
  const totalFmt = fmtHMS((session.durationMin || 50) * 60);
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
        (it.suggestion ? '<p class="small mt" style="background:var(--card2);border-radius:10px;padding:8px 10px;">📈 ' + esc(it.suggestion) + '</p>' : '') +
        (swapOpen === i ? swapChooserHtml(i) : '') +
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
let swapOpen = null;
function swapCandidates(ex, modeKey, excludeIds) {
  const pool = curatedPool(modeKey).filter(e => e.target === ex.target && e.id !== ex.id && !excludeIds.includes(e.id));
  const cur = new Set(CURATED.map(c => c.id));
  pool.sort((a, b) => ((cur.has(b.id) ? 1 : 0) - (cur.has(a.id) ? 1 : 0)) || (a.id < b.id ? -1 : 1));
  return pool.slice(0, 6);
}
function swapChooserHtml(i) {
  const it = session.items[i];
  const ex = byId[it.id]; if (!ex) return '';
  const alts = swapCandidates(ex, session.mode, session.items.map(x => x.id));
  if (!alts.length) return '<p class="small muted mt">No hay otro ejercicio del mismo músculo con el mismo equipo en este modo.</p>';
  return '<div class="card" style="background:var(--card2);margin-top:10px;"><p class="small" style="font-weight:700;">Toca uno para cambiarlo (mismo músculo, mismo equipo):</p>' +
    alts.map(a => '<button class="ex-row" style="margin-top:8px;" onclick="applySwap(' + i + ',\'' + a.id + '\')">' +
      '<img src="' + imgUrl(a) + '" alt="" loading="lazy"><span><h4>' + esc(displayName(a)) + '</h4><p>' + equipEs(a.equipment) + ' · ' + targetEs(a.target) + '</p></span><span class="go">›</span></button>').join('') +
    '<button class="btn ghost sm block mt" onclick="swapOpen=null;renderSession();">Cancelar</button></div>';
}
function swapExercise(i) {
  swapOpen = swapOpen === i ? null : i;
  renderSession();
}
function applySwap(i, altId) {
  const it = session.items[i];
  const alt = byId[altId]; if (!alt) return;
  const c = curatedMap[altId];
  session.items[i] = Object.assign({}, it, {
    id: altId, sets: (c && c.sets) || it.sets, reps: (c && c.reps) || it.reps,
    suggestion: 'Cambiaste a ' + displayName(alt) + ' en esta sesión. La rutina original no cambia.',
    checks: Array.from({ length: (c && c.sets) || it.sets }, () => ({ done: false, reps: '', weight: '' }))
  });
  swapOpen = null;
  renderSession();
  toast('Cambiado a ' + displayName(alt));
}
/* Cambiar un ejercicio dentro de una rutina (antes de empezar).
   En rutinas propias se cambia en su sitio; en las fijas se crea una copia tuya con el cambio. */
let routineSwap = null;
function swapInRoutine(routineId, idx) {
  const r = findRoutine(routineId);
  if (!r) return;
  routineSwap = { routineId, idx };
  renderRoutine(routineId);
  const el = document.getElementById('routine-swap');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function applyRoutineSwap(altId) {
  if (!routineSwap) return;
  const r = findRoutine(routineSwap.routineId);
  if (!r) return;
  const alt = byId[altId]; if (!alt) return;
  const c = curatedMap[altId];
  const newItem = { id: altId, sets: (c && c.sets) || 3, reps: (c && c.reps) || '10-12', rest: (c && c.rest_seconds) || 60 };
  if (r.custom) {
    const cr = customRoutines.find(x => x.id === r.id);
    cr.exercises[routineSwap.idx] = newItem;
    saveCustomRoutines();
    toast('Ejercicio cambiado en tu rutina');
  } else {
    const copy = {
      id: 'mia-' + Date.now(), title: r.title + ' (mía)', subtitle: 'Copia de ' + r.title + ' con un cambio',
      mode: r.mode, durationMin: r.durationMin, kcal: r.kcal,
      exercises: r.exercises.map((e, i) => i === routineSwap.idx ? newItem : { id: e.id, sets: e.sets, reps: e.reps, rest: e.rest })
    };
    customRoutines.push(copy);
    saveCustomRoutines();
    toast('Guardado como rutina propia: ' + copy.title);
    routineSwap = null;
    openRoutine(copy.id);
    return;
  }
  routineSwap = null;
  renderRoutine(r.id);
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
    exercises: session.items.map(it => {
      const ex = byId[it.id];
      const detail = it.checks.map(c => ({ done: !!c.done, reps: c.reps || '', weight: c.weight || '' }));
      const vol = detail.reduce((n, d) => n + (d.done ? parseNum(d.weight) * (parseInt(d.reps, 10) || 0) : 0), 0);
      const bwVol = detail.reduce((n, d) => n + (d.done && !parseNum(d.weight) ? (parseInt(d.reps, 10) || 0) : 0), 0);
      return {
        id: it.id, sets: it.sets, setsDone: it.checks.filter(c => c.done).length,
        setsDetail: detail, volumeKg: vol, bodyweightReps: bwVol,
        bodyPart: ex ? ex.body_part : '', target: ex ? ex.target : '', equipment: ex ? ex.equipment : ''
      };
    }),
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

/* ---------------- Programa de Leo: Día 1 a Día 14 ---------------- */
function leoDayState(d) { return leoState.days[d] || { done: false, variants: {} }; }
function renderLeo() {
  const el = document.getElementById('leo-body');
  if (!el) return;
  const done = leoDoneDays(), next = leoNextDay();
  const variantRows = LEO.variants.map(v => {
    const ex = byId[v.id];
    return '<button class="ex-row" onclick="openExercise(\'' + v.id + '\')">' +
      '<img src="' + (ex ? imgUrl(ex) : '') + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' +
      '<span><h4>' + esc(v.label) + '</h4><p>' + v.sets + ' series × ' + v.reps + ' reps · descanso ' + v.rest + ' s · de rodillas</p></span><span class="go">›</span></button>';
  }).join('');
  const dayCells = [];
  for (let d = 1; d <= LEO.totalDays; d++) {
    const st = leoDayState(d);
    const n = LEO.variants.filter(v => st.variants && st.variants[v.id]).length;
    dayCells.push('<button class="leo-day' + (st.done ? ' done' : '') + (d === next ? ' next' : '') + '" onclick="leoDayDetail(' + d + ')">' +
      '<b>Día ' + d + '</b><span>' + (st.done ? '✓ hecho' : n + '/3 variantes') + '</span></button>');
  }
  el.innerHTML =
    '<span class="tag">PECHO EN CASA · 14 DÍAS</span>' +
    '<h1 class="display" style="font-size:34px;">Pecho en casa<br><span class="volt">Día 1 a Día 14</span></h1>' +
    '<p class="lead">De flexiones de rodillas a flexiones normales, con el reel de Leo (@84leo_24). <a href="' + LEO.url + '" target="_blank" rel="noopener">Ver el reel en Instagram ↗</a></p>' +
    '<div class="card"><div class="spread"><h3>Tu avance</h3><span class="tag">' + done + '/14 días</span></div>' +
    '<div class="progress" style="margin-top:10px;"><i style="width:' + Math.round(done / 14 * 100) + '%"></i></div>' +
    '<p class="muted small mt">' + (next ? 'Te toca el día ' + next + '. Haz las 3 variantes de abajo y marca cada una al terminarla.' : '¡Completaste los 14 días! Ahora prueba las flexiones normales.') + '</p>' +
    (next ? '<button class="btn block big mt" onclick="startLeoDay(' + next + ')">Empezar el día ' + next + ' →</button>'
      : '<button class="btn block big mt" onclick="startSingle(\'0662\')">Probar flexiones normales →</button>') + '</div>' +
    '<h2 class="sec">Las 3 variantes (cada día)</h2>' +
    '<p class="small muted">Series y reps exactas del reel. El reel no detalla reps por día, así que cada día repites las mismas 3 variantes: lo que crece es tu constancia, día a día.</p>' +
    variantRows +
    '<h2 class="sec">Marca tus días</h2>' +
    '<div class="leo-grid">' + dayCells.join('') + '</div>' +
    '<div id="leo-day-detail"></div>' +
    '<div class="card"><h3>¿Y después del día 14?</h3><p class="muted small mt">Si completaste los 14 días haciendo las 3 variantes, prueba las flexiones normales (sin rodillas). Empieza con 3 series de las reps que puedas con buena técnica y usa la progresión automática de la app para seguir subiendo.</p></div>' +
    '<button class="btn ghost block" onclick="if(confirm(\'¿Empezar el programa de Leo desde cero? Se borran los días marcados.\')){leoState={startDate:null,days:{}};leoSave();renderLeo();renderHome();}">Reiniciar el programa</button>';
}
function leoDayDetail(d) {
  const st = leoDayState(d);
  const el = document.getElementById('leo-day-detail');
  if (!el) return;
  el.innerHTML = '<div class="card" style="margin-top:12px;"><div class="spread"><h3>Día ' + d + '</h3>' +
    '<span class="tag">' + (st.done ? 'HECHO ✓' : 'PENDIENTE') + '</span></div>' +
    LEO.variants.map(v => {
      const on = st.variants && st.variants[v.id];
      return '<button class="ex-row" style="margin-top:8px;" onclick="toggleLeoVariant(' + d + ',\'' + v.id + '\')">' +
        '<span class="check ' + (on ? 'done' : '') + '" style="width:34px;height:34px;flex:none;border-radius:50%;border:2px solid var(--border);display:grid;place-items:center;font-size:17px;">' + (on ? '✓' : '') + '</span>' +
        '<span><h4>' + esc(v.label) + '</h4><p>' + v.sets + ' × ' + v.reps + ' reps</p></span></button>';
    }).join('') +
    '<button class="btn block mt" onclick="startLeoDay(' + d + ')">Entrenar este día →</button></div>';
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function toggleLeoVariant(d, vid) {
  if (!leoState.days[d]) leoState.days[d] = { done: false, variants: {} };
  const v = leoState.days[d].variants;
  v[vid] = !v[vid];
  leoState.days[d].done = LEO.variants.every(x => v[x.id]);
  if (leoState.days[d].done) leoState.days[d].date = new Date().toISOString().slice(0, 10);
  if (!leoState.startDate) leoState.startDate = new Date().toISOString().slice(0, 10);
  leoSave();
  renderLeo(); leoDayDetail(d); renderHome();
}
function startLeoDay(d) {
  if (!leoState.startDate) { leoState.startDate = new Date().toISOString().slice(0, 10); leoSave(); }
  startSession({
    id: 'leo-dia-' + d, title: 'Pecho en casa — Día ' + d + ' (Leo)', subtitle: 'Flexiones de rodillas · 3 variantes',
    tag: 'LEO', durationMin: 20, kcal: 120, level: 'Principiante',
    exercises: LEO.variants.map(v => ({ id: v.id, sets: v.sets, reps: v.reps, rest: v.rest }))
  });
}

/* ---------------- Estadísticas completas ---------------- */
function weekStartKey(date) {
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}
function computeStats() {
  const now = new Date();
  const volByWeek = [];
  for (let w = 5; w >= 0; w--) {
    const start = new Date(now); start.setDate(now.getDate() - (w * 7 + ((now.getDay() + 6) % 7)));
    const key = weekStartKey(start);
    const label = start.toISOString().slice(5, 10);
    let kg = 0, n = 0;
    sessions.forEach(s => {
      if (weekStartKey(s.date) === key) {
        n++;
        (s.exercises || []).forEach(e => { kg += e.volumeKg || 0; });
      }
    });
    volByWeek.push({ label, kg: Math.round(kg), n });
  }
  const since = new Date(now); since.setDate(now.getDate() - 28);
  const volByMuscle = {};
  sessions.forEach(s => {
    if (new Date(s.date) < since) return;
    (s.exercises || []).forEach(e => {
      const k = targetEs(e.target || '') || 'Otro';
      volByMuscle[k] = (volByMuscle[k] || 0) + (e.volumeKg || 0);
    });
  });
  const muscleList = Object.keys(volByMuscle).map(k => ({ name: k, kg: Math.round(volByMuscle[k]) })).sort((a, b) => b.kg - a.kg);
  const perEx = {};
  sessions.forEach(s => {
    (s.exercises || []).forEach(e => {
      const ex = byId[e.id]; if (!ex) return;
      const p = perEx[e.id] || (perEx[e.id] = { id: e.id, name: displayName(ex), count: 0, bestWeight: 0, bestWeightReps: 0, bestVol: 0, bestReps: 0, last: '' });
      p.count++;
      p.last = s.date;
      (e.setsDetail || []).forEach(d => {
        if (!d.done) return;
        const w = parseNum(d.weight), r = parseInt(d.reps, 10) || 0;
        if (w > p.bestWeight) { p.bestWeight = w; p.bestWeightReps = r; }
        if (!w && r > p.bestReps) p.bestReps = r;
      });
      if ((e.volumeKg || 0) > p.bestVol) p.bestVol = Math.round(e.volumeKg || 0);
    });
  });
  const records = Object.values(perEx).sort((a, b) => b.count - a.count).slice(0, 12);
  const st = weekStats();
  const firstW = weights[0], lastW = weights[weights.length - 1];
  const firstWaist = measuresHistory.length ? measuresHistory[0].waist : null;
  const lastWaist = measuresHistory.length ? measuresHistory[measuresHistory.length - 1].waist : null;
  return { volByWeek, muscleList, records, streak: st.streak, sessionsTotal: sessions.length, firstW, lastW, firstWaist, lastWaist };
}
function renderStats() {
  const el = document.getElementById('stats-body');
  if (!el) return;
  const s = computeStats();
  const maxW = Math.max(1, ...s.volByWeek.map(w => w.kg));
  const maxM = Math.max(1, ...s.muscleList.map(m => m.kg));
  const wChange = (s.firstW && s.lastW) ? (s.lastW.weight - s.firstW.weight) : null;
  const waistChange = (s.firstWaist && s.lastWaist) ? (parseFloat(s.lastWaist) - parseFloat(s.firstWaist)) : null;
  el.innerHTML =
    '<h1 class="display" style="font-size:34px;">Tus<br><span class="volt">números.</span></h1>' +
    '<p class="lead">Todo gratis, sin límite de meses. Las calorías son una estimación; el volumen y los récords salen de lo que registras en cada sesión.</p>' +
    '<div class="stat-grid">' +
    '<div class="stat"><b class="volt">' + s.sessionsTotal + '</b><span>sesiones</span></div>' +
    '<div class="stat"><b>' + s.streak + '</b><span>días seguidos</span></div>' +
    '<div class="stat"><b>' + (s.lastW ? s.lastW.weight.toFixed(1) : '—') + '</b><span>kg actual</span></div></div>' +
    '<h2 class="sec">Volumen por semana</h2>' +
    '<div class="card"><p class="small muted">Kilos movidos en series con peso (peso corporal no suma kilos aquí; sus reps están en los récords).</p>' +
    '<div class="bars" style="margin-top:10px;">' + s.volByWeek.map(w =>
      '<div class="bar-col"><b>' + (w.kg ? (w.kg >= 1000 ? (w.kg / 1000).toFixed(1) + 't' : w.kg) : '—') + '</b><i class="' + (w.kg ? 'hot' : '') + '" style="height:' + Math.max(4, w.kg / maxW * 72) + 'px"></i><span>' + w.label + '</span></div>').join('') + '</div>' +
    '<p class="small muted mt">' + s.volByWeek.map(w => w.n + ' sesiones').join(' · ') + ' en las últimas 6 semanas.</p></div>' +
    '<h2 class="sec">Volumen por músculo · últimos 28 días</h2>' +
    '<div class="card">' + (s.muscleList.length
      ? s.muscleList.map(m => '<div style="margin-bottom:10px;"><div class="spread"><span style="font-size:13px;">' + esc(m.name) + '</span><b style="font-size:13px;">' + m.kg.toLocaleString('es-MX') + ' kg</b></div><div class="progress" style="margin:6px 0 0;"><i style="width:' + Math.max(3, Math.round(m.kg / maxM * 100)) + '%"></i></div></div>').join('')
      : '<p class="muted small">Aún no hay volumen registrado con peso en los últimos 28 días. Completa una sesión marcando peso y reps.</p>') +
    '<p class="small muted mt">Si un músculo queda muy atrás respecto a los demás, la próxima semana dale una serie más.</p></div>' +
    '<h2 class="sec">Peso y cintura</h2>' +
    '<div class="card"><p style="font-size:14px;">Peso: <b>' + (s.firstW ? s.firstW.weight.toFixed(1) + ' kg (' + s.firstW.date + ')' : '—') + ' → ' + (s.lastW ? s.lastW.weight.toFixed(1) + ' kg' : '—') + '</b>' +
    (wChange === null ? '' : ' · cambio <b>' + (wChange > 0 ? '+' : '') + wChange.toFixed(1) + ' kg</b>') + '</p>' +
    '<p style="font-size:14px;margin-top:8px;">Cintura: <b>' + (s.firstWaist ? s.firstWaist + ' cm' : '—') + ' → ' + (s.lastWaist ? s.lastWaist + ' cm' : '—') + '</b>' +
    (waistChange === null ? '' : ' · cambio <b>' + (waistChange > 0 ? '+' : '') + waistChange.toFixed(1) + ' cm</b>') + '</p>' +
    '<p class="small muted mt">En recomposición la cintura importa tanto como el peso: si la cintura baja aunque el peso no se mueva, estás ganando.</p>' +
    '<button class="btn ghost block mt" onclick="go(\'measure\')">Ir a Medir →</button></div>' +
    '<h2 class="sec">Tus récords</h2>' +
    '<div class="card">' + (s.records.length
      ? s.records.map(r => '<div style="padding:10px 0;border-bottom:1px solid var(--border);"><div class="spread"><b style="font-size:14px;">' + esc(r.name) + '</b><span class="small muted">' + r.count + (r.count === 1 ? ' sesión' : ' sesiones') + '</span></div>' +
        '<p class="small muted" style="margin-top:4px;">' +
        (r.bestWeight > 0 ? 'Peso máx.: <b style="color:#fff;">' + r.bestWeight + ' kg × ' + r.bestWeightReps + ' reps</b> · ' : '') +
        (r.bestReps > 0 ? 'Más reps sin peso: <b style="color:#fff;">' + r.bestReps + '</b> · ' : '') +
        (r.bestVol > 0 ? 'Volumen máx. en una sesión: <b style="color:#fff;">' + r.bestVol + ' kg</b>' : 'Sin peso registrado todavía') +
        '</p></div>').join('')
      : '<p class="muted small">Sin récords todavía. Completa tu primera sesión y aquí aparecerán tus marcas por ejercicio.</p>') + '</div>';
}

/* ---------------- Rutinas propias ---------------- */
let editorState = null;
function openCustomEditor(id) {
  if (id) {
    const c = customRoutines.find(x => x.id === id);
    if (!c) return;
    editorState = { id: c.id, title: c.title, mode: c.mode, exercises: c.exercises.map(e => ({ id: e.id, sets: e.sets, reps: e.reps, rest: e.rest })), q: '' };
  } else {
    editorState = { id: null, title: '', mode: mode, exercises: [], q: '' };
  }
  go('custom');
}
function renderCustomEditor() {
  const el = document.getElementById('custom-body');
  if (!el || !editorState) return;
  const q = (editorState.q || '').trim().toLowerCase();
  const pool = CURATED.map(c => byId[c.id]).filter(Boolean).filter(e => {
    if (editorState.mode === 'casa' && !['body weight', 'dumbbell'].includes(e.equipment)) return false;
    if (editorState.mode === 'calistenia' && e.equipment !== 'body weight') return false;
    if (q && !(displayName(e).toLowerCase().includes(q) || e.name.toLowerCase().includes(q) || targetEs(e.target).toLowerCase().includes(q))) return false;
    return true;
  }).slice(0, 12);
  el.innerHTML =
    '<h1 class="display" style="font-size:34px;">' + (editorState.id ? 'Editar' : 'Crear') + '<br><span class="volt">mi rutina.</span></h1>' +
    '<p class="lead">Sin límite de rutinas. Se guarda solo en tu teléfono.</p>' +
    '<div class="card"><div class="field"><label>Nombre de la rutina</label>' +
    '<input type="text" id="ce-title" placeholder="Ejemplo: Pecho y brazos en casa" value="' + esc(editorState.title) + '"></div>' +
    '<div class="field"><label>Modo</label><div class="seg">' + Object.keys(MODES).map(k =>
      '<button type="button" class="' + (editorState.mode === k ? 'on' : '') + '" onclick="editorState.mode=\'' + k + '\';renderCustomEditor();">' + MODES[k].icon + ' ' + MODES[k].name + '</button>').join('') + '</div></div></div>' +
    '<h2 class="sec">Ejercicios (' + editorState.exercises.length + ')</h2>' +
    (editorState.exercises.length ? editorState.exercises.map((e, i) => {
      const ex = byId[e.id]; if (!ex) return '';
      return '<div class="card"><div class="spread"><b style="font-size:14px;">' + esc(displayName(ex)) + '</b>' +
        '<button class="btn ghost sm" onclick="customRemoveEx(' + i + ')">Quitar</button></div>' +
        '<div class="row mt"><label class="small muted" style="flex:1;">Series <input type="number" min="1" max="8" value="' + e.sets + '" style="width:56px;background:var(--surface);border:1px solid var(--border);color:var(--text);border-radius:10px;padding:7px;text-align:center;" onchange="customSetField(' + i + ',\'sets\',this.value)"></label>' +
        '<label class="small muted" style="flex:1;">Reps <input type="text" value="' + esc(e.reps) + '" style="width:64px;background:var(--surface);border:1px solid var(--border);color:var(--text);border-radius:10px;padding:7px;text-align:center;" onchange="customSetField(' + i + ',\'reps\',this.value)"></label>' +
        '<label class="small muted" style="flex:1;">Descanso (s) <input type="number" min="15" max="300" step="15" value="' + e.rest + '" style="width:64px;background:var(--surface);border:1px solid var(--border);color:var(--text);border-radius:10px;padding:7px;text-align:center;" onchange="customSetField(' + i + ',\'rest\',this.value)"></label></div></div>';
    }).join('') : '<p class="muted small">Aún no tiene ejercicios. Añade uno de la lista de abajo.</p>') +
    '<h2 class="sec">Añadir ejercicio</h2>' +
    '<div class="searchbar"><input type="search" placeholder="Buscar: flexiones, remo, sentadilla…" value="' + esc(editorState.q || '') + '" oninput="editorState.q=this.value;renderCustomEditor();const i=document.querySelector(\'#custom-body input[type=search]\');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}"></div>' +
    pool.map(ex => '<button class="ex-row" onclick="customAddEx(\'' + ex.id + '\')"><img src="' + imgUrl(ex) + '" alt="" loading="lazy"><span><h4>' + esc(displayName(ex)) + '</h4><p>' + bodyEs(ex.body_part) + ' · ' + targetEs(ex.target) + ' · ' + equipEs(ex.equipment) + '</p></span><span class="go">+</span></button>').join('') +
    '<button class="btn block big mt" onclick="customSave()">Guardar rutina</button>';
}
function customAddEx(id) {
  const ex = byId[id]; if (!ex) return;
  const c = curatedMap[id];
  editorState.exercises.push({ id, sets: (c && c.sets) || 3, reps: (c && c.reps) || '10-12', rest: (c && c.rest_seconds) || 60 });
  editorState.q = '';
  renderCustomEditor();
  toast(displayName(ex) + ' añadido');
}
function customRemoveEx(i) { editorState.exercises.splice(i, 1); renderCustomEditor(); }
function customSetField(i, f, v) {
  if (f === 'sets' || f === 'rest') editorState.exercises[i][f] = Math.max(1, parseInt(v, 10) || 3);
  else editorState.exercises[i][f] = String(v || '10-12');
}
function customSave() {
  const titleEl = document.getElementById('ce-title');
  const title = (titleEl ? titleEl.value : editorState.title).trim();
  if (!title) { toast('Ponle un nombre a tu rutina'); return; }
  if (!editorState.exercises.length) { toast('Añade al menos un ejercicio'); return; }
  const data = { id: editorState.id || ('mia-' + Date.now()), title, mode: editorState.mode, durationMin: 45, kcal: 300, exercises: editorState.exercises };
  const idx = customRoutines.findIndex(x => x.id === data.id);
  if (idx >= 0) customRoutines[idx] = data; else customRoutines.push(data);
  saveCustomRoutines();
  editorState = null;
  toast('Rutina guardada: ' + title);
  go('train');
}
function duplicateCustom(id) {
  const c = customRoutines.find(x => x.id === id);
  if (!c) return;
  const copy = JSON.parse(JSON.stringify(c));
  copy.id = 'mia-' + Date.now();
  copy.title = c.title + ' (copia)';
  customRoutines.push(copy);
  saveCustomRoutines();
  renderTrain();
  toast('Duplicada: ' + copy.title);
}
function deleteCustom(id) {
  const c = customRoutines.find(x => x.id === id);
  if (!c) return;
  if (!confirm('¿Eliminar «' + c.title + '»? No se puede deshacer.')) return;
  customRoutines = customRoutines.filter(x => x.id !== id);
  saveCustomRoutines();
  if (currentView === 'routine') go('train'); else renderTrain();
  toast('Rutina eliminada');
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
    measureFigure() +
    MEASURE_FIELDS.map((f, idx) => '<button class="dot" style="top:' + f.top + ';left:' + f.left + '" onclick="focusMeasure(\'' + f.key + '\')" title="' + f.label + '">' + (idx + 1) + '</button>').join('');
  document.getElementById('measure-fields').innerHTML = MEASURE_FIELDS.map((f, idx) =>
    '<div class="field"><label>' + (idx + 1) + '. ' + f.label + ' (cm)</label><input id="m-' + f.key + '" type="number" step="0.5" placeholder="—" value="' + (measures && measures[f.key] ? esc(measures[f.key]) : '') + '"></div>').join('');
  document.getElementById('measures-saved').textContent = measures
    ? 'Últimas medidas guardadas: ' + (measures.date || '') + ' · ' + MEASURE_FIELDS.filter(f => measures[f.key]).map(f => f.label.toLowerCase() + ' ' + measures[f.key] + ' cm').join(' · ') + '.'
    : '';
  const waistEl = document.getElementById('waist-evolution');
  if (waistEl) {
    const hist = measuresHistory.filter(m => m.waist);
    if (!hist.length) {
      waistEl.innerHTML = '<p class="muted small">Aún no hay medidas de cintura guardadas. Anota tu cintura arriba (punto 3 de la figura) y aquí verás cómo cambia con el tiempo. En recomposición, que baje la cintura aunque el peso no se mueva es progreso real.</p>';
    } else {
      const vals = hist.map(m => parseFloat(m.waist));
      const min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
      const span = Math.max(1, max - min);
      const change = vals.length > 1 ? (vals[vals.length - 1] - vals[0]) : 0;
      waistEl.innerHTML = '<div class="bars">' + hist.slice(-10).map(m =>
        '<div class="bar-col"><b>' + m.waist + '</b><i class="hot" style="height:' + Math.max(8, 14 + (parseFloat(m.waist) - min) / span * 58) + 'px"></i><span>' + esc((m.date || '').slice(5, 10)) + '</span></div>').join('') + '</div>' +
        '<p class="small muted mt">Cintura: <b style="color:#fff;">' + vals[0] + ' cm → ' + vals[vals.length - 1] + ' cm</b>' +
        (vals.length > 1 ? ' · cambio <b style="color:#fff;">' + (change > 0 ? '+' : '') + change.toFixed(1) + ' cm</b>' : ' · anota otra medida en unas semanas para ver el cambio') + '</p>';
    }
  }
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
  measuresHistory = measuresHistory.filter(m => m.date !== data.date);
  measuresHistory.push(data);
  measuresHistory.sort((a, b) => (a.date < b.date ? -1 : 1));
  LS.set('measuresHistory', measuresHistory);
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
