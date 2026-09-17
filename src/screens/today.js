// Pantalla "Hoy": rutina diaria armada según nivel, tiempo disponible y
// repetición espaciada. Orden de pasos fijo (ritual); contenido variable.

import * as store from '../store.js';
import { NIVEL_LABEL, ARTICULACION_LABEL, GRUPO_ARPEGIOS_MENORES, NOMBRE_GRUPO_ARPEGIOS_MENORES } from '../theory.js';
import { articulacionBadge, tipoBadge, fmtMin, toast } from '../ui.js';
import { computeGroupDurationMin } from '../data.js';
import { formatMMSS } from '../util.js';

const TIME_OPTIONS = [15, 30, 45];
const TIMEBUDGET_KEY = 'fuelle:timeBudget';

function getSavedBudget() {
  const v = Number(localStorage.getItem(TIMEBUDGET_KEY));
  return TIME_OPTIONS.includes(v) ? v : 30;
}

function saveBudget(v) {
  localStorage.setItem(TIMEBUDGET_KEY, String(v));
}

let timerInterval = null;

export function render(container, { navigate }) {
  const profile = store.getProfile();
  const budget = getSavedBudget();
  const state = store.ensureTodayState(profile.nivel, budget);

  container.innerHTML = `
    <div class="eyebrow">Nivel: ${NIVEL_LABEL[profile.nivel]}</div>
    <p class="subtitle">Tu ritual de hoy, en orden: primero fuelle, después escalas y arpegios.</p>

    <div class="streak-row">
      <div class="streak-days" id="streakDays"></div>
      <span class="streak-count" id="streakCount"></span>
    </div>

    <div class="section-title" id="timeSectionTitle"></div>
    <div id="timeSection"></div>

    <div class="section-title">Rutina de hoy</div>
    <div id="stepsList"></div>

    <button class="btn btn-outline btn-sm" id="regenBtn" style="margin-top:6px;">🔄 Rehacer selección de hoy</button>
  `;

  const stepsList = container.querySelector('#stepsList');

  function paintSteps() {
    const st = store.getTodayState();
    if (!st || st.steps.length === 0) {
      stepsList.innerHTML = `
        <div class="empty-state card">
          <div class="big-icon">♪</div>
          <p>Todavía no hay ejercicios cargados para este nivel.<br>Agregá alguno desde "Nuevo".</p>
        </div>`;
      return;
    }

    const doneCount = st.steps.filter((s) => s.done).length;

    stepsList.innerHTML = st.steps
      .map((step, i) => {
        const ex = store.getExerciseById(step.exerciseId);
        if (!ex) return '';
        const dur = fmtMin(computeGroupDurationMin(ex));
        const esArpegioMenor = step.grupoEspecial === GRUPO_ARPEGIOS_MENORES;
        const titulo = esArpegioMenor ? NOMBRE_GRUPO_ARPEGIOS_MENORES : ex.nombre;
        const swapAttrs = esArpegioMenor
          ? `data-cycle="${ex.id}" aria-label="Cambiar articulación" title="Cambiar articulación (cicla entre todas las variantes cargadas)"`
          : `data-swap="${ex.id}" aria-label="Pedir otro similar" title="Otro similar"`;
        return `
        <div class="card step-card ${step.done ? 'done' : ''}" data-exercise="${ex.id}">
          <div class="step-index">${step.done ? '✓' : i + 1}</div>
          <button class="card-tappable step-body" data-open="${ex.id}" style="border:none;padding:0;background:transparent;">
            <div class="card-title">${titulo}</div>
            <div class="card-meta">
              ${tipoBadge(step.tipo)}
              ${articulacionBadge(ex.articulacion)}
              <span>${dur}</span>
            </div>
          </button>
          <button class="icon-btn step-swap" ${swapAttrs}>⇄</button>
        </div>`;
      })
      .join('');

    const totalMin = st.steps.reduce((acc, s) => {
      const ex = store.getExerciseById(s.exerciseId);
      return acc + (ex ? computeGroupDurationMin(ex) : 0);
    }, 0);

    const progressLine = document.createElement('p');
    progressLine.className = 'subtitle';
    progressLine.style.marginTop = '14px';
    progressLine.textContent = `${doneCount} de ${st.steps.length} completados · ~${Math.round(totalMin)} min en total`;
    stepsList.appendChild(progressLine);

    stepsList.querySelectorAll('[data-open]').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigate(`#/practicar/${btn.dataset.open}?from=hoy`);
      });
    });

    stepsList.querySelectorAll('[data-swap]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const replacement = store.swapStep(btn.dataset.swap);
        if (replacement) {
          toast(`Cambiado por: ${replacement.nombre}`);
          paintSteps();
        } else {
          toast('No hay otro ejercicio similar disponible todavía.');
        }
      });
    });

    stepsList.querySelectorAll('[data-cycle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = store.cycleGrupoEspecialStep(btn.dataset.cycle);
        if (next) {
          toast(`Articulación: ${ARTICULACION_LABEL[next.articulacion] || next.articulacion}`);
          paintSteps();
        } else {
          toast('No hay otras articulaciones cargadas todavía.');
        }
      });
    });
  }

  /**
   * Racha semanal (ver DECISIONES.md punto 75): 7 bloques fijos, lunes a
   * domingo — se pintan una sola vez al entrar a la pantalla, no hace falta
   * repintarlos junto con `paintSteps()` (solo cambian al terminar un
   * ejercicio de verdad, que siempre implica salir de esta pantalla y
   * volver, es decir un `render()` nuevo).
   */
  function paintStreak() {
    const { week, completedCount } = store.getWeekStreak();
    container.querySelector('#streakDays').innerHTML = week
      .map((d) => `<i class="${d.isToday ? 'today' : d.done ? 'on' : ''}"></i>`)
      .join('');
    container.querySelector('#streakCount').textContent = `${completedCount} día${completedCount === 1 ? '' : 's'}`;
  }
  paintStreak();

  paintSteps();

  const timeSection = container.querySelector('#timeSection');
  const timeSectionTitle = container.querySelector('#timeSectionTitle');

  function clearTimerInterval() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  /**
   * Temporizador de sesión (ver DECISIONES.md punto 76): reemplaza el
   * picker de 15/30/45 min por un botón grande con cuenta atrás en cuanto
   * hay una sesión arrancada — el picker y el botón grande son estados
   * mutuamente excluyentes de la MISMA sección, nunca conviven. Se repinta
   * entera cada vez que cambia algo (elegir tiempo, pausar/continuar,
   * cancelar) en vez de tener rutas de actualización parcial separadas —
   * es una sección chica, no vale la pena la complejidad extra.
   */
  function paintTimeSection() {
    clearTimerInterval();
    const timer = store.getSessionTimer();

    if (!timer) {
      timeSectionTitle.textContent = 'Tiempo disponible';
      timeSection.innerHTML = `
        <div class="time-picker" id="timePicker">
          ${TIME_OPTIONS.map((t) => `<button class="time-chip ${t === budget ? 'active' : ''}" data-min="${t}">${t} min</button>`).join('')}
        </div>`;
      timeSection.querySelector('#timePicker').addEventListener('click', (e) => {
        const btn = e.target.closest('.time-chip');
        if (!btn) return;
        const min = Number(btn.dataset.min);
        saveBudget(min);
        store.ensureTodayState(profile.nivel, min);
        store.startSessionTimer(min);
        paintTimeSection();
        paintSteps();
      });
      return;
    }

    timeSectionTitle.textContent = 'Sesión de práctica';

    if (timer.done) {
      timeSection.innerHTML = `
        <button type="button" class="session-timer-btn done" id="sessionTimerBtn">
          ¡Tiempo cumplido! 🎉
          <span class="session-timer-sub">Tocá para elegir de nuevo</span>
        </button>`;
      timeSection.querySelector('#sessionTimerBtn').addEventListener('click', () => {
        store.resetSessionTimer();
        paintTimeSection();
      });
      return;
    }

    const label = timer.paused
      ? `⏸ Pausado — ${formatMMSS(timer.remainingMs / 1000)}`
      : `¡A estudiar! ${formatMMSS(timer.remainingMs / 1000)}`;

    timeSection.innerHTML = `
      <button type="button" class="session-timer-btn ${timer.paused ? 'paused' : ''}" id="sessionTimerBtn">${label}</button>
      <button type="button" class="session-timer-cancel" id="sessionTimerCancel">Cambiar tiempo</button>`;

    timeSection.querySelector('#sessionTimerBtn').addEventListener('click', () => {
      if (store.getSessionTimer().paused) store.resumeSessionTimer();
      else store.pauseSessionTimer();
      paintTimeSection();
    });
    timeSection.querySelector('#sessionTimerCancel').addEventListener('click', () => {
      store.resetSessionTimer();
      paintTimeSection();
    });

    // Solo tickea mientras está corriendo (no pausado) — pausar ya frena el
    // conteo del lado de los datos (ver `store.pauseSessionTimer`), acá
    // alcanza con no reprogramar el intervalo.
    if (!timer.paused) {
      timerInterval = setInterval(() => {
        const t = store.getSessionTimer();
        if (!t) { clearTimerInterval(); return; }
        if (t.done) {
          clearTimerInterval();
          toast('¡Se cumplió el tiempo de práctica!');
          paintTimeSection();
          return;
        }
        const btn = timeSection.querySelector('#sessionTimerBtn');
        if (btn) btn.textContent = `¡A estudiar! ${formatMMSS(t.remainingMs / 1000)}`;
      }, 1000);
    }
  }
  paintTimeSection();

  container.querySelector('#regenBtn').addEventListener('click', () => {
    store.regenerateToday(profile.nivel, budget);
    toast('Rutina de hoy renovada.');
    paintSteps();
  });
}

export function destroy() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}
