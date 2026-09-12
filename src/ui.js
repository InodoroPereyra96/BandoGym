// Helpers de UI compartidos entre pantallas (toast, badges, etc.)
import { NIVEL_LABEL, TIPO_LABEL, ARTICULACION_LABEL } from './theory.js';
import { escapeHTML } from './util.js';

let toastTimer = null;

export function toast(message) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

export function nivelBadge(nivel) {
  return `<span class="badge badge-${nivel}">${NIVEL_LABEL[nivel] || nivel}</span>`;
}

export function tipoBadge(tipo) {
  return `<span class="badge badge-tipo">${TIPO_LABEL[tipo] || tipo}</span>`;
}

export function articulacionBadge(articulacion) {
  if (!articulacion) return '';
  const label = ARTICULACION_LABEL[articulacion] || articulacion;
  return `<span class="badge badge-tipo">${label}</span>`;
}

export function fmtMin(min) {
  const rounded = Math.max(1, Math.round(min));
  return `${rounded} min`;
}

/**
 * Diálogo de confirmación genérico (overlay + hoja inferior, mismo lenguaje
 * visual que la hoja de calificación de player.js), para acciones
 * destructivas o irreversibles como restaurar un respaldo. Se usa en vez de
 * `window.confirm()` nativo porque este no se puede estilar (desentona con
 * el tema oscuro de la app) y esta app no usa diálogos nativos en ningún
 * otro lado — ver DECISIONES.md ronda 7, punto 37. Devuelve una Promise que
 * resuelve `true` (confirmó) o `false` (canceló, o tocó fuera de la hoja).
 */
export function confirmDialog({ title = '¿Confirmar?', message = '', confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false } = {}) {
  return new Promise((resolve) => {
    const existing = document.getElementById('confirmOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'rating-overlay';
    overlay.id = 'confirmOverlay';
    overlay.innerHTML = `
      <div class="rating-sheet confirm-sheet">
        <h2>${escapeHTML(title)}</h2>
        <p class="confirm-message">${escapeHTML(message)}</p>
        <div class="btn-row">
          <button class="btn btn-ghost" id="confirmCancelBtn">${escapeHTML(cancelLabel)}</button>
          <button class="btn ${danger ? 'btn-wine' : 'btn-primary'}" id="confirmOkBtn">${escapeHTML(confirmLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    function close(result) {
      overlay.remove();
      resolve(result);
    }
    overlay.querySelector('#confirmCancelBtn').addEventListener('click', () => close(false));
    overlay.querySelector('#confirmOkBtn').addEventListener('click', () => close(true));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
  });
}
