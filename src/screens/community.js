// Pestaña "Comunidad" (ver DECISIONES.md punto 69): pensada para la gente
// del grupo de WhatsApp "BandoComunidad" — un lugar dentro de la app para
// ver quién más lo está usando y, si quiere, dejar su Instagram para que lo
// sigan. Pedido explícito del usuario: "encontrar compañeros de práctica".
//
// IMPORTANTE — esto es una VISTA PREVIA, no la función final: hoy la app no
// tiene backend (todo vive en el `localStorage` de cada dispositivo, ver
// README/DECISIONES.md punto 1), así que todavía no hay forma de que un
// dispositivo vea lo que hizo otro. El usuario pidió explícitamente diseñar
// la interfaz primero con "usuarios de fantasía" y conectar un servidor más
// adelante — ver el punto 69 para el detalle completo de qué falta.

import * as store from '../store.js';
import { toast } from '../ui.js';
import { escapeHTML } from '../util.js';

// "Usuarios de fantasía" para previsualizar el ranking (ver DECISIONES.md
// punto 69) — nombres y tiempos inventados, NO son personas reales. Se van a
// reemplazar por datos reales de la comunidad de bandoneonistas cuando haya
// un servidor conectado.
const FANTASY_MEMBERS = [
  { name: 'Julián', instagram: 'julian.bandoneon', timeMs: (9 * 60 + 20) * 60000 },
  { name: 'Meli', instagram: 'meli_fuelle', timeMs: (5 * 60 + 5) * 60000 },
  { name: 'Cacho', instagram: null, timeMs: (2 * 60 + 40) * 60000 },
];

// Colores de avatar (mismo puñado dorado/bordó/verdoso que ya usa el resto
// de la app, ver `--gold`/`--wine`/`--lvl-*` en styles.css), rotados por
// posición — no hace falta un color por persona real, alcanza con variar
// visualmente cada fila.
const AVATAR_COLORS = ['var(--gold)', 'var(--wine)', 'var(--lvl-avanzado)', 'var(--lvl-principiante)'];

function formatDuration(ms) {
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const min = totalMin % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${min}m`;
  return `${min}m`;
}

function instagramUrl(handle) {
  return `https://instagram.com/${encodeURIComponent(handle.replace(/^@/, ''))}`;
}

export function render(container, { navigate }) {
  const profile = store.getProfile();

  container.innerHTML = `
    <button type="button" class="btn btn-outline" id="googleLoginBtn">Iniciar sesión con Google</button>

    <div class="section-title">Tu Instagram (opcional)</div>
    <p class="field-hint">Si lo dejás, otros van a poder encontrarte y seguirte desde acá.</p>
    <div class="community-ig-row">
      <input type="text" id="instagramInput" placeholder="tu_usuario (sin @)" value="${escapeHTML((profile.instagram || '').replace(/^@/, ''))}" />
      <button type="button" class="btn btn-primary btn-sm" id="saveInstagramBtn">Guardar</button>
    </div>

    <div class="section-title">Quién anda por acá</div>
    <div class="community-ranking" id="communityRanking"></div>
  `;

  function paintRanking() {
    const you = { name: 'Vos', instagram: (store.getProfile().instagram || '') || null, timeMs: store.getAppTimeMs(), isYou: true };
    const members = [...FANTASY_MEMBERS, you].sort((a, b) => b.timeMs - a.timeMs);

    container.querySelector('#communityRanking').innerHTML = members.map((m, i) => {
      const initial = (m.name || '?').trim().charAt(0).toUpperCase();
      const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
      const igChip = m.instagram
        ? `<a class="community-ig-chip" href="${instagramUrl(m.instagram)}" target="_blank" rel="noopener">@${escapeHTML(m.instagram.replace(/^@/, ''))}</a>`
        : '';
      return `
        <div class="community-row ${m.isYou ? 'is-you' : ''}">
          <span class="community-pos">${i + 1}</span>
          <span class="community-avatar" style="background:${color}">${escapeHTML(initial)}</span>
          <div class="community-main">
            <span class="community-name">${escapeHTML(m.name)}${m.isYou ? ' <span class="community-you-tag">(vos)</span>' : ''}</span>
            <span class="community-time">${formatDuration(m.timeMs)}</span>
          </div>
          ${igChip}
        </div>`;
    }).join('');
  }

  paintRanking();

  container.querySelector('#googleLoginBtn').addEventListener('click', () => {
    toast('El login con Google todavía no está conectado — por ahora esto es una vista previa.');
  });

  container.querySelector('#saveInstagramBtn').addEventListener('click', () => {
    const value = container.querySelector('#instagramInput').value;
    store.setInstagram(value);
    toast(value.trim() ? 'Instagram guardado.' : 'Instagram borrado.');
    paintRanking();
  });
}

export function destroy() {}
