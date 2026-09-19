// Router muy simple basado en hash + montaje de pantallas.
// No hay build step: todo corre como módulos ES nativos del navegador.

import * as today from './screens/today.js';
import * as library from './screens/library.js';
import * as player from './screens/player.js';
import * as newExercise from './screens/newExercise.js';
import * as profile from './screens/profile.js';
import * as community from './screens/community.js';
import * as store from './store.js';

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
  comunidad: { mod: community, title: 'Comunidad', tab: 'comunidad' },
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
  // En vista de usuario no se puede entrar a cargar/editar ejercicios ni
  // escribiendo la URL a mano (ver DECISIONES.md punto 82).
  if (!store.isAdmin() && (name === 'nuevo' || name === 'editar')) {
    navigate('#/hoy');
    return;
  }
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

// Tema oscuro en toda la app (ver DECISIONES.md punto 72): preferencia
// guardada, se aplica una sola vez al arrancar — no hace falta repetirlo en
// cada navegación (ver comentario de `store.applyTheme`).
store.applyTheme();
store.applyAdminMode();

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

// ---------------------------------------------------------------------
// Tiempo total en la app (ver DECISIONES.md punto 69, pestaña Comunidad)
// ---------------------------------------------------------------------
// Se acumula mientras el documento está VISIBLE — no cuenta si la app quedó
// minimizada, la pantalla se bloqueó, o cambiaste de pestaña (no queremos
// medir "la dejé abierta de fondo", sino uso real). Se guarda en `store.js`
// cada `FLUSH_INTERVAL_MS` Y al ocultarse/cerrarse, no solo al final: una
// PWA de celular puede morir de golpe (la mata el sistema operativo) sin
// disparar ningún evento de cierre prolijo, así que conviene ir volcando el
// acumulado seguido en vez de arriesgarse a perderlo todo de un saque.
const APP_TIME_FLUSH_MS = 20000;
let appTimeSessionStart = document.visibilityState === 'visible' ? Date.now() : null;

function flushAppTime() {
  if (appTimeSessionStart == null) return;
  const now = Date.now();
  store.addAppTimeMs(now - appTimeSessionStart);
  appTimeSessionStart = now;
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    flushAppTime();
    appTimeSessionStart = null;
  } else {
    appTimeSessionStart = Date.now();
  }
});
window.addEventListener('pagehide', flushAppTime);
setInterval(flushAppTime, APP_TIME_FLUSH_MS);
