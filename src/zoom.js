// Zoom táctil (pellizco y doble tap) + paneo para la imagen de partitura del
// reproductor. Implementación propia con Pointer Events, sin dependencias
// externas (ver DECISIONES.md punto 18: no hay CDN/bundler disponible offline).
//
// Decisión (ver DECISIONES.md puntos 31 y 33): además del zoom manual
// (pellizco/doble-tap), el reproductor aplica una transformación base
// automática (escala + traslación) para que el contenido de cada imagen
// ocupe el máximo espacio posible dentro del marco, normalizado y centrado
// entre pasos. La escala base y la manual se combinan multiplicativamente
// (`baseScale * scale`), y la traslación base (recentrado automático) y la
// manual (paneo del usuario) se combinan por suma: `reset({ scale, x, y })`
// fija la base al cambiar de paso, y el pellizco/doble-tap/arrastre del
// usuario siguen funcionando igual, como ajustes adicionales sobre esa base.
//
// Decisión (ver DECISIONES.md punto 32): un tap simple (que no se convierte
// en doble-tap dentro de `DOUBLE_TAP_MS`) dispara `onSingleTap`, usado por el
// modo de avance manual para permitir "tocar la partitura para pasar de
// paso" sin romper el gesto de doble-tap-para-zoom ya existente.
//
// Decisión (ver DECISIONES.md ronda 6, punto 36): `onSingleTap` recibe además
// la posición del toque (`{ x, y }`, coordenadas de viewport del
// `pointerup`), para que quien la use pueda distinguir en qué mitad de la
// partitura se tocó (mitad derecha avanza, mitad izquierda retrocede).

const MAX_SCALE = 4;
const MIN_SCALE = 1;
const DOUBLE_TAP_MS = 320;

/**
 * Engancha pellizco/doble-tap sobre `frameEl`, aplicando transform al elemento
 * que devuelve `getTarget()` (se resuelve en cada evento porque el contenido
 * de `frameEl` se reemplaza en cada paso del reproductor).
 * `onSingleTap` (opcional) se llama en cada tap que NO termina siendo parte
 * de un doble-tap. Devuelve `{ reset({ scale, x, y }) }` para volver al zoom
 * manual neutro (con una nueva transformación base) al cambiar de paso.
 */
export function attachPinchZoom(frameEl, getTarget, { onSingleTap } = {}) {
  let scale = 1; // multiplicador manual (pellizco/doble-tap), relativo a baseScale
  let baseScale = 1; // normalización/maximización automática de tamaño (ver puntos 31 y 33)
  let baseX = 0; // traslación automática de recentrado (idem), relativa al centro del marco
  let baseY = 0;
  let originX = 0; // paneo manual del usuario (arrastre), relativo a la base
  let originY = 0;
  let lastTapTime = 0;
  let singleTapTimer = null;
  const pointers = new Map();
  let startDist = 0;
  let startScale = 1;
  let panStart = null;

  function target() {
    return getTarget ? getTarget() : frameEl.querySelector('img, svg');
  }

  function apply() {
    const el = target();
    if (!el) return;
    el.style.transform = `translate(${baseX + originX}px, ${baseY + originY}px) scale(${baseScale * scale})`;
    el.style.transformOrigin = 'center center';
  }

  function reset({ scale: newBaseScale = 1, x: newBaseX = 0, y: newBaseY = 0 } = {}) {
    scale = 1;
    baseScale = newBaseScale;
    baseX = newBaseX;
    baseY = newBaseY;
    originX = 0;
    originY = 0;
    apply();
  }

  function dist(pts) {
    const [a, b] = pts;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function toggleZoom() {
    scale = scale > 1 ? 1 : 2.5;
    originX = 0;
    originY = 0;
    apply();
  }

  frameEl.style.touchAction = 'none';

  frameEl.addEventListener('pointerdown', (e) => {
    frameEl.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      startDist = dist([...pointers.values()]);
      startScale = scale;
    } else if (pointers.size === 1) {
      panStart = { x: e.clientX - originX, y: e.clientY - originY };
    }
  });

  frameEl.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && startDist > 0) {
      const d = dist([...pointers.values()]);
      scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, startScale * (d / startDist)));
      apply();
    } else if (pointers.size === 1 && scale > 1 && panStart) {
      originX = e.clientX - panStart.x;
      originY = e.clientY - panStart.y;
      apply();
    }
  });

  function endPointer(e) {
    const wasSingleTap = pointers.size === 1 && startDist === 0;
    const tapX = e.clientX;
    const tapY = e.clientY;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) startDist = 0;
    if (pointers.size === 0) {
      panStart = null;
      if (wasSingleTap) {
        const now = Date.now();
        if (now - lastTapTime < DOUBLE_TAP_MS) {
          // Segundo tap dentro de la ventana: es un doble-tap → zoom, y se
          // cancela el aviso de "tap simple" que había quedado pendiente del
          // primer tap.
          clearTimeout(singleTapTimer);
          toggleZoom();
          lastTapTime = 0;
        } else {
          lastTapTime = now;
          // No se sabe todavía si este tap es simple o el primero de un
          // doble-tap: se espera la misma ventana antes de avisarlo como
          // simple, para no disparar el avance de paso en cada doble-tap.
          clearTimeout(singleTapTimer);
          singleTapTimer = setTimeout(() => {
            if (onSingleTap) onSingleTap({ x: tapX, y: tapY });
          }, DOUBLE_TAP_MS);
        }
      }
    }
  }
  frameEl.addEventListener('pointerup', endPointer);
  frameEl.addEventListener('pointercancel', endPointer);

  return { reset };
}
