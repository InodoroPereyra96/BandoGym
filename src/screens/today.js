// Pantalla "Hoy": rutina diaria armada según nivel, tiempo disponible y
// repetición espaciada. Orden de pasos fijo (ritual); contenido variable.

import * as store from '../store.js';
import { NIVEL_LABEL, TIPO_LABEL, ARTICULACION_LABEL, GRUPO_ARPEGIOS_MENORES, NOMBRE_GRUPO_ARPEGIOS_MENORES } from '../theory.js';
import { articulacionBadge, fmtMin, toast } from '../ui.js';
import { computeGroupDurationMin } from '../data.js';

const TIME_OPTIONS = [15, 30, 45];
const TIMEBUDGET_KEY = 'fuelle:timeBudget';

function getSavedBudget() {
  const v = Number(localStorage.getItem(TIMEBUDGET_KEY));
  return TIME_OPTIONS.includes(v) ? v : 30;
}

function saveBudget(v) {
  localStorage.setItem(TIMEBUDGET_KEY, String(v));
}

export function render(container, { navigate }) {
  const profile = store.getProfile();
  const budget = getSavedBudget();
  const state = store.ensureTodayState(profile.nivel, budget);

  container.innerHTML = `
    <div class="eyebrow">Nivel: ${NIVEL_LABEL[profile.nivel]}</div>
    <p class="subtitle">Tu ritual de hoy, en orden: primero fuelle, después escalas y arpegios.</p>

    <div class="section-title">Tiempo disponible</div>
    <div class="time-picker" id="timePicker">
      ${TIME_OPTIONS.map((t) => `<button class="time-chip ${t === budget ? 'active' : ''}" data-min="${t}">${t} min</button>`).join('')}
    </div>

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
              <span class="badge badge-tipo">${TIPO_LABEL[step.tipo]}</span>
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

  paintSteps();

  container.querySelector('#timePicker').addEventListener('click', (e) => {
    const btn = e.target.closest('.time-chip');
    if (!btn) return;
    const min = Number(btn.dataset.min);
    saveBudget(min);
    store.ensureTodayState(profile.nivel, min);
    render(container, { navigate });
  });

  container.querySelector('#regenBtn').addEventListener('click', () => {
    store.regenerateToday(profile.nivel, budget);
    toast('Rutina de hoy renovada.');
    paintSteps();
  });
}
