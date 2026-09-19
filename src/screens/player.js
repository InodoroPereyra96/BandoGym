// Reproductor de práctica: la pantalla clave.
// - Ejercicios de escala/arpegio: en modo automático avanza de paso en paso
//   (cada paso = una imagen, ej. "La menor abriendo", con su PROPIA cantidad
//   de compases — ver DECISIONES.md ronda 6, punto 34) en sincronía con el
//   metrónomo (BPM/compás/acento/cuenta de anticipación configurables); en
//   modo manual el avance lo controla el usuario con pedal Bluetooth/
//   teclado/toque sobre mitad derecha (avanza) o izquierda (retrocede) de la
//   partitura, sin metrónomo ni tiempo (ver DECISIONES.md puntos 32 y 36).
//   Además: audio de demostración opcional por paso/velocidad, zoom/pantalla
//   completa de la partitura con normalización automática de tamaño visual
//   entre pasos (punto 31), cuadraditos de progreso tocables para saltar
//   directo a un paso (punto 35) y, en horizontal, layout compacto sin
//   scroll vertical con ajustes secundarios colapsables (punto 35).
// - Ejercicios de fuelle (principiante): temporizador simple de práctica.
// En ambos casos, al terminar se registra el progreso automáticamente (sin
// preguntarle al usuario "cómo te salió" — ver DECISIONES.md punto 68) y se
// vuelve a "Hoy"/Bandoteca según de dónde vino.
//
// Ver DECISIONES.md puntos 14 (pasos en vez de tonalidades), 15 (Arpegios
// menores), 17 (horizontal), 18 (zoom/fullscreen), 19 (metrónomo), 20
// (audio), 23-27 (ronda 3: compás, sincronización, volumen, acento,
// cuenta de anticipación), 30-32 (ronda 4: centrado vertical,
// normalización de tamaño y modo manual), 33 (ronda 5: corrección de la
// normalización de tamaño, que quedaba achicando la imagen en vez de
// maximizarla) y 34-36 (ronda 6: 34 compases por paso, 35 sin scroll
// vertical en horizontal + pasos tocables con resincronización, 36 toque
// bidireccional).

import * as store from '../store.js';
import { tiemposPorCompas, pasoTieneDosSistemas, pasoCompasesArriba, pasoCompasesAbajo, isValidBpm } from '../data.js';
import { scorePlaceholderSVG, formatMMSS, computeContentTransform, detectSystemLayout, escapeHTML } from '../util.js';
import { NIVEL_LABEL, ARTICULACION_LABEL, BPM_OPTIONS, BPM_MIN, BPM_MAX, GRUPO_ARPEGIOS_MENORES, NOMBRE_GRUPO_ARPEGIOS_MENORES } from '../theory.js';
import { toast } from '../ui.js';
import { createMetronome } from '../metronome.js';
import { attachPinchZoom } from '../zoom.js';
import { attachAnnotationLayer, TOOL_PENCIL, TOOL_HIGHLIGHTER, TOOL_ERASER, PENCIL_COLORS } from '../annotate.js';

let cleanupFn = null;
const metronome = createMetronome();

// Íconos de transporte (ver DECISIONES.md puntos 46 y 50): reemplazan los
// glyphs de emoji (▶ ⏸ ⏮ ⏭) por SVG propio, mismo trazo redondeado que el
// resto de los íconos nuevos de la app (ver punto 45). `width`/`height`
// en "1em" son obligatorios acá — sin medida propia ni CSS que la fije,
// el tamaño por defecto de un `<svg>` depende del navegador (Safari/iOS
// lo renderiza roto/invisible; ver punto 50), y "1em" además lo escala
// solo según el `font-size` del botón (`.icon-btn`/`.icon-btn-lg`).
const ICON_PLAY = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" stroke="currentColor" stroke-width="0.5" stroke-linejoin="round"><path d="M7 4.8v14.4c0 .9 1 1.4 1.7.9l11-7.2c.6-.4.6-1.3 0-1.7l-11-7.2C8 3.4 7 3.9 7 4.8z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><rect x="6" y="4" width="4.5" height="16" rx="1.4"/><rect x="13.5" y="4" width="4.5" height="16" rx="1.4"/></svg>';
const ICON_PREV = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><rect x="5" y="5" width="2.6" height="14" rx="1"/><path d="M18 6.2v11.6c0 .9-1 1.4-1.7.9l-8-5.8c-.6-.4-.6-1.3 0-1.8l8-5.8c.7-.5 1.7 0 1.7.9z"/></svg>';
const ICON_NEXT = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><rect x="16.4" y="5" width="2.6" height="14" rx="1"/><path d="M6 6.2v11.6c0 .9 1 1.4 1.7.9l8-5.8c.6-.4.6-1.3 0-1.8l-8-5.8c-.7-.5-1.7 0-1.7.9z"/></svg>';

// Contenido interno de `#playBtn` (botón `.icon-btn-lg`, ver DECISIONES.md
// punto 80): dos tapas con su grilla de 6 puntos reales + el fuelle + el
// play — estructura literal de COMPONENTES.md (design_handoff_bandogym,
// sección 2), copiada tal cual en vez de simulada con CSS de un solo
// `<button>` liso (ver styles.css `.icon-btn-lg` para el porqué). El ícono
// play/pausa vive en `.bg-play`, así el toggle solo reemplaza ESE hijo, no
// las tapas/fuelle.
const BANDONEON_DOTS = '<span class="bg-dots"><i></i><i></i><i></i><i></i><i></i><i></i></span>';
function bandoneonPlayHTML(iconHtml) {
  return `<span class="bg-tapa">${BANDONEON_DOTS}</span><span class="bg-fuelle"></span><span class="bg-tapa">${BANDONEON_DOTS}</span><span class="bg-play">${iconHtml}</span>`;
}

// Metrónomo (reemplaza el emoji 🔔, ver DECISIONES.md puntos 52-53): trazo,
// no relleno, como el resto de los íconos de la familia — cuerpo
// trapezoidal del metrónomo con el brazo/péndulo a mitad de oscilación.
// "1.6em" (no "1em", ver punto 53): más grande que el texto del botón a
// propósito, para que se note — sigue escalando con el `font-size` del
// botón, solo que ya no calza 1:1 con la altura de línea del texto.
const ICON_METRONOME = '<svg viewBox="0 0 24 24" width="1.6em" height="1.6em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 20h8L14 5h-4L8 20z"/><path d="M12 7.5l3 11.5"/><circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none"/></svg>';
// Mini-bandoneón (reemplaza el emoji 🎧 del audio de demostración, ver
// DECISIONES.md puntos 52-53): el mismo motivo "fuelle" del separador del
// topbar (puntos 45/47/48) en miniatura — zigzag plegado con 3 botones a
// cada lado — en vez de dibujar el instrumento entero de nuevo. Un pliegue
// más que la primera versión (3 picos/3 valles, no 3/2) y con los picos
// subiendo de izquierda a derecha (curvado hacia arriba, como en el dibujo
// del usuario) en vez de un zigzag parejo — los puntitos de cada extremo
// acompañan esa altura para leerse como los botones reales del fuelle
// doblado.
const ICON_BANDONEON_MINI = '<svg viewBox="0 0 30 24" width="1.6em" height="1.6em" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10L9.6 19 13.2 7 16.8 17 20.4 4 24 15"/><circle cx="2.5" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="2.5" cy="13.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="2.5" cy="19" r="1.1" fill="currentColor" stroke="none"/><circle cx="27.5" cy="4" r="1.1" fill="currentColor" stroke="none"/><circle cx="27.5" cy="9.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="27.5" cy="15" r="1.1" fill="currentColor" stroke="none"/></svg>';

// Íconos de la capa de anotaciones (ver DECISIONES.md punto 67): mismo estilo
// de trazo que el resto de la familia (SVG propio, stroke redondeado, sin
// emoji — ver puntos 45/46/50/52-53 sobre por qué esta app no usa glyphs de
// emoji para íconos funcionales).
const ICON_PENCIL = '<svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l1-4.2L15.8 5l3.2 3.2L8.2 19 4 20z"/><path d="M13.6 6.4l3.2 3.2"/></svg>';
const ICON_HIGHLIGHTER = '<svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9.6" y="2.4" width="5" height="10.4" rx="1.2" transform="rotate(35 12.1 7.6)"/><path d="M9 12.7L5 20l6-2.2"/></svg>';
const ICON_ERASER = '<svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="12" height="7" rx="1.4" transform="rotate(-20 11 14.5)"/><path d="M8.5 18.2h10"/></svg>';

function settingsKey(id) {
  return `fuelle:playerSettings:v2:${id}`;
}

function defaultSettings(exercise) {
  const bpm = isValidBpm(Number(exercise.bpmDefault)) ? Number(exercise.bpmDefault) : 60;
  return {
    bpm,
    // Ya NO hay "compases" acá: cada paso trae el suyo propio (ver
    // DECISIONES.md ronda 6, punto 34) — el reproductor no persiste ningún
    // valor global de compases. Tampoco hay "acentoCada": desde el punto 42
    // es un dato fijo del ejercicio, no una preferencia de sesión.
    mode: 'auto', // 'auto' (metrónomo/BPM) o 'manual' (pedal/teclado/toque) — ver DECISIONES.md punto 32
  };
}

function loadSettings(exercise) {
  const defaults = defaultSettings(exercise);
  try {
    const raw = localStorage.getItem(settingsKey(exercise.id));
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch (e) { /* ignorar */ }
  return defaults;
}

function saveSettings(exercise, settings) {
  try {
    localStorage.setItem(settingsKey(exercise.id), JSON.stringify(settings));
  } catch (e) { /* ignorar */ }
}

export function render(container, { param, query, navigate }) {
  document.body.classList.add('is-player');

  // Intento best-effort de forzar horizontal (ver DECISIONES.md punto 17):
  // solo funciona en navegadores/contextos que lo soportan (típicamente PWA
  // instalada + fullscreen en Android/Chrome); si no está disponible, el
  // CSS igual se adapta cuando el usuario rota el dispositivo a mano.
  try {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
  } catch (e) { /* no soportado */ }

  const exercise = store.getExerciseById(param);
  const fromRoute = query.from === 'biblioteca' ? 'biblioteca' : 'hoy';

  if (!exercise) {
    container.innerHTML = `
      <div class="empty-state card">
        <div class="big-icon">⚠</div>
        <p>No se encontró este ejercicio. Puede que haya sido reemplazado.</p>
        <button class="btn btn-primary" id="volver">Volver</button>
      </div>`;
    container.querySelector('#volver').addEventListener('click', () => navigate('#/hoy'));
    return;
  }

  if (exercise.tipo === 'fuelle') {
    renderFuelle(container, exercise, fromRoute, navigate);
  } else {
    renderEscalaArpegio(container, exercise, fromRoute, navigate);
  }
}

export function destroy() {
  document.body.classList.remove('is-player');
  metronome.stop();
  if (cleanupFn) cleanupFn();
  cleanupFn = null;
  try {
    if (document.fullscreenElement) document.exitFullscreen();
  } catch (e) { /* ignorar */ }
  try {
    if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
  } catch (e) { /* ignorar */ }
}

// ---------------------------------------------------------------------
// Fuelle: temporizador simple
// ---------------------------------------------------------------------

function renderFuelle(container, exercise, fromRoute, navigate) {
  const targetSec = (exercise.duracionEstimadaMin || 4) * 60;
  let elapsedBefore = 0;
  let startedAt = null;
  let playing = false;
  let intervalId = null;

  const customImg = store.getImageFor(exercise.id);

  container.innerHTML = `
    <div class="player-wrap">
      ${customImg ? `<div class="score-frame"><img src="${customImg}" alt="Imagen de referencia de ${exercise.nombre}" /></div>` : ''}
      <div class="tonalidad-label">
        <div class="nombre">${exercise.nombre}</div>
        <div class="sub">${ARTICULACION_LABEL[exercise.articulacion] || ''} · Principiante</div>
      </div>
      <p class="subtitle text-center">${exercise.descripcion || ''}</p>

      <div class="timer-circle">
        <div class="time" id="timeDisplay">00:00</div>
        <div class="target">objetivo ${formatMMSS(targetSec)}</div>
      </div>

      <div class="transport">
        <button class="icon-btn icon-btn-lg" id="playBtn" aria-label="Reproducir / pausar">${bandoneonPlayHTML(ICON_PLAY)}</button>
      </div>

      <button class="btn btn-wine" id="finishBtn">Terminar</button>
    </div>
  `;

  const timeDisplay = container.querySelector('#timeDisplay');
  const playBtn = container.querySelector('#playBtn');

  function currentElapsed() {
    if (!playing) return elapsedBefore;
    return elapsedBefore + (Date.now() - startedAt) / 1000;
  }

  function tick() {
    timeDisplay.textContent = formatMMSS(currentElapsed());
  }

  function togglePlay() {
    playing = !playing;
    if (playing) {
      startedAt = Date.now();
      playBtn.querySelector('.bg-play').innerHTML = ICON_PAUSE;
      intervalId = setInterval(tick, 200);
    } else {
      elapsedBefore = currentElapsed();
      playBtn.querySelector('.bg-play').innerHTML = ICON_PLAY;
      clearInterval(intervalId);
    }
  }

  playBtn.addEventListener('click', togglePlay);
  container.querySelector('#finishBtn').addEventListener('click', () => {
    if (playing) togglePlay();
    finishExercise(exercise, fromRoute, navigate);
  });

  cleanupFn = () => clearInterval(intervalId);
}

// ---------------------------------------------------------------------
// Escala / Arpegio: carrusel de pasos (imagen por tonalidad+dirección)
// ---------------------------------------------------------------------

function renderEscalaArpegio(container, exercise, fromRoute, navigate) {
  const pasos = (exercise.pasos || []).slice().sort((a, b) => a.orden - b.orden);

  if (pasos.length === 0) {
    container.innerHTML = `
      <div class="empty-state card">
        <div class="big-icon">🖼</div>
        <p>Este ejercicio todavía no tiene imágenes cargadas.${store.isAdmin() ? '<br>Agregalas desde "Nuevo ejercicio".' : ''}</p>
        <button class="btn btn-primary" id="volver">Volver</button>
      </div>`;
    container.querySelector('#volver').addEventListener('click', () => navigate(fromRoute === 'hoy' ? '#/hoy' : '#/biblioteca'));
    return;
  }

  const compas = exercise.compas || '4/4';
  const tiempos = tiemposPorCompas(compas);

  const settings = loadSettings(exercise);
  let bpm = isValidBpm(Number(settings.bpm)) ? Number(settings.bpm) : 60;

  // Acento: YA NO es ajustable en Práctica (ver DECISIONES.md punto 42) —
  // es un dato fijo del ejercicio (`acentoDefault`, cargado en "Nuevo"/
  // "Editar"), no una preferencia de sesión como bpm/modo.
  const acentoDefault = Number(exercise.acentoDefault);
  const acentoCada = (Number.isFinite(acentoDefault) && acentoDefault >= 0 && acentoDefault <= 9)
    ? Math.round(acentoDefault)
    : tiempos;

  let mode = settings.mode === 'manual' ? 'manual' : 'auto'; // ver DECISIONES.md punto 32

  const audioSettings = store.getAudioSettings();
  let metronomeVolume = audioSettings.metronomeVolume;
  let demoVolume = audioSettings.demoVolume;

  let index = 0;
  let playing = false;
  // Fase del reproductor: 'stopped' (pausado), 'countin' (cuenta de
  // anticipación sonando, sin avanzar pasos) o 'playing' (avanzando pasos en
  // sincronía con el metrónomo). Ver DECISIONES.md puntos 24 y 27.
  let phase = 'stopped';
  // Renombrado de `beatsElapsedInPaso` (ver DECISIONES.md punto 58): ahora
  // cuenta tiempos dentro del SISTEMA activo, no del paso entero — con un
  // solo sistema por paso (comportamiento viejo) es exactamente lo mismo.
  let beatsElapsedInSistema = 0;
  let countInElapsed = 0;

  // Ver DECISIONES.md punto 58: un paso puede traer 2 sistemas apilados en
  // la misma imagen (arriba=⊓/abriendo, abajo=V/cerrando). `systemIndex`
  // (0=arriba, 1=abajo) dice cuál está sonando ahora mismo dentro del paso
  // actual — independiente de `index` (que paso) y solo relevante cuando
  // `pasoTieneDosSistemas(pasos[index])` es true. Se resetea a 0 en cada
  // cambio de paso (ver paintTonalidad).
  let systemIndex = 0;
  // Resultado de `detectSystemLayout()` sobre la imagen del paso actual —
  // rango vertical de cada sistema (1 o 2) MÁS los segmentos reales por
  // compás (barras de compás detectadas, ver DECISIONES.md punto 59) — o
  // `null` si no se pudo detectar. Se recalcula una sola vez por imagen
  // cargada, no en cada beat.
  let systemLayout = null;

  // Capa de anotaciones a mano sobre la partitura (ver DECISIONES.md punto
  // 67): `annotationLayer` es la instancia devuelta por
  // `attachAnnotationLayer` para el paso ACTUAL (se recrea en cada
  // `paintTonalidad`, igual que `systemLayout`); `annotateTool`/
  // `annotateColor`/`annotateOpen` son la elección del usuario, que persiste
  // entre pasos (elegís lápiz rojo una vez y seguís dibujando así al pasar
  // de paso, no hace falta re-elegirlo en cada imagen).
  let annotationLayer = null;
  let annotateTool = null; // null | TOOL_PENCIL | TOOL_HIGHLIGHTER | TOOL_ERASER
  let annotateColor = PENCIL_COLORS[0];
  let annotateOpen = false; // menú del botón flotante desplegado/colapsado

  // Tiempos del SISTEMA activo dentro del paso actual (arriba o abajo, ver
  // DECISIONES.md punto 58) — es lo que gobierna cuándo salta la barra de
  // práctica de un sistema al otro (o de un paso al siguiente, si el paso
  // es de 1 solo sistema). Reemplaza al viejo `beatsPerPaso()` (que contaba
  // el paso entero sin distinguir sistemas); los compases del paso actual
  // (no un valor global — ver DECISIONES.md ronda 6, punto 34) se leen en
  // cada llamada, así que cambian solos al cambiar de paso/sistema sin
  // ningún control aparte.
  function beatsPerSistema() {
    const paso = pasos[index];
    const compasesSistema = systemIndex === 0
      ? pasoCompasesArriba(paso, exercise)
      : pasoCompasesAbajo(paso);
    return Math.max(1, compasesSistema * tiempos);
  }
  function countInBeatsTotal() {
    return 2 * tiempos; // 2 compases completos de anticipación, ver DECISIONES.md punto 27
  }

  const esArpegioMenor = exercise.grupoEspecial === GRUPO_ARPEGIOS_MENORES;
  const subExercise = esArpegioMenor
    ? `${NOMBRE_GRUPO_ARPEGIOS_MENORES} · ${ARTICULACION_LABEL[exercise.articulacion] || ''} · ${NIVEL_LABEL[exercise.nivel]} · ${compas}`
    : `${exercise.nombre} · ${NIVEL_LABEL[exercise.nivel]} · ${compas}`;

  container.innerHTML = `
    <div class="player-wrap escala-arpegio">
      <div class="score-frame-wrap" id="scoreFrameWrap">
        <div class="score-frame" id="scoreFrame"></div>
        <button class="icon-btn score-fs-btn" id="fullscreenBtn" aria-label="Pantalla completa">⛶</button>
        <div class="annotate-widget" id="annotateWidget" hidden>
          <button type="button" class="icon-btn annotate-fab" id="annotateFab" aria-haspopup="true" aria-expanded="false" aria-label="Anotar sobre la partitura">${ICON_PENCIL}</button>
          <div class="annotate-menu" id="annotateMenu" hidden>
            <button type="button" class="annotate-tool-btn" data-tool="${TOOL_PENCIL}" aria-label="Lápiz">${ICON_PENCIL}</button>
            <button type="button" class="annotate-tool-btn" data-tool="${TOOL_HIGHLIGHTER}" aria-label="Resaltador">${ICON_HIGHLIGHTER}</button>
            <button type="button" class="annotate-tool-btn" data-tool="${TOOL_ERASER}" aria-label="Goma de borrar">${ICON_ERASER}</button>
            <div class="annotate-colors" id="annotateColors" hidden>
              <button type="button" class="annotate-color-btn" data-color="${PENCIL_COLORS[0]}" style="background:${PENCIL_COLORS[0]}" aria-label="Lápiz negro"></button>
              <button type="button" class="annotate-color-btn" data-color="${PENCIL_COLORS[1]}" style="background:${PENCIL_COLORS[1]}" aria-label="Lápiz rojo"></button>
            </div>
          </div>
        </div>
      </div>

      <div class="player-side">
        <div class="config-block config-block-solo" id="modeBlock">
          <div class="config-label">Modo de avance</div>
          <div class="chip-row chip-row-center" id="modePicker">
            <button type="button" class="chip" data-mode="auto">🎵 Auto (metrónomo)</button>
            <button type="button" class="chip" data-mode="manual">✋ Manual</button>
          </div>
        </div>

        <div class="fuelle-divider" aria-hidden="true"><span></span></div>

        <div id="autoProgressBlock">
          <div class="progress-label" id="progressLabel"></div>
          <div class="progress-segments" id="progressSegments"></div>
        </div>

        <p class="field-hint manual-hint" id="manualHint" hidden>
          Modo manual: avanzá con las flechas del teclado, Espacio, Av Pág /
          Re Pág (así funcionan los pedales Bluetooth de pasar páginas), o
          tocando la mitad derecha de la partitura para avanzar / la mitad
          izquierda para retroceder. No suena el metrónomo ni corre el tiempo solo.
        </p>

        <div class="tonalidad-label">
          <div class="nombre" id="tonalidadNombre"></div>
          <div class="sub">${subExercise}</div>
        </div>

        <div class="progress-dots" id="dots"></div>

        <div class="transport">
          <button class="icon-btn" id="prevBtn" aria-label="Paso anterior">${ICON_PREV}</button>
          <button class="icon-btn icon-btn-lg" id="playBtn" aria-label="Reproducir / pausar">${bandoneonPlayHTML(ICON_PLAY)}</button>
          <button class="icon-btn" id="nextBtn" aria-label="Paso siguiente">${ICON_NEXT}</button>
        </div>

        <div id="autoConfigBlock">
          <div class="player-config">
            <div class="config-block config-block-solo volume-block" id="bpmBlock">
              <div class="volume-block-label"><span>Metrónomo</span><span class="value" id="bpmValue">${bpm} BPM</span></div>
              <input type="range" id="bpmSlider" min="${BPM_MIN}" max="${BPM_MAX}" step="1" value="${bpm}" aria-label="BPM del metrónomo" />
            </div>
          </div>
        </div>

        <div class="volume-toggle-row">
          <button type="button" class="btn btn-outline btn-sm volume-toggle" id="metroVolToggle" aria-expanded="false">${ICON_METRONOME} Metrónomo</button>
          <button type="button" class="btn btn-outline btn-sm volume-toggle" id="demoVolToggle" aria-expanded="false">${ICON_BANDONEON_MINI} Audio demo</button>
        </div>
        <div class="volume-block" id="metroVolBlock" hidden>
          <div class="volume-block-label"><span>Volumen del metrónomo</span><span class="value" id="metroVolValue"></span></div>
          <input type="range" id="metroVolSlider" min="0" max="100" step="1" aria-label="Volumen del metrónomo" />
        </div>
        <div class="volume-block" id="demoVolBlock" hidden>
          <div class="volume-block-label"><span>Volumen del audio de demostración</span><span class="value" id="demoVolValue"></span></div>
          <input type="range" id="demoVolSlider" min="0" max="100" step="1" aria-label="Volumen del audio de demostración" />
          <div class="section-title">Audio de demostración</div>
          <div class="audio-row" id="audioRow"></div>
        </div>

        <div class="footer-row">
          <button class="btn btn-wine" id="finishBtn">Terminar</button>
        </div>
      </div>
    </div>
  `;

  const scoreFrameWrap = container.querySelector('#scoreFrameWrap');
  const scoreFrame = container.querySelector('#scoreFrame');
  const fullscreenBtn = container.querySelector('#fullscreenBtn');
  const annotateWidget = container.querySelector('#annotateWidget');
  const annotateFab = container.querySelector('#annotateFab');
  const annotateMenu = container.querySelector('#annotateMenu');
  const annotateColors = container.querySelector('#annotateColors');
  const progressLabel = container.querySelector('#progressLabel');
  const progressSegments = container.querySelector('#progressSegments');
  const tonalidadNombre = container.querySelector('#tonalidadNombre');
  const dots = container.querySelector('#dots');
  const playBtn = container.querySelector('#playBtn');
  const audioRow = container.querySelector('#audioRow');
  const bpmSlider = container.querySelector('#bpmSlider');
  const bpmValue = container.querySelector('#bpmValue');
  const metroVolSlider = container.querySelector('#metroVolSlider');
  const demoVolSlider = container.querySelector('#demoVolSlider');
  const metroVolValue = container.querySelector('#metroVolValue');
  const demoVolValue = container.querySelector('#demoVolValue');
  const modePicker = container.querySelector('#modePicker');
  const autoProgressBlock = container.querySelector('#autoProgressBlock');
  const autoConfigBlock = container.querySelector('#autoConfigBlock');
  const metroVolBlock = container.querySelector('#metroVolBlock');
  const demoVolBlock = container.querySelector('#demoVolBlock');
  const metroVolToggle = container.querySelector('#metroVolToggle');
  const demoVolToggle = container.querySelector('#demoVolToggle');
  const manualHint = container.querySelector('#manualHint');

  metroVolSlider.value = Math.round(metronomeVolume * 100);
  demoVolSlider.value = Math.round(demoVolume * 100);
  metroVolValue.textContent = `${metroVolSlider.value}%`;
  demoVolValue.textContent = `${demoVolSlider.value}%`;

  /**
   * Volumen del metrónomo y del audio de demostración: dos botones
   * independientes en el mismo renglón, cada uno despliega/oculta SOLO su
   * propio control — antes era un único botón "Volumen" que desplegaba los
   * dos juntos (ver DECISIONES.md punto 50, pedido explícito de separarlos).
   * En horizontal (donde todo tiene que entrar sin scroll vertical) arrancan
   * colapsados; en vertical (donde esta pantalla igual permite scroll)
   * arrancan expandidos — mismo criterio que ya usaba el panel único.
   */
  function isLandscapeNow() {
    return window.matchMedia && window.matchMedia('(orientation: landscape)').matches;
  }
  let metroVolOpen = !isLandscapeNow();
  let demoVolOpen = !isLandscapeNow();
  function syncVolumeToggles() {
    const isManual = mode === 'manual'; // sin metrónomo en modo manual: no tiene sentido mostrar su volumen
    metroVolToggle.hidden = isManual;
    metroVolBlock.hidden = isManual || !metroVolOpen;
    metroVolToggle.classList.toggle('active', metroVolOpen);
    metroVolToggle.setAttribute('aria-expanded', String(metroVolOpen));

    demoVolBlock.hidden = !demoVolOpen;
    demoVolToggle.classList.toggle('active', demoVolOpen);
    demoVolToggle.setAttribute('aria-expanded', String(demoVolOpen));
  }
  metroVolToggle.addEventListener('click', () => {
    metroVolOpen = !metroVolOpen;
    syncVolumeToggles();
  });
  demoVolToggle.addEventListener('click', () => {
    demoVolOpen = !demoVolOpen;
    syncVolumeToggles();
  });

  // Modo manual (ver DECISIONES.md punto 32): tocar la partitura avanza o
  // retrocede según la mitad tocada (ver DECISIONES.md ronda 6, punto 36) —
  // mitad derecha avanza, mitad izquierda retrocede. El doble-tap para zoom
  // sigue funcionando sin conflicto (ver zoom.js).
  const zoomCtl = attachPinchZoom(scoreFrame, () => scoreFrame.querySelector('.score-inner'), {
    onSingleTap: ({ x } = {}) => {
      if (mode !== 'manual') return;
      const rect = scoreFrame.getBoundingClientRect();
      const isRightHalf = typeof x === 'number' ? (x - rect.left) > rect.width / 2 : true;
      goTo(isRightHalf ? index + 1 : index - 1);
    },
  });

  /**
   * Refleja `annotateOpen`/`annotateTool`/`annotateColor` en el DOM del
   * botón flotante y su menú (ver DECISIONES.md punto 67): qué está
   * resaltado, si el menú/los colores se ven, y un puntito dorado en el
   * botón cuando hay una herramienta activa (para que se note incluso con
   * el menú colapsado que el dibujo sigue prendido).
   */
  function syncAnnotateUI() {
    annotateMenu.hidden = !annotateOpen;
    annotateFab.setAttribute('aria-expanded', String(annotateOpen));
    annotateFab.classList.toggle('has-tool', !!annotateTool);
    annotateMenu.querySelectorAll('[data-tool]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tool === annotateTool);
    });
    annotateColors.hidden = annotateTool !== TOOL_PENCIL;
    annotateColors.querySelectorAll('[data-color]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.color === annotateColor);
    });
  }

  annotateFab.addEventListener('click', () => {
    annotateOpen = !annotateOpen;
    syncAnnotateUI();
  });

  annotateMenu.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tool]');
    if (!btn) return;
    // Tocar la herramienta ya activa la apaga (mismo patrón de toggle que
    // ya usan otros controles de esta pantalla, ej. `metroVolToggle`): es la
    // forma de volver al zoom/paneo/avance manual normal sin un botón
    // aparte de "cerrar".
    annotateTool = annotateTool === btn.dataset.tool ? null : btn.dataset.tool;
    if (annotationLayer) annotationLayer.setTool(annotateTool, annotateColor);
    syncAnnotateUI();
  });

  annotateColors.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-color]');
    if (!btn) return;
    annotateColor = btn.dataset.color;
    if (annotationLayer) annotationLayer.setTool(annotateTool, annotateColor);
    syncAnnotateUI();
  });

  // Cierra el menú si se toca cualquier otro lado de la pantalla (fuera del
  // botón flotante) — no apaga la herramienta activa, solo colapsa el menú.
  function onDocumentPointerDown(e) {
    if (!annotateOpen || annotateWidget.contains(e.target)) return;
    annotateOpen = false;
    syncAnnotateUI();
  }
  document.addEventListener('pointerdown', onDocumentPointerDown);

  /**
   * Recalcula la maximización automática de tamaño (ver DECISIONES.md
   * puntos 31 y 33) sobre la imagen actual, para el tamaño de marco que
   * esté vigente en este momento. Hace falta volver a llamarla cada vez que
   * el marco cambia de tamaño real después de haber pintado el paso —
   * pantalla completa (que agranda el marco a toda la pantalla) y cambios
   * de tamaño de ventana/orientación son los dos casos que lo disparan.
   */
  function applyAutoTransform() {
    const imgEl = scoreFrame.querySelector('img');
    if (!imgEl || !imgEl.complete || !imgEl.naturalWidth) return;
    // Neutralizar ANTES de medir: si ya había una transformación aplicada
    // (de un cálculo anterior), `getBoundingClientRect()` reflejaría la
    // imagen ya escalada, no su tamaño real con `object-fit: contain`, y el
    // cálculo se corrompería en cada recálculo sucesivo (ver DECISIONES.md
    // punto 33).
    zoomCtl.reset();
    zoomCtl.reset(computeContentTransform(imgEl, scoreFrame));
  }

  // Pantalla completa "de mentira" por CSS (ver DECISIONES.md punto 83): el
  // iPhone no implementa la API de pantalla completa del navegador para
  // elementos que no sean video, así que ahí el marco se estira a toda la
  // ventana con `position: fixed` (clase `pseudo-fs`).
  let pseudoFs = false;

  function paintFsButton() {
    const isFs = pseudoFs || document.fullscreenElement === scoreFrameWrap;
    fullscreenBtn.textContent = isFs ? '✕' : '⛶';
    fullscreenBtn.setAttribute('aria-label', isFs ? 'Salir de pantalla completa' : 'Pantalla completa');
  }

  function setPseudoFs(value) {
    pseudoFs = value;
    scoreFrameWrap.classList.toggle('pseudo-fs', value);
    paintFsButton();
  }

  function onFsChange() {
    paintFsButton();
    // El recálculo de tamaño en sí lo dispara `scoreFrameResizeObserver` de
    // abajo, no este handler — ver DECISIONES.md punto 61.
  }
  document.addEventListener('fullscreenchange', onFsChange);

  // Ver DECISIONES.md punto 61: recalcular con un solo `requestAnimationFrame`
  // tras `fullscreenchange`/`resize` (como hacía antes) asume que el
  // navegador ya terminó de aplicar el nuevo layout en ESE frame puntual —
  // no siempre es cierto (la transición a pantalla completa puede tardar
  // más de un frame en algunos navegadores/dispositivos), y si se mide
  // antes de tiempo, la escala mal calculada queda pegada hasta el próximo
  // cambio de tamaño. Un `ResizeObserver` sobre el marco dispara
  // exactamente cuando su tamaño YA cambió de verdad, sea cual sea la
  // causa (pantalla completa, resize de ventana, rotación) — reemplaza al
  // listener de `resize` + debounce Y al `requestAnimationFrame` de
  // `onFsChange` de una sola vez, sin necesidad de adivinar el timing.
  let resizeObserverTimer = null;
  const scoreFrameResizeObserver = new ResizeObserver(() => {
    clearTimeout(resizeObserverTimer);
    resizeObserverTimer = setTimeout(applyAutoTransform, 60);
  });
  scoreFrameResizeObserver.observe(scoreFrame);

  fullscreenBtn.addEventListener('click', () => {
    if (pseudoFs) {
      setPseudoFs(false);
      return;
    }
    if (!document.fullscreenElement) {
      const requestFs = scoreFrameWrap.requestFullscreen || scoreFrameWrap.webkitRequestFullscreen;
      if (!requestFs) {
        setPseudoFs(true);
        return;
      }
      const result = requestFs.call(scoreFrameWrap);
      if (result && typeof result.catch === 'function') {
        result.catch(() => setPseudoFs(true));
      }
    } else {
      const exitFs = document.exitFullscreen || document.webkitExitFullscreen;
      if (exitFs) exitFs.call(document);
    }
  });

  /**
   * Los indicadores de paso son cuadraditos TOCABLES (ver DECISIONES.md
   * ronda 6, punto 35): tocar uno salta directo a ese paso (`goTo(i)`, no
   * hace falta ir de a uno con ⏮/⏭) y resincroniza el conteo de tiempos del
   * paso — `goTo` ya reseteaba `beatsElapsedInSistema` a 0 en cada cambio de
   * paso (ver `paintTonalidad`), así que reusar la misma función alcanza:
   * es estructuralmente imposible que el conteo "seguido de largo" desde el
   * paso viejo, el salto siempre arranca al tiempo 0 del paso destino.
   */
  function paintDots() {
    dots.innerHTML = pasos
      .map((p, i) => `<button type="button" class="step-square ${i < index ? 'past' : ''} ${i === index ? 'current' : ''}" data-step="${i}" aria-label="Ir al paso ${i + 1}: ${escapeHTML(p.etiqueta)}" title="${escapeHTML(p.etiqueta)}">${i + 1}</button>`)
      .join('');
  }

  function paintAudioRow() {
    const pasoId = pasos[index].id;
    audioRow.innerHTML = BPM_OPTIONS.map((b) => {
      const url = store.getAudioFor(pasoId, b);
      if (url) {
        return `
          <div class="audio-chip has-audio">
            <button class="audio-play" data-play="${b}" type="button">▶ ${b}</button>
            <button class="audio-del icon-btn" data-del="${b}" type="button" aria-label="Quitar audio de ${b} BPM">🗑</button>
          </div>`;
      }
      return `
        <label class="audio-chip audio-upload">
          + ${b}
          <input type="file" accept="audio/*" data-upload="${b}" hidden />
        </label>`;
    }).join('');

    audioRow.querySelectorAll('[data-play]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const refBpm = Number(btn.dataset.play);
        const url = store.getAudioFor(pasoId, refBpm);
        if (!url) return;
        // Sincronizar el metrónomo a la velocidad exacta de este audio de
        // referencia (ver DECISIONES.md punto 44): así suenan a la par.
        setBpm(refBpm);
        const audio = new Audio(url);
        audio.volume = demoVolume;
        audio.play().catch(() => toast('No se pudo reproducir el audio.'));
      });
    });
    audioRow.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        store.removeCustomAudio(pasoId, Number(btn.dataset.del));
        paintAudioRow();
      });
    });
    audioRow.querySelectorAll('[data-upload]').forEach((input) => {
      input.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          store.setCustomAudio(pasoId, Number(input.dataset.upload), reader.result);
          toast('Audio guardado para este paso.');
          paintAudioRow();
        };
        reader.readAsDataURL(file);
      });
    });
  }

  // Se incrementa en cada llamada a paintTonalidad(): permite descartar el
  // resultado de la normalización de tamaño (ver más abajo) si para cuando
  // termina de cargar la imagen el usuario ya cambió de paso otra vez.
  let paintGeneration = 0;

  function paintTonalidad() {
    const p = pasos[index];
    const myGeneration = ++paintGeneration;
    tonalidadNombre.textContent = p.etiqueta;
    // Nuevo paso: se vuelve a arrancar por el sistema de arriba y se
    // descarta la detección de límite entre sistemas de la imagen anterior
    // (ver DECISIONES.md punto 58) — se recalcula sola más abajo si
    // corresponde.
    systemIndex = 0;
    systemLayout = null;
    const customImg = store.getImageFor(p.id) || p.imagenUrl;
    if (customImg) {
      scoreFrame.innerHTML = `
        <div class="score-inner">
          <img src="${customImg}" alt="Partitura: ${p.etiqueta}" />
          <div class="score-cursor"></div>
        </div>`;
      const imgEl = scoreFrame.querySelector('img');
      zoomCtl.reset(); // valor neutro mientras se analiza esta imagen puntual
      // Capa de anotaciones (ver DECISIONES.md punto 67): una instancia por
      // paso, atada a SU imagen y SU propio historial de trazos (`p.id`). No
      // hace falta esperar a que la imagen termine de cargar para crearla —
      // `attachAnnotationLayer` ya se encarga de eso puertas adentro.
      if (annotationLayer) annotationLayer.destroy();
      const scoreInnerEl = scoreFrame.querySelector('.score-inner');
      annotationLayer = attachAnnotationLayer(scoreInnerEl, imgEl, p.id);
      annotationLayer.setTool(annotateTool, annotateColor);
      annotationLayer.setMenuCollapseCallback(() => {
        annotateOpen = false;
        syncAnnotateUI();
      });
      annotateWidget.hidden = false;
      // Normalización + maximización automática de tamaño visual entre
      // pasos (ver DECISIONES.md puntos 31 y 33): se calcula recién cuando
      // la imagen terminó de cargar y de disponer su layout (hace falta su
      // naturalWidth/naturalHeight y su caja ya renderizada).
      const applyNormalization = () => {
        if (myGeneration !== paintGeneration) return; // el usuario ya avanzó a otro paso: no pisarlo
        applyAutoTransform();
        // Ver DECISIONES.md punto 59: se detecta la estructura real de la
        // imagen (sistemas + barras de compás) una sola vez por imagen
        // cargada, no en cada beat. Se intenta siempre (no solo en pasos de
        // 2 sistemas): un paso de 1 solo sistema también se beneficia de
        // que la barra caiga exacta en cada compás real.
        systemLayout = detectSystemLayout(imgEl);
        updateSystemVisuals();
      };
      if (imgEl.complete && imgEl.naturalWidth) applyNormalization();
      else imgEl.addEventListener('load', applyNormalization, { once: true });
    } else {
      // Los placeholders SVG ya se generan con proporciones consistentes
      // entre sí, así que no necesitan normalización (ver DECISIONES.md
      // punto 31). Igual van envueltos en `.score-inner` (ver punto 58):
      // el zoom táctil siempre transforma ese contenedor, no la imagen/SVG
      // directo.
      scoreFrame.innerHTML = `<div class="score-inner">${scorePlaceholderSVG({
        tonalidad: p.etiqueta,
        articulacion: ARTICULACION_LABEL[exercise.articulacion] || exercise.articulacion,
        tipo: exercise.tipo,
        nivel: exercise.nivel,
      })}</div>`;
      zoomCtl.reset();
      // Sin imagen propia (placeholder SVG genérico): no hay nada real para
      // anotar encima — se oculta el botón flotante y se descarta la capa
      // del paso anterior, si había una (ver DECISIONES.md punto 67).
      if (annotationLayer) { annotationLayer.destroy(); annotationLayer = null; }
      annotateWidget.hidden = true;
    }
    annotateOpen = false;
    syncAnnotateUI();
    paintDots();
    paintAudioRow();
    beatsElapsedInSistema = 0;
    renderSegments();
  }

  /**
   * Dibuja la barra de progreso como segmentos discretos — uno por cada
   * tiempo del SISTEMA activo (o de la cuenta de anticipación, mientras esa
   * fase está activa; con 1 solo sistema por paso, del paso entero — ver
   * DECISIONES.md punto 58) — y los va completando exactamente cuando el
   * metrónomo dispara cada beat. Ver DECISIONES.md punto 24.
   */
  function renderSegments() {
    const inCountIn = phase === 'countin';
    const total = inCountIn ? countInBeatsTotal() : beatsPerSistema();
    const filled = inCountIn ? countInElapsed : beatsElapsedInSistema;
    progressLabel.textContent = inCountIn ? `Cuenta de entrada · ${countInElapsed}/${total}` : '';
    progressLabel.classList.toggle('countin', inCountIn);
    progressSegments.innerHTML = Array.from({ length: total }, (_, i) => (
      `<span class="progress-segment ${i < filled ? 'filled' : ''}"></span>`
    )).join('');
  }

  /**
   * Único punto de avance de paso: llamado desde el callback de beat del
   * metrónomo (ver handleBeat), nunca desde un timer aparte — salvo el caso
   * `manual: true` (ver DECISIONES.md punto 51), para los saltos que pide el
   * propio usuario (⏮/⏭/cuadraditos) en vez del avance automático de fin de
   * compás.
   */
  function goTo(newIndex, { manual = false } = {}) {
    if (newIndex >= pasos.length) {
      stopAll();
      finishExercise(exercise, fromRoute, navigate);
      return;
    }
    index = Math.max(0, newIndex);
    paintTonalidad();
    // Salto manual en pleno play: el metrónomo seguía sonando con la fase
    // vieja (el próximo click caía en el tiempo que le tocaba al paso
    // ANTERIOR, no en el tiempo 1 del nuevo) — se reinicia el metrónomo para
    // que el próximo click sea de verdad el tiempo 1 del paso nuevo. El
    // avance automático (sin `manual: true`, disparado al llegar
    // naturalmente al último tiempo del compás) no lo necesita: ya llega
    // perfectamente alineado por construcción.
    if (manual && phase === 'playing' && mode === 'auto') {
      metronome.stop();
      metronome.start({ bpm, accentEvery: acentoCada, volume: metronomeVolume, onBeat: handleBeat });
    }
  }

  /**
   * Único callback de tiempo real: lo dispara el metrónomo (lookahead
   * scheduling) para cada tiempo que efectivamente suena. Durante la cuenta
   * de anticipación solo cuenta tiempos sin tocar el paso/imagen; durante la
   * reproducción, completa el segmento correspondiente y dispara el cambio
   * de paso exactamente en el último tiempo del compás. Ver DECISIONES.md
   * puntos 24 y 27.
   */
  function handleBeat() {
    if (phase === 'countin') {
      countInElapsed++;
      renderSegments();
      if (countInElapsed >= countInBeatsTotal()) {
        phase = 'playing';
        renderSegments();
        updateSystemVisuals(); // recién ahora corresponde mostrar barra/atenuado (ver punto 58)
      }
      return;
    }
    if (phase !== 'playing') return;
    // Ver DECISIONES.md punto 65: la barra se mueve ANTES de sumar el
    // tiempo que acaba de sonar, no después — `beatsElapsedInSistema`
    // (todavía sin incrementar acá) es exactamente el índice 0-based del
    // tiempo que está sonando en este click (0 en el primer tiempo real
    // tras la cuenta de entrada, 1 en el segundo, etc.). Sumar primero y
    // recién después mover la barra la hacía mostrar siempre el tiempo
    // SIGUIENTE al que realmente estaba sonando.
    updateCursorPosition();
    beatsElapsedInSistema++;
    renderSegments();
    if (beatsElapsedInSistema >= beatsPerSistema()) {
      // Ver DECISIONES.md punto 66: el cambio de sistema/paso reescribe la
      // posición de la barra (al posicionarla al principio del sistema
      // nuevo) en el mismo tick de JS que acaba de moverla al ÚLTIMO
      // tiempo del sistema viejo — el navegador nunca llega a pintar ese
      // último tiempo antes de que se pise, así que se veía como si la
      // barra "saltara" el último tiempo. Se retrasa el cambio un
      // instante (una fracción chica del tiempo actual, nunca más de
      // 150ms) para darle al navegador la oportunidad de pintar esa
      // última posición antes de reemplazarla — el sonido/conteo del
      // metrónomo no se retrasa, solo el cambio visual/de imagen.
      const beatMs = 60000 / bpm;
      const deferMs = Math.min(150, beatMs * 0.4);
      setTimeout(() => {
        if (phase !== 'playing') return; // se pausó/cambió de paso durante la espera
        // Ver DECISIONES.md punto 58: si el paso tiene 2 sistemas y todavía
        // está sonando el de arriba, se salta al de abajo SIN cambiar de
        // paso (mismo `index`, misma imagen) — recién cuando termina el de
        // abajo (o el paso es de 1 solo sistema) se avanza al próximo paso.
        if (systemIndex === 0 && pasoTieneDosSistemas(pasos[index])) {
          systemIndex = 1;
          beatsElapsedInSistema = 0;
          renderSegments();
          updateSystemVisuals();
        } else {
          goTo(index + 1);
        }
      }, deferMs);
    }
  }

  /**
   * Ver DECISIONES.md puntos 58/59/65: posiciona la barra de práctica
   * sobre el sistema activo, según lo que haya encontrado
   * `detectSystemLayout()` para la imagen actual. Los dos sistemas quedan
   * siempre a la vista, sin atenuar el que no suena (se probó atenuando
   * el inactivo y el usuario pidió sacarlo — solo quiere la barra
   * deslizando, ver punto 65). Sin detección, o fuera de modo
   * automático/reproduciendo, no se muestra nada — la función es segura
   * de llamar en cualquier momento, no solo desde `handleBeat`.
   */
  function updateSystemVisuals() {
    const cursor = scoreFrame.querySelector('.score-cursor');
    if (!cursor) return;
    const systems = systemLayout && systemLayout.systems;
    const activo = phase === 'playing' && mode === 'auto' && systems && systems.length > 0;
    if (!activo) {
      cursor.classList.remove('active');
      return;
    }
    // Defensivo: si el paso está marcado con 2 sistemas pero la detección
    // solo encontró 1 (falló para el de abajo, por ejemplo), no se
    // referencia un índice que no existe — se limita al de arriba.
    const clampedIndex = Math.min(systemIndex, systems.length - 1);
    const activeSystem = systems[clampedIndex];
    cursor.style.top = `${activeSystem.topFrac * 100}%`;
    cursor.style.height = `${(activeSystem.bottomFrac - activeSystem.topFrac) * 100}%`;
    cursor.classList.add('active');
    updateCursorPosition();
  }

  /**
   * Mueve la barra de práctica a la posición horizontal correspondiente a
   * `beatsElapsedInSistema` dentro del sistema activo. Ver DECISIONES.md
   * punto 59: usa los segmentos REALES por compás detectados por
   * `detectSystemLayout()` cuando hay suficientes (uno por cada compás
   * configurado) — interpola dentro del compás actual asumiendo tiempos
   * parejos dentro de ESE compás puntual (no de todo el sistema), mucho más
   * preciso que repartir parejo todo el sistema. Si no hay suficientes
   * segmentos detectados (desajuste con los compases cargados a mano, o
   * detección fallida), cae a velocidad pareja en todo el sistema como
   * antes (punto 58) — degradación segura, nunca se rompe.
   */
  function updateCursorPosition() {
    const cursor = scoreFrame.querySelector('.score-cursor');
    if (!cursor || !cursor.classList.contains('active')) return;
    const total = beatsPerSistema();
    const fallbackFrac = total > 0 ? Math.min(1, beatsElapsedInSistema / total) : 0;
    const compasIndex = Math.floor(beatsElapsedInSistema / tiempos);
    const beatInCompas = beatsElapsedInSistema % tiempos;
    let frac = fallbackFrac;

    // Ver DECISIONES.md punto 64: si el paso trae `ritmoArriba`/`ritmoAbajo`
    // (posición real de cada tiempo, extraída del MusicXML original — no
    // de la imagen) se usa esa posición exacta en vez de repartir parejo
    // dentro del compás. Es opcional por paso: sin esos datos (la inmensa
    // mayoría de los pasos existentes, que no tienen un MusicXML de
    // origen) se cae al reparto por compás detectado en la imagen (punto
    // 59), y si tampoco hay eso, al reparto parejo de todo el sistema
    // (punto 58) — tres niveles, cada uno más preciso que el anterior,
    // ninguno rompe si falta el dato de arriba.
    const paso = pasos[index];
    const ritmo = systemIndex === 0 ? paso.ritmoArriba : paso.ritmoAbajo;
    if (ritmo && ritmo[compasIndex] && ritmo[compasIndex][beatInCompas] != null) {
      frac = ritmo[compasIndex][beatInCompas];
    } else {
      const systems = systemLayout && systemLayout.systems;
      const clampedIndex = systems ? Math.min(systemIndex, systems.length - 1) : -1;
      const segments = systems && systems[clampedIndex] ? systems[clampedIndex].segmentsFrac : null;
      if (segments && segments.length > compasIndex) {
        const [segStart, segEnd] = segments[compasIndex];
        frac = segStart + (segEnd - segStart) * (beatInCompas / tiempos);
      }
    }
    cursor.style.left = `${frac * 100}%`;
  }

  function stopAll() {
    playing = false;
    phase = 'stopped';
    playBtn.querySelector('.bg-play').innerHTML = ICON_PLAY;
    metronome.stop();
    renderSegments();
    updateSystemVisuals(); // apaga barra/atenuado (ver DECISIONES.md punto 58)
  }

  function togglePlay() {
    if (mode !== 'auto') return; // el botón de play queda oculto en modo manual; guarda defensiva
    if (playing) {
      stopAll();
      return;
    }
    playing = true;
    playBtn.querySelector('.bg-play').innerHTML = ICON_PAUSE;
    // Cada vez que se arranca (incluso al reanudar de una pausa) hay cuenta
    // de anticipación: ver DECISIONES.md punto 27.
    phase = 'countin';
    countInElapsed = 0;
    renderSegments();
    metronome.start({ bpm, accentEvery: acentoCada, volume: metronomeVolume, onBeat: handleBeat });
  }

  /**
   * Modo automático (metrónomo/BPM) vs. manual (pedal/teclado/toque, ver
   * DECISIONES.md punto 32): oculta/muestra de un saque todos los controles
   * que solo tienen sentido en modo automático (barra de progreso por
   * tiempo, BPM, volumen del metrónomo, play/pausa) y muestra en su lugar el
   * instructivo de modo manual. El volumen del metrónomo vive dentro del
   * panel colapsable "ajustes avanzados" (ver DECISIONES.md ronda 6, punto
   * 35), así que se oculta/muestra dentro de ese panel independientemente de
   * si está expandido o no. El acento ya no tiene control en esta pantalla
   * (es fijo por ejercicio, ver punto 42), así que no hay nada que ocultar
   * para él acá.
   */
  function syncModeVisibility() {
    const isManual = mode === 'manual';
    modePicker.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c.dataset.mode === mode));
    autoProgressBlock.hidden = isManual;
    autoConfigBlock.hidden = isManual;
    syncVolumeToggles();
    manualHint.hidden = !isManual;
    playBtn.hidden = isManual;
  }

  /**
   * Teclas de avance/retroceso manual: son las mismas que emulan los pedales
   * Bluetooth de "pasar página" para tablets/celulares que usan los músicos
   * (no hace falta soporte de hardware especial, el pedal ya manda estas
   * teclas). Solo activo en modo manual — ver DECISIONES.md punto 32.
   */
  function onKeyDown(e) {
    if (mode !== 'manual') return;
    if (['ArrowRight', 'ArrowDown', ' ', 'Spacebar', 'PageDown'].includes(e.key)) {
      e.preventDefault();
      goTo(index + 1);
    } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
      e.preventDefault();
      goTo(index - 1);
    }
  }
  window.addEventListener('keydown', onKeyDown);

  syncModeVisibility();
  paintTonalidad();
  cleanupFn = () => {
    document.removeEventListener('fullscreenchange', onFsChange);
    document.removeEventListener('pointerdown', onDocumentPointerDown);
    window.removeEventListener('keydown', onKeyDown);
    scoreFrameResizeObserver.disconnect();
    clearTimeout(resizeObserverTimer);
    if (annotationLayer) annotationLayer.destroy();
  };

  modePicker.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mode]');
    if (!btn || btn.dataset.mode === mode) return;
    stopAll(); // corta metrónomo/cuenta de anticipación si estaba sonando al cambiar de modo
    mode = btn.dataset.mode;
    syncModeVisibility();
    saveSettings(exercise, { bpm, mode });
  });

  // Cuadraditos de paso (ver paintDots): saltan directo al paso tocado.
  dots.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-step]');
    if (!btn) return;
    const target = Number(btn.dataset.step);
    if (target === index) return;
    goTo(target, { manual: true });
  });

  playBtn.addEventListener('click', togglePlay);
  container.querySelector('#prevBtn').addEventListener('click', () => goTo(index - 1, { manual: true }));
  container.querySelector('#nextBtn').addEventListener('click', () => goTo(index + 1, { manual: true }));

  /**
   * Cambia el BPM en vivo y lo propaga a todo lo que depende de él —
   * metrónomo, UI del slider y persistencia — desde un único lugar (ver
   * DECISIONES.md punto 44). Lo usan tanto el slider (arrastrado a mano)
   * como la sincronización automática al tocar un audio de referencia.
   */
  function setBpm(newBpm) {
    bpm = Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(newBpm)));
    bpmSlider.value = bpm;
    bpmValue.textContent = `${bpm} BPM`;
    saveSettings(exercise, { bpm, mode });
    metronome.setBpm(bpm);
  }

  bpmSlider.addEventListener('input', () => setBpm(Number(bpmSlider.value)));

  metroVolSlider.addEventListener('input', () => {
    metronomeVolume = Number(metroVolSlider.value) / 100;
    metroVolValue.textContent = `${metroVolSlider.value}%`;
    metronome.setVolume(metronomeVolume);
    store.setAudioSettings({ metronomeVolume });
  });
  demoVolSlider.addEventListener('input', () => {
    demoVolume = Number(demoVolSlider.value) / 100;
    demoVolValue.textContent = `${demoVolSlider.value}%`;
    store.setAudioSettings({ demoVolume });
  });

  container.querySelector('#finishBtn').addEventListener('click', () => {
    stopAll();
    finishExercise(exercise, fromRoute, navigate);
  });
}

// ---------------------------------------------------------------------
// Fin de ejercicio: registrar progreso y volver
// ---------------------------------------------------------------------

/**
 * Único punto de "fin de ejercicio" (llamado tanto al tocar "Terminar" como
 * al llegar naturalmente al último paso en modo automático). Ver
 * DECISIONES.md punto 68: antes acá se mostraba una hoja pidiendo "¿cómo te
 * salió? me costó/normal/bien" — el usuario pidió sacarla ("siento que no
 * suma en nada"), así que ahora se registra directamente como si la
 * respuesta hubiera sido "normal" (la repetición espaciada de `store.js`
 * sigue funcionando exactamente igual, solo que ya no distingue dificultad:
 * ver comentario en `store.recordRating`).
 */
function finishExercise(exercise, fromRoute, navigate) {
  store.recordRating(exercise.id, 'normal');
  store.recordPracticeDay(); // racha semanal de "Hoy", ver DECISIONES.md punto 75
  if (fromRoute === 'hoy') store.markStepDone(exercise.id);
  toast('¡Listo! Seguí así.');
  navigate(fromRoute === 'hoy' ? '#/hoy' : '#/biblioteca');
}
