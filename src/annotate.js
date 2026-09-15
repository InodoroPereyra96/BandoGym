// Capa de anotaciones a mano sobre la partitura (ver DECISIONES.md punto 67):
// un <canvas> transparente superpuesto a la imagen de cada paso, donde el
// usuario puede escribir digitación, marcar algo o tachar, sin modificar la
// imagen original — la anotación vive en una capa aparte, por encima.
//
// El canvas se cuelga DENTRO de `.score-inner` (mismo contenedor que ya
// envuelve la imagen y la barra de práctica, ver player.js), así que hereda
// automáticamente el mismo `transform` de zoom/paneo que le aplica
// `zoom.js` a ese contenedor entero — no hace falta ningún código de
// sincronización aparte para que el dibujo seiga alineado con la partitura
// en cualquier nivel de zoom (ver punto 67, ítem 6).
//
// Los trazos se guardan como coordenadas FRACCIONALES (0..1, relativas al
// tamaño NATURAL de la imagen, no al tamaño en pantalla): para convertir un
// toque a esa fracción alcanza con `canvas.getBoundingClientRect()`, que ya
// reflejan cualquier transform CSS vigente en ese momento — el mismo
// principio que usa `zoom.js` para no tener que leer/deshacer la matriz de
// transformación a mano. Guardar en fracción (no en píxeles de pantalla)
// también es lo que permite que el dibujo se vea igual de bien sin importar
// el tamaño real del dispositivo o si la imagen se re-normaliza (ver
// `computeContentTransform` en player.js).

import * as store from './store.js';

export const TOOL_PENCIL = 'pencil';
export const TOOL_HIGHLIGHTER = 'highlighter';
export const TOOL_ERASER = 'eraser';

// Dos colores de lápiz, como pidió el usuario (ver DECISIONES.md punto 67).
export const PENCIL_COLORS = ['#1a1a1a', '#c62828']; // negro, rojo

// Resaltador: un solo color, sin elección (ver DECISIONES.md punto 67) —
// amarillo clásico de fibrón/marcador, semitransparente para seguir viendo
// la partitura debajo.
const HIGHLIGHTER_COLOR = '#ffd94a';
const HIGHLIGHTER_ALPHA = 0.35;

// Anchos de trazo, como fracción del ancho NATURAL de la imagen (no px de
// pantalla fijos): así el trazo se ve proporcionalmente igual de fino/grueso
// sea cual sea la resolución de la imagen cargada.
const PENCIL_WIDTH_FRAC = 0.0028;
const HIGHLIGHTER_WIDTH_FRAC = 0.02;

// Radio de "contacto" de la goma, en la misma unidad fraccional: si el punto
// borrado pasa cerca de CUALQUIER punto de un trazo, se borra el trazo
// ENTERO (ver más abajo por qué, y DECISIONES.md punto 67).
const ERASE_RADIUS_FRAC = 0.025;

/**
 * Crea la capa de anotación sobre `imgEl` (ya insertada dentro de
 * `containerEl`, el `.score-inner` del paso actual) y la carga con los
 * trazos ya guardados para `pasoId`. Devuelve:
 *   - `setTool(tool, color)`: cambia la herramienta activa (`null` para
 *     desactivar el dibujo y devolverle los toques al zoom/paneo/avance
 *     manual de siempre) y, para el lápiz, el color.
 *   - `setMenuCollapseCallback(fn)`: `fn` se llama al empezar un trazo
 *     nuevo, para que quien arma el menú flotante (player.js) pueda
 *     cerrarlo solo apenas el usuario arranca a dibujar de verdad.
 *   - `destroy()`: saca el canvas y sus listeners (no imprescindible si el
 *     contenedor entero se descarta con `innerHTML =`, pero mantiene la
 *     simetría con el resto del código).
 */
export function attachAnnotationLayer(containerEl, imgEl, pasoId) {
  const canvas = document.createElement('canvas');
  canvas.className = 'score-annotate';
  containerEl.appendChild(canvas);

  let strokes = store.getAnnotationsFor(pasoId).slice();
  let activeTool = null; // null | TOOL_PENCIL | TOOL_HIGHLIGHTER | TOOL_ERASER
  let activeColor = PENCIL_COLORS[0];
  let currentStroke = null;
  let drawing = false;
  let onMenuCollapse = null;

  function sizeCanvas() {
    const w = imgEl.naturalWidth || imgEl.width || 1;
    const h = imgEl.naturalHeight || imgEl.height || 1;
    canvas.width = w;
    canvas.height = h;
    redraw();
  }

  function strokeVisuals(stroke) {
    const isHighlighter = stroke.tool === TOOL_HIGHLIGHTER;
    return {
      width: Math.max(1, (isHighlighter ? HIGHLIGHTER_WIDTH_FRAC : PENCIL_WIDTH_FRAC) * canvas.width),
      alpha: isHighlighter ? HIGHLIGHTER_ALPHA : 1,
    };
  }

  function drawStroke(ctx, stroke) {
    if (!stroke.points || stroke.points.length === 0) return;
    const { width, alpha } = strokeVisuals(stroke);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (stroke.points.length === 1) {
      // Un solo tap sin arrastre: un trazo de 0 largo no pinta nada con
      // stroke() — se dibuja un punto redondo del mismo ancho para que un
      // toque puntual (ej. marcar una nota) igual quede visible.
      const [xf, yf] = stroke.points[0];
      ctx.beginPath();
      ctx.arc(xf * canvas.width, yf * canvas.height, width / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      stroke.points.forEach(([xf, yf], i) => {
        const x = xf * canvas.width;
        const y = yf * canvas.height;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
    ctx.restore();
  }

  function redraw() {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach((s) => drawStroke(ctx, s));
    if (currentStroke) drawStroke(ctx, currentStroke);
  }

  function persist() {
    store.setAnnotationsFor(pasoId, strokes);
  }

  function pointFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const xf = (e.clientX - rect.left) / rect.width;
    const yf = (e.clientY - rect.top) / rect.height;
    return [Math.min(1, Math.max(0, xf)), Math.min(1, Math.max(0, yf))];
  }

  // La goma borra el trazo ENTERO que se toca, no píxel por píxel (ver
  // DECISIONES.md punto 67): es la implementación más simple y robusta sin
  // librerías — borrar de verdad a nivel píxel con `destination-out`
  // complica la mezcla con el resaltador semitransparente (los píxeles ya
  // pintados no se pueden "restar" limpiamente una vez compuestos) y además
  // el pedido del usuario ("tocando/arrastrando sobre el trazo a borrar")
  // ya describe borrar trazos completos, no manchar un área.
  function eraseAt(pt) {
    if (!pt) return;
    const before = strokes.length;
    strokes = strokes.filter(
      (s) => !s.points.some(([xf, yf]) => Math.hypot(xf - pt[0], yf - pt[1]) < ERASE_RADIUS_FRAC)
    );
    if (strokes.length !== before) redraw();
  }

  function onPointerDown(e) {
    if (!activeTool) return; // pointer-events ya es 'none' en este caso, pero por las dudas
    e.preventDefault();
    e.stopPropagation(); // no debe llegar a zoom.js (pellizco/paneo/tap-avance) mientras se dibuja
    if (onMenuCollapse) onMenuCollapse();
    canvas.setPointerCapture(e.pointerId);
    const pt = pointFromEvent(e);
    if (!pt) return;
    drawing = true;
    if (activeTool === TOOL_ERASER) {
      eraseAt(pt);
    } else {
      currentStroke = {
        tool: activeTool,
        color: activeTool === TOOL_HIGHLIGHTER ? HIGHLIGHTER_COLOR : activeColor,
        points: [pt],
      };
      redraw();
    }
  }

  function onPointerMove(e) {
    if (!drawing) return;
    e.preventDefault();
    e.stopPropagation();
    const pt = pointFromEvent(e);
    if (!pt) return;
    if (activeTool === TOOL_ERASER) {
      eraseAt(pt);
    } else if (currentStroke) {
      currentStroke.points.push(pt);
      redraw();
    }
  }

  function onPointerUp(e) {
    if (!drawing) return;
    e.preventDefault();
    e.stopPropagation();
    drawing = false;
    if (currentStroke) {
      strokes.push(currentStroke);
      currentStroke = null;
      persist();
    } else if (activeTool === TOOL_ERASER) {
      persist(); // la goma ya modificó `strokes` en cada eraseAt(): persistir al soltar
    }
    redraw();
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  if (imgEl.complete && imgEl.naturalWidth) sizeCanvas();
  else imgEl.addEventListener('load', sizeCanvas, { once: true });

  function setTool(tool, color) {
    activeTool = tool || null;
    if (color) activeColor = color;
    // Sin herramienta: pointer-events 'none' devuelve los toques al elemento
    // de abajo (la imagen), que burbujean normal hasta zoom.js — el pellizco,
    // el doble-tap y el toque para avanzar de paso en modo manual siguen
    // funcionando exactamente igual que sin esta función (ver punto 6 del
    // pedido: compatibilidad con el zoom ya existente).
    canvas.style.pointerEvents = activeTool ? 'auto' : 'none';
    canvas.classList.toggle('erasing', activeTool === TOOL_ERASER);
  }

  function setMenuCollapseCallback(fn) {
    onMenuCollapse = fn;
  }

  function destroy() {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
    if (canvas.parentNode) canvas.remove();
  }

  return { setTool, setMenuCollapseCallback, destroy };
}
