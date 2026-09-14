// Router muy simple basado en hash + montaje de pantallas.
// No hay build step: todo corre como módulos ES nativos del navegador.

import * as today from './screens/today.js';
import * as library from './screens/library.js';
import * as player from './screens/player.js';
import * as newExercise from './screens/newExercise.js';
import * as profile from './screens/profile.js';

const screenEl = document.getElementById('screen');
const topbarTitle = document.getElementById('topbarTitle');
const backBtn = document.getElementById('backBtn');
const topbarSpacer = document.getElementById('topbarSpacer');
const tabbar = document.getElementById('tabbar');

const ROUTES = {
  hoy: { mod: today, title: 'Hoy', tab: 'hoy' },
  biblioteca: { mod: library, title: 'Bandoteca', tab: 'biblioteca' },
  nuevo: { mod: newExercise, title: 'Nuevo ejercicio', tab: 'nuevo' },
  editar: { mod: newExercise, title: 'Editar ejercicio', tab: null },
  perfil: { mod: profile, title: 'Perfil', tab: 'perfil' },
  practicar: { mod: player, title: 'Práctica', tab: null },
};

let currentModule = null;

function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path, queryStr] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  const name = parts[0] || 'hoy';
  const param = parts[1] || null;
  const query = Object.fromEntries(new URLSearchParams(queryStr || ''));
  return { name, param, query };
}

function setActiveTab(tabName) {
  tabbar.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.route === tabName);
  });
}

export function navigate(hash) {
  window.location.hash = hash;
}

export function goBack(fallback = '#/hoy') {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    navigate(fallback);
  }
}

function render() {
  const { name, param, query } = parseHash();
  const route = ROUTES[name] || ROUTES.hoy;

  if (currentModule && typeof currentModule.destroy === 'function') {
    currentModule.destroy();
  }
  currentModule = route.mod;

  topbarTitle.textContent = route.title;
  // El spacer solo existe para balancear el ancho de `backBtn` y que el
  // título quede centrado de verdad — si `backBtn` no se muestra, el
  // spacer tampoco: dejarlo fijo desalineaba el título hacia la izquierda
  // (ver DECISIONES.md punto 48).
  backBtn.hidden = route.tab !== null; // se muestra solo en pantallas sin tab (ej. reproductor)
  topbarSpacer.hidden = backBtn.hidden;
  setActiveTab(route.tab);

  screenEl.innerHTML = '';
  route.mod.render(screenEl, { param, query, navigate });
  screenEl.scrollTop = 0;
  screenEl.focus({ preventScroll: true });
}

backBtn.addEventListener('click', () => goBack());

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', () => {
  if (!window.location.hash) window.location.hash = '#/hoy';
  render();
});

// Si el script corre después de DOMContentLoaded (módulo diferido), renderizar igual.
if (document.readyState !== 'loading') {
  if (!window.location.hash) window.location.hash = '#/hoy';
  render();
}

// Registro del service worker (offline / instalable).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch((err) => {
      console.warn('No se pudo registrar el service worker', err);
    });
  });
}
