// Biblioteca de ejercicios: listado filtrable por nivel y tipo.

import * as store from '../store.js';
import { NIVELES, NIVEL_LABEL, TIPOS, TIPO_LABEL, GRUPO_ARPEGIOS_MENORES, NOMBRE_GRUPO_ARPEGIOS_MENORES } from '../theory.js';
import { articulacionBadge, nivelBadge, fmtMin } from '../ui.js';
import { computeGroupDurationMin } from '../data.js';

let filters = { nivel: 'todos', tipo: 'todos' };

export function render(container, { navigate }) {
  container.innerHTML = `
    <div class="section-title">Nivel</div>
    <div class="chip-row" id="nivelChips">
      <button class="chip ${filters.nivel === 'todos' ? 'active' : ''}" data-nivel="todos">Todos</button>
      ${NIVELES.map((n) => `<button class="chip ${filters.nivel === n ? 'active' : ''}" data-nivel="${n}">${NIVEL_LABEL[n]}</button>`).join('')}
    </div>

    <div class="section-title">Tipo</div>
    <div class="chip-row" id="tipoChips">
      <button class="chip ${filters.tipo === 'todos' ? 'active' : ''}" data-tipo="todos">Todos</button>
      ${TIPOS.map((t) => `<button class="chip ${filters.tipo === t ? 'active' : ''}" data-tipo="${t}">${TIPO_LABEL[t]}</button>`).join('')}
    </div>

    <div class="section-title" id="resultsTitle"></div>
    <div id="list"></div>
  `;

  function paint() {
    const all = store.getAllExercises();
    const filtered = all.filter((e) => {
      const okNivel = filters.nivel === 'todos' || e.nivel === filters.nivel;
      const okTipo = filters.tipo === 'todos' || e.tipo === filters.tipo;
      return okNivel && okTipo;
    });

    container.querySelector('#resultsTitle').textContent = `${filtered.length} ejercicio${filtered.length === 1 ? '' : 's'}`;

    const list = container.querySelector('#list');
    if (filtered.length === 0) {
      list.innerHTML = `<div class="empty-state card"><div class="big-icon">♪</div><p>No hay ejercicios con estos filtros todavía.</p></div>`;
      return;
    }

    list.innerHTML = filtered
      .map((ex) => {
        const dur = fmtMin(computeGroupDurationMin(ex));
        const nPasos = ex.pasos ? `${ex.pasos.length} paso${ex.pasos.length === 1 ? '' : 's'}` : '';
        const esArpegioMenor = ex.grupoEspecial === GRUPO_ARPEGIOS_MENORES;
        return `
        <div class="card card-tappable card-list-item">
          <button type="button" class="icon-btn card-edit-btn" data-edit="${ex.id}" aria-label="Editar ejercicio">✎</button>
          <div class="card-open-area" data-open="${ex.id}">
            <div class="card-title">${ex.nombre}</div>
            <div class="card-meta">
              ${nivelBadge(ex.nivel)}
              <span class="badge badge-tipo">${TIPO_LABEL[ex.tipo]}</span>
              ${articulacionBadge(ex.tipo === 'fuelle' ? null : ex.articulacion)}
              ${esArpegioMenor ? `<span class="badge badge-tipo">${NOMBRE_GRUPO_ARPEGIOS_MENORES}</span>` : ''}
              <span>${dur}</span>
              ${nPasos ? `<span>· ${nPasos}</span>` : ''}
            </div>
          </div>
        </div>`;
      })
      .join('');

    list.querySelectorAll('[data-open]').forEach((el) => {
      el.addEventListener('click', () => navigate(`#/practicar/${el.dataset.open}?from=biblioteca`));
    });
    // Editar: ver DECISIONES.md punto 28 (edición de ejercicios ya cargados).
    list.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigate(`#/editar/${btn.dataset.edit}`);
      });
    });
  }

  container.querySelector('#nivelChips').addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    filters.nivel = btn.dataset.nivel;
    render(container, { navigate });
  });

  container.querySelector('#tipoChips').addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    filters.tipo = btn.dataset.tipo;
    render(container, { navigate });
  });

  paint();
}
