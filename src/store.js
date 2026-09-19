// Capa de estado: localStorage + repetición espaciada simplificada +
// armado de la rutina diaria. Sin backend por ahora (ver README/DECISIONES).

import { buildSeedExercises, computeGroupDurationMin } from './data.js';
import { todayISO, uid } from './util.js';
import { ARTICULACIONES_ARPEGIO_MENOR, GRUPO_ARPEGIOS_MENORES } from './theory.js';

// Decisión (ver DECISIONES.md punto 14): el modelo de datos cambió de raíz
// (tonalidades[] → pasos[]) y se eliminó el catálogo de ejemplo. Se bumpean
// las claves de localStorage a ":v2" para que datos viejos con la forma
// anterior (si alguien ya había cargado algo con el prototipo previo) queden
// simplemente huérfanos e inofensivos en vez de romper la app al leerlos con
// el nuevo código. El perfil y el progreso (calificaciones) sí se conservan
// tal cual: son independientes de la forma del ejercicio y, si apuntan a un
// id que ya no existe, simplemente no se muestran en ningún lado.
const KEYS = {
  profile: 'fuelle:profile',
  progress: 'fuelle:progress',
  custom: 'fuelle:customExercises:v2',
  images: 'fuelle:customImages:v2',
  audios: 'fuelle:customAudios:v2',
  today: 'fuelle:todayState:v2',
  audioSettings: 'fuelle:audioSettings',
  annotations: 'fuelle:annotations:v1',
  appTime: 'fuelle:appTimeMs',
  practiceDays: 'fuelle:practiceDays',
  sessionTimer: 'fuelle:sessionTimer',
};

// Prefijo común de TODAS las claves de la app en localStorage — incluye las
// de KEYS de arriba, pero también otras que viven fuera de este archivo con
// nombre dinámico (`fuelle:playerSettings:v2:<id>` en player.js, una por
// ejercicio) o directamente en otra pantalla (`fuelle:timeBudget` en
// today.js). Ver DECISIONES.md ronda 7, punto 37 (respaldo/restauración):
// el export de respaldo recorre TODO lo que empiece con este prefijo en vez
// de listar claves a mano, así no hace falta acordarse de actualizarlo cada
// vez que se agrega una clave nueva en cualquier otro archivo.
const APP_PREFIX = 'fuelle:';
const LAST_BACKUP_KEY = 'fuelle:lastBackupAt';
const BACKUP_FORMAT_VERSION = 1;

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('No se pudo leer', key, e);
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('No se pudo guardar', key, e);
  }
}

const SEED_EXERCISES = buildSeedExercises(); // ver DECISIONES.md punto 16: siempre []

// ---------- Perfil ----------

export function getProfile() {
  return readJSON(KEYS.profile, { nivel: 'intermedio', instagram: '', temaOscuro: false });
}

export function setNivel(nivel) {
  const profile = getProfile();
  profile.nivel = nivel;
  writeJSON(KEYS.profile, profile);
}

// Instagram opcional del usuario (ver DECISIONES.md punto 69, pestaña
// Comunidad): se guarda junto con el resto del perfil, no en una clave
// aparte — es un solo dato más de "quién sos vos", igual que el nivel.
export function setInstagram(handle) {
  const profile = getProfile();
  profile.instagram = (handle || '').trim();
  writeJSON(KEYS.profile, profile);
}

// ---------- Tema oscuro en toda la app (ver DECISIONES.md punto 72) ----------
// Por defecto solo Práctica es oscura (ver punto 70, `body.is-player`); esta
// preferencia extiende el mismo tema oscuro al resto de las pantallas
// también, agregando/sacando la clase `tema-oscuro-global` en <body> (ver
// `applyTheme`, la misma clase que en `styles.css` dispara la redefinición
// de variables ya usada por `body.is-player`).
export function setTemaOscuro(value) {
  const profile = getProfile();
  profile.temaOscuro = !!value;
  writeJSON(KEYS.profile, profile);
  applyTheme();
}

/**
 * Refleja la preferencia guardada en el DOM — hay que llamarla al arrancar
 * la app (una vez) y cada vez que cambia (ver `setTemaOscuro`, que ya la
 * llama sola). No hace falta llamarla en cada navegación: a diferencia de
 * `body.is-player` (que `player.js` agrega/saca al entrar/salir de esa
 * pantalla puntual), esta clase es una preferencia estable que no cambia
 * sola entre pantallas.
 */
export function applyTheme() {
  document.body.classList.toggle('tema-oscuro-global', !!getProfile().temaOscuro);
}

// ---------- Modo administrador (ver DECISIONES.md punto 82) ----------
// Muestra u oculta lo que es solo de quien carga contenido (pestaña "Nuevo",
// botón de editar en Bandoteca). Es una preferencia de PRESENTACIÓN, no
// seguridad: cualquiera puede activarla desde las herramientas del navegador.
// Antes de publicar la app a otras personas, cambiar `ADMIN_POR_DEFECTO` a
// `false` para que una instalación nueva arranque en vista de usuario.
const ADMIN_POR_DEFECTO = true;

export function isAdmin() {
  const profile = getProfile();
  return profile.admin === undefined ? ADMIN_POR_DEFECTO : !!profile.admin;
}

export function setAdmin(value) {
  const profile = getProfile();
  profile.admin = !!value;
  writeJSON(KEYS.profile, profile);
  applyAdminMode();
}

export function applyAdminMode() {
  document.body.classList.toggle('modo-usuario', !isAdmin());
}

// ---------- Tiempo total en la app (ver DECISIONES.md punto 69) ----------
// Acumulado en milisegundos mientras la app está VISIBLE (ver `app.js`,
// donde se mide) — es la métrica que ordena el ranking de la pestaña
// Comunidad ("tiempo en la app", pedido explícito del usuario).

export function getAppTimeMs() {
  return readJSON(KEYS.appTime, 0);
}

export function addAppTimeMs(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return;
  writeJSON(KEYS.appTime, getAppTimeMs() + ms);
}

// ---------- Racha semanal (ver DECISIONES.md punto 75) ----------
// Un día cuenta como "cumplido" si se terminó al menos un ejercicio ese día
// (ver `finishExercise()` en player.js, que llama `recordPracticeDay()` en
// cada "Terminar" o avance automático de fin de ejercicio). Semana FIJA
// lunes a domingo — no una ventana de "últimos 7 días" que se corre sola —
// pedido explícito del usuario: "que sean solo 7 días", la semana
// calendario de siempre, sin acumular historial más largo ni una racha
// consecutiva entre semanas.

export function recordPracticeDay() {
  const days = readJSON(KEYS.practiceDays, []);
  const iso = todayISO();
  if (!days.includes(iso)) {
    days.push(iso);
    writeJSON(KEYS.practiceDays, days);
  }
}

/**
 * Arma los 7 días de la semana calendario actual (lunes a domingo) marcando
 * cuáles están cumplidos. Devuelve `{ week: [{date, done, isToday}], completedCount }`.
 */
export function getWeekStreak() {
  const doneSet = new Set(readJSON(KEYS.practiceDays, []));
  const now = new Date();
  const dow = now.getDay(); // 0=domingo .. 6=sábado
  const mondayOffset = dow === 0 ? -6 : 1 - dow; // días desde hoy hasta el lunes de ESTA semana
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
  const todayIso = todayISO();

  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    week.push({ date: iso, done: doneSet.has(iso), isToday: iso === todayIso });
  }
  return { week, completedCount: week.filter((d) => d.done).length };
}

// ---------- Temporizador de sesión en "Hoy" (ver DECISIONES.md punto 76) ----------
// Pedido del usuario: cada botón de tiempo disponible (15/30/45) dispara una
// cuenta atrás real, no solo fija el "presupuesto" que ya usaba el algoritmo
// de armado de rutina (eso se sigue haciendo igual, en paralelo). Se guarda
// como un `endAt` (timestamp absoluto) en vez de ir descontando segundos a
// mano: así el conteo sigue siendo exacto sin importar cuánto tiempo estuvo
// la pantalla sin repintarse (ej. el usuario se fue a practicar un ejercicio
// y volvió más tarde) — no hace falta ningún `setInterval` que sobreviva a
// la navegación entre pantallas, alcanza con recalcular `endAt - Date.now()`
// cada vez que hace falta mostrar el valor. Al pausar se congela en
// `pausedRemainingMs` (con `endAt` en null) en vez de seguir corriendo.

export function startSessionTimer(totalMin) {
  writeJSON(KEYS.sessionTimer, { totalMin, endAt: Date.now() + totalMin * 60000, pausedRemainingMs: null });
}

export function pauseSessionTimer() {
  const t = readJSON(KEYS.sessionTimer, null);
  if (!t || t.endAt == null) return; // ya pausado, o no hay timer
  const remaining = Math.max(0, t.endAt - Date.now());
  writeJSON(KEYS.sessionTimer, { ...t, endAt: null, pausedRemainingMs: remaining });
}

export function resumeSessionTimer() {
  const t = readJSON(KEYS.sessionTimer, null);
  if (!t || t.pausedRemainingMs == null) return; // no está pausado
  writeJSON(KEYS.sessionTimer, { ...t, endAt: Date.now() + t.pausedRemainingMs, pausedRemainingMs: null });
}

export function resetSessionTimer() {
  localStorage.removeItem(KEYS.sessionTimer);
}

/**
 * Estado actual del temporizador, ya con el tiempo restante calculado (en
 * ms) — `null` si no hay ninguno arrancado. `remainingMs` llega a 0 solo
 * cuando de verdad se cumplió el tiempo (nunca negativo).
 */
export function getSessionTimer() {
  const t = readJSON(KEYS.sessionTimer, null);
  if (!t) return null;
  const remainingMs = t.pausedRemainingMs != null ? t.pausedRemainingMs : Math.max(0, t.endAt - Date.now());
  return { totalMin: t.totalMin, paused: t.pausedRemainingMs != null, remainingMs, done: remainingMs <= 0 };
}

// ---------- Catálogo de ejercicios (seed + personalizados) ----------

export function getCustomExercises() {
  return readJSON(KEYS.custom, []);
}

function saveCustomExercises(list) {
  writeJSON(KEYS.custom, list);
}

export function saveCustomExercise(exercise) {
  const list = getCustomExercises();
  list.push(exercise);
  saveCustomExercises(list);
  return exercise;
}

export function updateCustomExercise(exercise) {
  const list = getCustomExercises();
  const idx = list.findIndex((e) => e.id === exercise.id);
  if (idx === -1) return null;
  list[idx] = exercise;
  saveCustomExercises(list);
  return exercise;
}

export function getAllExercises() {
  return [...SEED_EXERCISES, ...getCustomExercises()];
}

/**
 * Borra un ejercicio propio y todo lo que le pertenece únicamente a él:
 * sus imágenes y audios (los del ejercicio mismo si es tipo "fuelle", y los
 * de cada paso si es escala/arpegio), su progreso guardado y sus
 * preferencias de reproductor (`fuelle:playerSettings:v2:<id>`, clave
 * aparte por ejercicio, no vive en KEYS). Ver DECISIONES.md punto 60.
 * Devuelve el ejercicio borrado (o `null` si no existía, ej. ya se había
 * borrado desde otra pestaña).
 */
export function deleteCustomExercise(exerciseId) {
  const list = getCustomExercises();
  const exercise = list.find((e) => e.id === exerciseId) || null;
  saveCustomExercises(list.filter((e) => e.id !== exerciseId));

  const idsToClean = [exerciseId, ...((exercise && exercise.pasos) || []).map((p) => p.id)];
  const images = getCustomImages();
  const audios = getCustomAudios();
  const annotations = readJSON(KEYS.annotations, {});
  let imagesChanged = false;
  let audiosChanged = false;
  let annotationsChanged = false;
  idsToClean.forEach((id) => {
    if (id in images) { delete images[id]; imagesChanged = true; }
    if (id in audios) { delete audios[id]; audiosChanged = true; }
    if (id in annotations) { delete annotations[id]; annotationsChanged = true; }
  });
  if (imagesChanged) writeJSON(KEYS.images, images);
  if (audiosChanged) writeJSON(KEYS.audios, audios);
  if (annotationsChanged) writeJSON(KEYS.annotations, annotations);

  const progress = getProgress();
  if (exerciseId in progress) {
    delete progress[exerciseId];
    saveProgress(progress);
  }
  localStorage.removeItem(`fuelle:playerSettings:v2:${exerciseId}`);

  return exercise;
}

export function getExerciseById(id) {
  return getAllExercises().find((e) => e.id === id) || null;
}

// ---------- Imágenes cargadas por el usuario (por paso o ejercicio) ----------

export function getCustomImages() {
  return readJSON(KEYS.images, {});
}

export function setCustomImage(entryId, dataUrl) {
  const map = getCustomImages();
  map[entryId] = dataUrl;
  writeJSON(KEYS.images, map);
}

export function getImageFor(entryId) {
  const map = getCustomImages();
  return map[entryId] || null;
}

// ---------- Audios de demostración por paso, uno por velocidad de metrónomo ----------
// Ver DECISIONES.md punto 20. Estructura: { [pasoId]: { 40: dataUrl|null, 60: ..., 80: ... } }

export function getCustomAudios() {
  return readJSON(KEYS.audios, {});
}

export function setCustomAudio(pasoId, bpm, dataUrl) {
  const map = getCustomAudios();
  if (!map[pasoId]) map[pasoId] = {};
  map[pasoId][bpm] = dataUrl;
  writeJSON(KEYS.audios, map);
}

// ---------- Anotaciones a mano sobre la partitura, por paso (ver DECISIONES.md punto 67) ----------
// Estructura: { [pasoId]: [ { tool, color, points: [[xFrac,yFrac], ...] }, ... ] } — cada paso
// tiene su propia lista de trazos, independiente de la imagen (que nunca se modifica). Vive bajo
// el prefijo `fuelle:` como todo lo demás, así queda incluida sola en el respaldo/restauración
// (ver `buildBackup`/`restoreBackup` más abajo) sin necesidad de tocar ese código.
export function getAnnotationsFor(pasoId) {
  const map = readJSON(KEYS.annotations, {});
  return map[pasoId] || [];
}

export function setAnnotationsFor(pasoId, strokes) {
  const map = readJSON(KEYS.annotations, {});
  if (strokes && strokes.length > 0) map[pasoId] = strokes;
  else delete map[pasoId];
  writeJSON(KEYS.annotations, map);
}

export function removeCustomAudio(pasoId, bpm) {
  const map = getCustomAudios();
  if (map[pasoId]) {
    delete map[pasoId][bpm];
    writeJSON(KEYS.audios, map);
  }
}

export function getAudioFor(pasoId, bpm) {
  const map = getCustomAudios();
  return (map[pasoId] && map[pasoId][bpm]) || null;
}

// ---------- Volumen de metrónomo y de audio de demostración ----------
// Ver DECISIONES.md punto 25: son ajustes GLOBALES (no por ejercicio), porque
// son una preferencia personal de escucha ("no quiero que el click tape el
// audio de referencia") que tiene sentido mantener igual entre ejercicios.

export function getAudioSettings() {
  return { metronomeVolume: 0.8, demoVolume: 1, ...readJSON(KEYS.audioSettings, {}) };
}

export function setAudioSettings(partial) {
  const merged = { ...getAudioSettings(), ...partial };
  writeJSON(KEYS.audioSettings, merged);
  return merged;
}

// ---------- Progreso / repetición espaciada ----------

// Ver DECISIONES.md punto 68: `player.js` ya NO le pregunta al usuario "cómo
// te salió" (se sacó esa hoja, pedido explícito) — `recordRating` se sigue
// llamando así y sigue aceptando 'costo'/'normal'/'bien' por compatibilidad
// (un respaldo restaurado de antes de este cambio puede traer progreso con
// esos tres valores), pero desde ahora SIEMPRE se la llama con 'normal'. El
// intervalo sigue creciendo igual que antes con cada práctica, solo que ya
// no distingue dificultad — es pura repetición espaciada por antigüedad.
export function getProgress() {
  return readJSON(KEYS.progress, {});
}

function saveProgress(progress) {
  writeJSON(KEYS.progress, progress);
}

function nextInterval(prevIntervalDays, rating) {
  const prev = prevIntervalDays || 2;
  if (rating === 'costo') return 1;
  if (rating === 'normal') return Math.max(2, Math.round(prev * 1.6));
  if (rating === 'bien') return Math.max(3, Math.round(prev * 2.3));
  return 2;
}

export function recordRating(exerciseId, rating) {
  const progress = getProgress();
  const prev = progress[exerciseId];
  const intervalDays = nextInterval(prev?.intervalDays, rating);
  const now = new Date();
  const due = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  progress[exerciseId] = {
    rating,
    lastPracticedAt: now.toISOString(),
    intervalDays,
    dueAt: due.toISOString(),
    timesPracticed: (prev?.timesPracticed || 0) + 1,
  };
  saveProgress(progress);
  return progress[exerciseId];
}

function priorityScore(exerciseId, progress, now) {
  const entry = progress[exerciseId];
  if (!entry) return Number.POSITIVE_INFINITY; // nunca practicado: máxima prioridad
  const due = new Date(entry.dueAt).getTime();
  return now - due; // más vencido = mayor prioridad
}

// ---------- Rutina diaria ----------

// Reparto del tiempo disponible entre los pasos fijos de la rutina.
const REPARTO_3_PASOS = { fuelle: 0.2, escala: 0.4, arpegio: 0.4 };

// Orden de ciclado dentro de "Arpegios menores": las 3 articulaciones
// "clásicas" (Portato/Nota repetida/Continuo, ver DECISIONES.md punto 15)
// van primero, en ese orden fijo, para no alterar el comportamiento ya
// conocido; cualquier otra articulación (agregada a futuro bajo el mismo
// nombre, ver punto 38) se ordena después, en el orden en que se cargó.
const ORDEN_ARPEGIO_MENOR = ARTICULACIONES_ARPEGIO_MENOR;
function ordenArpegioMenor(articulacion) {
  const i = ORDEN_ARPEGIO_MENOR.indexOf(articulacion);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

function candidatesFor(nivel, tipo) {
  // El paso de fuelle/entrada en calor es parte del ritual diario en TODOS
  // los niveles (ver ejemplo de rutina en la consigna: 1° fuelle, 2° escalas,
  // 3° arpegios). Para armar la rutina se comparte ese mismo pool de fuelle
  // entre los tres niveles. Ver DECISIONES.md.
  if (tipo === 'fuelle') return getAllExercises().filter((e) => e.tipo === 'fuelle');
  return getAllExercises().filter((e) => e.nivel === nivel && e.tipo === tipo);
}

/**
 * Agrupa las variantes de "Arpegios menores" (mismo grupoEspecial) en un único
 * candidato "virtual" que ocupa un solo lugar en la rutina, y deja aparte el
 * resto de ejercicios de ese tipo sin tocar. Ver DECISIONES.md punto 15.
 *
 * El campo `grupoEspecial` (asignado en "Nuevo ejercicio" según nombre+tipo,
 * ver DECISIONES.md punto 38) ya es la clave de agrupamiento genérica: acá
 * no hace falta — ni conviene— volver a mirar la articulación de cada
 * ejercicio para decidir si pertenece al grupo, cualquier cantidad de
 * variantes con el mismo `grupoEspecial` se agrupa igual, sean 2, 3 o más.
 */
function splitVirtualGroups(list) {
  const groups = new Map();
  const normal = [];
  for (const e of list) {
    if (e.grupoEspecial) {
      if (!groups.has(e.grupoEspecial)) groups.set(e.grupoEspecial, []);
      groups.get(e.grupoEspecial).push(e);
    } else {
      normal.push(e);
    }
  }
  const virtuals = [...groups.entries()].map(([grupoEspecial, variantes]) => ({
    isVirtual: true,
    grupoEspecial,
    // orden por prioridad (conocidas primero) cuando el grupo es
    // "arpegios-menores"; si en el futuro hay otro grupoEspecial, se respeta
    // el orden en que se cargaron.
    variantes: grupoEspecial === GRUPO_ARPEGIOS_MENORES
      ? [...variantes].sort((a, b) => ordenArpegioMenor(a.articulacion) - ordenArpegioMenor(b.articulacion))
      : variantes,
  }));
  return { normal, virtuals };
}

function toCandidate(item, progress, now) {
  if (item.isVirtual) {
    const scored = item.variantes.map((v) => ({ v, score: priorityScore(v.id, progress, now) }));
    scored.sort((a, b) => b.score - a.score);
    const active = scored[0].v;
    return {
      score: scored[0].score,
      dur: computeGroupDurationMin(active),
      nombre: active.nombre,
      build(exclude) {
        item.variantes.forEach((v) => exclude.add(v.id));
        return { exerciseId: active.id, grupoEspecial: item.grupoEspecial, variantIds: item.variantes.map((v) => v.id) };
      },
    };
  }
  return {
    score: priorityScore(item.id, progress, now),
    dur: computeGroupDurationMin(item),
    nombre: item.nombre,
    build(exclude) {
      exclude.add(item.id);
      return { exerciseId: item.id, grupoEspecial: null, variantIds: null };
    },
  };
}

function pickForBudget(list, budgetMin, progress, now, exclude = new Set()) {
  const { normal, virtuals } = splitVirtualGroups(list);

  // Cada candidato lleva consigo los ids que representa (normal: el suyo
  // propio; virtual: los de sus 3 variantes) para poder chequear `exclude`.
  const withIds = [
    ...normal.map((e) => ({ c: toCandidate(e, progress, now), ids: [e.id] })),
    ...virtuals.map((g) => ({ c: toCandidate(g, progress, now), ids: g.variantes.map((v) => v.id) })),
  ];

  const scored = withIds
    .filter(({ ids }) => !ids.some((id) => exclude.has(id)))
    .sort((a, b) => {
      if (b.c.score !== a.c.score) return b.c.score - a.c.score;
      return a.c.nombre.localeCompare(b.c.nombre);
    });

  const picked = [];
  let used = 0;
  for (const { c } of scored) {
    if (picked.length === 0 || used < budgetMin) {
      picked.push(c.build(exclude));
      used += c.dur;
    }
    if (used >= budgetMin) break;
  }
  return picked;
}

/**
 * Arma la rutina del día: orden fijo de categorías (ritual), pero el contenido
 * específico de cada paso se elige según prioridad de repaso espaciado.
 * Principiante: solo pasos de fuelle. Intermedio/avanzado: fuelle, escala, arpegio.
 */
export function buildRoutine(nivel, timeBudgetMin, excludeIds = []) {
  const progress = getProgress();
  const now = Date.now();
  const exclude = new Set(excludeIds);

  const categorias = nivel === 'principiante' ? ['fuelle'] : ['fuelle', 'escala', 'arpegio'];
  const steps = [];

  categorias.forEach((tipo) => {
    const share = categorias.length === 1 ? 1 : REPARTO_3_PASOS[tipo];
    const budget = Math.max(3, timeBudgetMin * share);
    const list = candidatesFor(nivel, tipo);
    const picked = pickForBudget(list, budget, progress, now, exclude);
    picked.forEach((p) => {
      steps.push({ ...p, tipo, done: false });
    });
  });

  return steps;
}

/**
 * Devuelve, para reemplazo "otro similar", el próximo mejor candidato de la
 * misma categoría. Los ejercicios que forman parte de un grupoEspecial (ej.
 * "Arpegios menores") quedan afuera de este mecanismo genérico: esos se
 * ciclan con `cycleGrupoEspecialStep`, no se buscan en el resto de la
 * biblioteca. Ver DECISIONES.md punto 15/21.
 */
export function findSimilar(nivel, tipo, excludeIds) {
  const progress = getProgress();
  const now = Date.now();
  const exclude = new Set(excludeIds);
  const list = candidatesFor(nivel, tipo).filter((e) => !e.grupoEspecial && !exclude.has(e.id));
  if (list.length === 0) return null;
  list.sort((a, b) => priorityScore(b.id, progress, now) - priorityScore(a.id, progress, now));
  return list[0];
}

// ---------- Estado de "hoy" (persistido para no reordenar en cada refresh) ----------

export function getTodayState() {
  return readJSON(KEYS.today, null);
}

export function saveTodayState(state) {
  writeJSON(KEYS.today, state);
}

export function ensureTodayState(nivel, timeBudgetMin) {
  const existing = getTodayState();
  const today = todayISO();
  if (existing && existing.date === today && existing.nivel === nivel && existing.timeBudgetMin === timeBudgetMin) {
    return existing;
  }
  const steps = buildRoutine(nivel, timeBudgetMin);
  const state = { id: uid('routine'), date: today, nivel, timeBudgetMin, steps };
  saveTodayState(state);
  return state;
}

export function regenerateToday(nivel, timeBudgetMin) {
  const steps = buildRoutine(nivel, timeBudgetMin);
  const state = { id: uid('routine'), date: todayISO(), nivel, timeBudgetMin, steps };
  saveTodayState(state);
  return state;
}

export function markStepDone(exerciseId) {
  const state = getTodayState();
  if (!state) return;
  const step = state.steps.find((s) => s.exerciseId === exerciseId);
  if (step) step.done = true;
  saveTodayState(state);
}

export function swapStep(exerciseId) {
  const state = getTodayState();
  if (!state) return null;
  const idx = state.steps.findIndex((s) => s.exerciseId === exerciseId);
  if (idx === -1) return null;
  const currentIds = state.steps.map((s) => s.exerciseId);
  const replacement = findSimilar(state.nivel, state.steps[idx].tipo, currentIds);
  if (!replacement) return null;
  state.steps[idx] = { exerciseId: replacement.id, tipo: state.steps[idx].tipo, done: false, grupoEspecial: null, variantIds: null };
  saveTodayState(state);
  return replacement;
}

/**
 * Cicla la variante activa de un paso de la rutina que pertenece a un
 * grupoEspecial (hoy en día, solo "Arpegios menores"): recorre `variantIds`
 * (todas las variantes cargadas bajo ese nombre+nivel, sin límite fijo de
 * cantidad ni de articulación, ver DECISIONES.md punto 38) en orden y vuelve
 * a la primera al llegar al final, respetando qué variantes existen
 * realmente en la biblioteca. Ver DECISIONES.md punto 15.
 */
export function cycleGrupoEspecialStep(exerciseId) {
  const state = getTodayState();
  if (!state) return null;
  const idx = state.steps.findIndex((s) => s.exerciseId === exerciseId && s.grupoEspecial);
  if (idx === -1) return null;
  const step = state.steps[idx];
  const ids = step.variantIds || [];
  if (ids.length === 0) return null;
  const curPos = ids.indexOf(exerciseId);
  const nextId = ids[(curPos + 1) % ids.length];
  const nextExercise = getExerciseById(nextId);
  if (!nextExercise) return null;
  state.steps[idx] = { ...step, exerciseId: nextId };
  saveTodayState(state);
  return nextExercise;
}

// ---------------------------------------------------------------------
// Respaldo / restauración (ver DECISIONES.md ronda 7, punto 37)
// ---------------------------------------------------------------------
// Todo el contenido de la app vive únicamente en localStorage (ver README):
// no hay backend, así que borrar los datos del sitio o un cambio de forma
// entre sesiones de desarrollo (como el de punto 14) pierde el contenido
// cargado sin ninguna forma de recuperarlo. Esto agrega una exportación/
// importación manual como red de seguridad.

function listAppKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(APP_PREFIX)) keys.push(k);
  }
  return keys;
}

/**
 * Arma el objeto completo de respaldo: TODAS las claves de la app en
 * localStorage (ejercicios propios, imágenes, audios, progreso, perfil,
 * ajustes de audio, tiempo elegido en "Hoy", configuración por ejercicio del
 * reproductor, y la fecha del último respaldo). Se guarda el valor crudo tal
 * como está en localStorage (sin volver a parsear/reserializar cada JSON
 * interno): así el formato de respaldo no depende de conocer la forma
 * interna de cada clave y no se desactualiza si esa forma cambia.
 */
export function buildBackup() {
  const data = {};
  listAppKeys().forEach((k) => { data[k] = localStorage.getItem(k); });
  return {
    app: 'fuelle',
    backupFormatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

/** Registra "ahora" como el momento del último respaldo exportado (para el aviso, ver punto 37). */
export function markBackupDone() {
  localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
}

/** Fecha ISO del último respaldo exportado, o `null` si nunca se exportó uno. */
export function getLastBackupAt() {
  return localStorage.getItem(LAST_BACKUP_KEY);
}

/** Hay algo que valga la pena respaldar: al menos un ejercicio propio o algo de progreso registrado. */
export function hasBackupableContent() {
  return getCustomExercises().length > 0 || Object.keys(getProgress()).length > 0;
}

function backupEntries(parsed) {
  if (!parsed || typeof parsed !== 'object' || parsed.app !== 'fuelle' || !parsed.data || typeof parsed.data !== 'object') {
    return null;
  }
  const entries = Object.entries(parsed.data).filter(
    ([k, v]) => typeof k === 'string' && k.startsWith(APP_PREFIX) && typeof v === 'string'
  );
  return entries.length > 0 ? entries : null;
}

/**
 * Chequeo liviano de forma (sin tocar nada): permite a la UI avisar de un
 * archivo inválido ANTES de mostrar el diálogo de "reemplazar todo", en vez
 * de mostrar esa confirmación para algo que de todos modos va a fallar
 * después. Usa la misma validación que `restoreBackup`.
 */
export function isValidBackup(parsed) {
  return backupEntries(parsed) !== null;
}

/**
 * Restaura un respaldo previamente exportado con `buildBackup()`, REEMPLAZANDO
 * todo el contenido actual de la app (ver DECISIONES.md ronda 7, punto 37 —
 * por qué reemplazar y no fusionar). Valida la forma mínima del archivo
 * antes de tocar nada; lanza un `Error` con mensaje legible si el archivo no
 * es un respaldo válido de esta app, sin dejar `localStorage` a medio
 * escribir en ese caso.
 */
export function restoreBackup(parsed) {
  const entries = backupEntries(parsed);
  if (!entries) {
    throw new Error('El archivo no tiene el formato de un respaldo de BandoGym, o no tiene contenido para restaurar.');
  }
  // Reemplazo completo: se borran primero todas las claves actuales de la
  // app (no solo las que trae el archivo) para no dejar mezclado contenido
  // viejo con el restaurado — ver la decisión completa en DECISIONES.md.
  listAppKeys().forEach((k) => localStorage.removeItem(k));
  entries.forEach(([k, v]) => localStorage.setItem(k, v));
}
