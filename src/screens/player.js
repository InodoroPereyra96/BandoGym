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
// En ambos casos termina con la calificación "me costó / normal / bien".
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
import { tiemposPorCompas, pasoCompases, isValidBpm } from '../data.js';
import { scorePlaceholderSVG, formatMMSS, computeContentTransform, escapeHTML } from '../util.js';
import { NIVEL_LABEL, ARTICULACION_LABEL, BPM_OPTIONS, BPM_MIN, BPM_MAX, GRUPO_ARPEGIOS_MENORES, NOMBRE_GRUPO_ARPEGIOS_MENORES } from '../theory.js';
import { toast } from '../ui.js';
import { createMetronome } from '../metronome.js';
import { attachPinchZoom } from '../zoom.js';

let cleanupFn = null;
const metronome = createMetronome();

// Íconos de transporte (ver DECISIONES.md punto 46): reemplazan los
// glyphs de emoji (▶ ⏸ ⏮ ⏭) por SVG propio, mismo trazo redondeado que el
// resto de los íconos nuevos de la app (ver punto 45).
const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="0.5" stroke-linejoin="round"><path d="M7 4.8v14.4c0 .9 1 1.4 1.7.9l11-7.2c.6-.4.6-1.3 0-1.7l-11-7.2C8 3.4 7 3.9 7 4.8z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4.5" height="16" rx="1.4"/><rect x="13.5" y="4" width="4.5" height="16" rx="1.4"/></svg>';
const ICON_PREV = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="2.6" height="14" rx="1"/><path d="M18 6.2v11.6c0 .9-1 1.4-1.7.9l-8-5.8c-.6-.4-.6-1.3 0-1.8l8-5.8c.7-.5 1.7 0 1.7.9z"/></svg>';
const ICON_NEXT = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="16.4" y="5" width="2.6" height="14" rx="1"/><path d="M6 6.2v11.6c0 .9 1 1.4 1.7.9l8-5.8c.6-.4.6-1.3 0-1.8l-8-5.8c-.7-.5-1.7 0-1.7.9z"/></svg>';

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
  // Por si se navega afuera del reproductor con la hoja de calificación abierta
  // (ej. botón atrás del navegador): no debe quedar huérfana sobre otra pantalla.
  const overlay = document.getElementById('ratingOverlay');
  if (overlay) overlay.remove();
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
        <button class="icon-btn icon-btn-lg" id="playBtn" aria-label="Reproducir / pausar">${ICON_PLAY}</button>
      </div>

      <button class="btn btn-wine" id="finishBtn">Terminar y calificar</button>
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
      playBtn.innerHTML = ICON_PAUSE;
      intervalId = setInterval(tick, 200);
    } else {
      elapsedBefore = currentElapsed();
      playBtn.innerHTML = ICON_PLAY;
      clearInterval(intervalId);
    }
  }

  playBtn.addEventListener('click', togglePlay);
  container.querySelector('#finishBtn').addEventListener('click', () => {
    if (playing) togglePlay();
    showRatingOverlay(exercise, fromRoute, navigate);
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
        <p>Este ejercicio todavía no tiene imágenes cargadas.<br>Agregalas desde "Nuevo ejercicio".</p>
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
  let beatsElapsedInPaso = 0;
  let countInElapsed = 0;

  // Cuántos tiempos dura un paso / la cuenta de anticipación completa, en
  // tiempos reales del compás del ejercicio (no siempre 4). Ver DECISIONES.md
  // punto 23. Los compases del paso actual (no un valor global — ver
  // DECISIONES.md ronda 6, punto 34) se leen en cada llamada, así que cambian
  // solos al cambiar de paso sin ningún control aparte.
  function beatsPerPaso() {
    const compasesDeEstePaso = pasoCompases(pasos[index], exercise);
    return Math.max(1, compasesDeEstePaso * tiempos);
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
      </div>

      <div class="player-side">
        <div class="config-block config-block-solo" id="modeBlock">
          <div class="config-label">Modo de avance</div>
          <div class="chip-row chip-row-center" id="modePicker">
            <button type="button" class="chip" data-mode="auto">🎵 Auto (metrónomo)</button>
            <button type="button" class="chip" data-mode="manual">✋ Manual</button>
          </div>
        </div>

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
          <button class="icon-btn icon-btn-lg" id="playBtn" aria-label="Reproducir / pausar">${ICON_PLAY}</button>
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

        <button type="button" class="btn btn-outline btn-sm advanced-toggle" id="advancedToggle" aria-expanded="false"></button>
        <div class="advanced-panel" id="advancedPanel" hidden>
          <div class="section-title">Volumen</div>
          <div class="volume-row">
            <div class="volume-block" id="metroVolBlock">
              <div class="volume-block-label"><span>🔔 Metrónomo</span><span class="value" id="metroVolValue"></span></div>
              <input type="range" id="metroVolSlider" min="0" max="100" step="1" aria-label="Volumen del metrónomo" />
            </div>
            <div class="volume-block">
              <div class="volume-block-label"><span>🎧 Audio de demostración</span><span class="value" id="demoVolValue"></span></div>
              <input type="range" id="demoVolSlider" min="0" max="100" step="1" aria-label="Volumen del audio de demostración" />
            </div>
          </div>
        </div>

        <div class="section-title">Audio de demostración</div>
        <div class="audio-row" id="audioRow"></div>

        <div class="footer-row">
          <button class="btn btn-wine" id="finishBtn">Terminar y calificar</button>
        </div>
      </div>
    </div>
  `;

  const scoreFrameWrap = container.querySelector('#scoreFrameWrap');
  const scoreFrame = container.querySelector('#scoreFrame');
  const fullscreenBtn = container.querySelector('#fullscreenBtn');
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
  const manualHint = container.querySelector('#manualHint');
  const advancedToggle = container.querySelector('#advancedToggle');
  const advancedPanel = container.querySelector('#advancedPanel');

  metroVolSlider.value = Math.round(metronomeVolume * 100);
  demoVolSlider.value = Math.round(demoVolume * 100);
  metroVolValue.textContent = `${metroVolSlider.value}%`;
  demoVolValue.textContent = `${demoVolSlider.value}%`;

  /**
   * Sección colapsable de "ajustes avanzados" (volúmenes — el acento se
   * mudó a "Nuevo"/"Editar ejercicio", ver DECISIONES.md punto 42; en su
   * momento también vivía acá, ver ronda 6, punto 35): en horizontal (donde
   * todo tiene que entrar sin scroll vertical) arranca colapsada para minimizar la altura
   * usada por defecto; en vertical (donde esta pantalla igual permite
   * scroll) arranca expandida, como se veía antes de este cambio.
   */
  function isLandscapeNow() {
    return window.matchMedia && window.matchMedia('(orientation: landscape)').matches;
  }
  let advancedOpen = !isLandscapeNow();
  function syncAdvancedVisibility() {
    advancedPanel.hidden = !advancedOpen;
    advancedToggle.setAttribute('aria-expanded', String(advancedOpen));
    advancedToggle.textContent = advancedOpen ? '⚙ Ocultar volumen' : '⚙ Volumen';
  }
  advancedToggle.addEventListener('click', () => {
    advancedOpen = !advancedOpen;
    syncAdvancedVisibility();
  });

  // Modo manual (ver DECISIONES.md punto 32): tocar la partitura avanza o
  // retrocede según la mitad tocada (ver DECISIONES.md ronda 6, punto 36) —
  // mitad derecha avanza, mitad izquierda retrocede. El doble-tap para zoom
  // sigue funcionando sin conflicto (ver zoom.js).
  const zoomCtl = attachPinchZoom(scoreFrame, () => scoreFrame.querySelector('img, svg'), {
    onSingleTap: ({ x } = {}) => {
      if (mode !== 'manual') return;
      const rect = scoreFrame.getBoundingClientRect();
      const isRightHalf = typeof x === 'number' ? (x - rect.left) > rect.width / 2 : true;
      goTo(isRightHalf ? index + 1 : index - 1);
    },
  });

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

  function onFsChange() {
    const isFs = document.fullscreenElement === scoreFrameWrap;
    fullscreenBtn.textContent = isFs ? '✕' : '⛶';
    fullscreenBtn.setAttribute('aria-label', isFs ? 'Salir de pantalla completa' : 'Pantalla completa');
    // El marco cambia de tamaño real al entrar/salir de pantalla completa
    // (ver reglas :fullscreen en styles.css): se espera un frame a que el
    // navegador termine de aplicar el nuevo layout antes de remedirlo.
    requestAnimationFrame(applyAutoTransform);
  }
  document.addEventListener('fullscreenchange', onFsChange);

  // Cambios de tamaño de ventana/orientación (fuera de pantalla completa)
  // también cambian el marco disponible — se recalcula con un debounce
  // chico para no recalcular en cada píxel mientras se redimensiona.
  let resizeTimer = null;
  function onWindowResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyAutoTransform, 150);
  }
  window.addEventListener('resize', onWindowResize);

  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      const requestFs = scoreFrameWrap.requestFullscreen || scoreFrameWrap.webkitRequestFullscreen;
      if (!requestFs) {
        toast('Pantalla completa no está disponible en este navegador.');
        return;
      }
      const result = requestFs.call(scoreFrameWrap);
      if (result && typeof result.catch === 'function') {
        result.catch(() => toast('No se pudo activar pantalla completa.'));
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
   * paso — `goTo` ya reseteaba `beatsElapsedInPaso` a 0 en cada cambio de
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
    const customImg = store.getImageFor(p.id) || p.imagenUrl;
    if (customImg) {
      scoreFrame.innerHTML = `<img src="${customImg}" alt="Partitura: ${p.etiqueta}" />`;
      const imgEl = scoreFrame.querySelector('img');
      zoomCtl.reset(); // valor neutro mientras se analiza esta imagen puntual
      // Normalización + maximización automática de tamaño visual entre
      // pasos (ver DECISIONES.md puntos 31 y 33): se calcula recién cuando
      // la imagen terminó de cargar y de disponer su layout (hace falta su
      // naturalWidth/naturalHeight y su caja ya renderizada).
      const applyNormalization = () => {
        if (myGeneration !== paintGeneration) return; // el usuario ya avanzó a otro paso: no pisarlo
        applyAutoTransform();
      };
      if (imgEl.complete && imgEl.naturalWidth) applyNormalization();
      else imgEl.addEventListener('load', applyNormalization, { once: true });
    } else {
      // Los placeholders SVG ya se generan con proporciones consistentes
      // entre sí, así que no necesitan normalización (ver DECISIONES.md
      // punto 31).
      scoreFrame.innerHTML = scorePlaceholderSVG({
        tonalidad: p.etiqueta,
        articulacion: ARTICULACION_LABEL[exercise.articulacion] || exercise.articulacion,
        tipo: exercise.tipo,
        nivel: exercise.nivel,
      });
      zoomCtl.reset();
    }
    paintDots();
    paintAudioRow();
    beatsElapsedInPaso = 0;
    renderSegments();
  }

  /**
   * Dibuja la barra de progreso como segmentos discretos — uno por cada
   * tiempo del paso actual (o de la cuenta de anticipación, mientras esa
   * fase está activa) — y los va completando exactamente cuando el
   * metrónomo dispara cada beat. Ver DECISIONES.md punto 24.
   */
  function renderSegments() {
    const inCountIn = phase === 'countin';
    const total = inCountIn ? countInBeatsTotal() : beatsPerPaso();
    const filled = inCountIn ? countInElapsed : beatsElapsedInPaso;
    progressLabel.textContent = inCountIn ? `Cuenta de entrada · ${countInElapsed}/${total}` : '';
    progressLabel.classList.toggle('countin', inCountIn);
    progressSegments.innerHTML = Array.from({ length: total }, (_, i) => (
      `<span class="progress-segment ${i < filled ? 'filled' : ''}"></span>`
    )).join('');
  }

  /** Único punto de avance de paso: llamado desde el callback de beat del
   * metrónomo (ver handleBeat), nunca desde un timer aparte. */
  function goTo(newIndex) {
    if (newIndex >= pasos.length) {
      stopAll();
      showRatingOverlay(exercise, fromRoute, navigate);
      return;
    }
    index = Math.max(0, newIndex);
    paintTonalidad();
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
      }
      return;
    }
    if (phase !== 'playing') return;
    beatsElapsedInPaso++;
    renderSegments();
    if (beatsElapsedInPaso >= beatsPerPaso()) {
      goTo(index + 1);
    }
  }

  function stopAll() {
    playing = false;
    phase = 'stopped';
    playBtn.innerHTML = ICON_PLAY;
    metronome.stop();
    renderSegments();
  }

  function togglePlay() {
    if (mode !== 'auto') return; // el botón de play queda oculto en modo manual; guarda defensiva
    if (playing) {
      stopAll();
      return;
    }
    playing = true;
    playBtn.innerHTML = ICON_PAUSE;
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
    metroVolBlock.hidden = isManual;
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
  syncAdvancedVisibility();
  paintTonalidad();
  cleanupFn = () => {
    document.removeEventListener('fullscreenchange', onFsChange);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('resize', onWindowResize);
    clearTimeout(resizeTimer);
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
    goTo(target);
  });

  playBtn.addEventListener('click', togglePlay);
  container.querySelector('#prevBtn').addEventListener('click', () => goTo(index - 1));
  container.querySelector('#nextBtn').addEventListener('click', () => goTo(index + 1));

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
    showRatingOverlay(exercise, fromRoute, navigate);
  });
}

// ---------------------------------------------------------------------
// Calificación al terminar
// ---------------------------------------------------------------------

function showRatingOverlay(exercise, fromRoute, navigate) {
  const existing = document.getElementById('ratingOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'rating-overlay';
  overlay.id = 'ratingOverlay';
  overlay.innerHTML = `
    <div class="rating-sheet">
      <h2>¿Cómo te salió?</h2>
      <div class="rating-buttons">
        <button class="rating-btn costo" data-rating="costo">Me costó</button>
        <button class="rating-btn normal" data-rating="normal">Normal</button>
        <button class="rating-btn bien" data-rating="bien">Bien</button>
      </div>
      <button class="btn btn-ghost btn-sm" id="cancelRating" style="margin-top:10px;">Seguir practicando</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('[data-rating]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.recordRating(exercise.id, btn.dataset.rating);
      if (fromRoute === 'hoy') store.markStepDone(exercise.id);
      overlay.remove();
      toast('¡Registrado! Seguí así.');
      navigate(fromRoute === 'hoy' ? '#/hoy' : '#/biblioteca');
    });
  });

  overlay.querySelector('#cancelRating').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
