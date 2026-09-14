// Utilidades varias: ids, slugs, formato de tiempo y el SVG
// placeholder que simula una partitura genérica.

export function slug(str) {
  return String(str)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatMMSS(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Normaliza un nombre de ejercicio para compararlo de forma insensible a
 * mayúsculas/minúsculas y a espacios (extra al principio/final, o dobles en
 * el medio). Usado para agrupar ejercicios por nombre (ej. "Arpegios
 * menores", ver DECISIONES.md punto 38) sin que "arpegios  menores " o
 * "ARPEGIOS MENORES" cuenten como un nombre distinto.
 */
export function normalizeNombre(str) {
  return String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Genera el SVG de una "partitura genérica" placeholder: pentagrama,
 * clave y algunas notas de relleno, con el nombre de la tonalidad y
 * la articulación superpuestos. Sirve hasta que se cargue una imagen
 * real (foto/captura) para ese ejercicio puntual.
 */
export function scorePlaceholderSVG({ tonalidad, articulacion, tipo, nivel } = {}) {
  const seed = slug(`${tonalidad || ''}-${articulacion || ''}-${tipo || ''}`).length;
  const lineY = [70, 95, 120, 145, 170];
  const staffLines = lineY
    .map((y) => `<line x1="30" y1="${y}" x2="370" y2="${y}" stroke="#2a161c" stroke-width="1.5" />`)
    .join('');

  // Notas de relleno dispuestas como un arco ascendente/descendente para sugerir
  // una escala o un arpegio, sin representar notación real.
  const noteCount = tipo === 'arpegio' ? 6 : 8;
  let notes = '';
  for (let i = 0; i < noteCount; i++) {
    const x = 55 + i * ((300) / (noteCount - 1));
    const phase = tipo === 'arpegio' ? i % 3 : i % 5;
    const y = 170 - phase * 12 - ((seed + i) % 3) * 3;
    notes += `<ellipse cx="${x.toFixed(1)}" cy="${y}" rx="7" ry="5.5" fill="#2a161c" transform="rotate(-18 ${x.toFixed(1)} ${y})" /><line x1="${(x + 6.5).toFixed(1)}" y1="${y}" x2="${(x + 6.5).toFixed(1)}" y2="${y - 32}" stroke="#2a161c" stroke-width="1.5" />`;
  }

  const label = tonalidad ? tonalidad : 'Ejercicio';
  const sub = [articulacion, tipo].filter(Boolean).join(' · ');

  return `
  <svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Partitura placeholder para ${label}">
    <rect x="0" y="0" width="400" height="260" fill="#f3ecdf" />
    <text x="30" y="150" font-family="Georgia, serif" font-size="72" fill="#2a161c" opacity="0.85">𝄞</text>
    ${staffLines}
    ${notes}
    <line x1="30" y1="70" x2="30" y2="170" stroke="#2a161c" stroke-width="2" />
    <line x1="368" y1="70" x2="368" y2="170" stroke="#2a161c" stroke-width="2" />
    <text x="200" y="215" text-anchor="middle" font-family="Georgia, serif" font-size="22" font-weight="700" fill="#5c2a1e">${escapeXML(label)}</text>
    <text x="200" y="238" text-anchor="middle" font-family="Georgia, serif" font-size="13" fill="#8a6a55" letter-spacing="0.5">${escapeXML(sub)}</text>
  </svg>`;
}

function escapeXML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------- Normalización automática de tamaño visual entre pasos ----------
// Ver DECISIONES.md puntos 31 y 33. Las fotos/capturas que sube el usuario
// tienen proporciones y márgenes distintos entre sí, así que mostrarlas "tal
// cual" (ajustadas solo al marco) hace que el pentagrama se vea más chico o
// más grande según cuánto margen blanco tenga cada imagen. Para
// compensarlo, se detecta el bounding box (alto Y ancho) del contenido "con
// tinta" (no blanco) de la imagen y se calcula la transformación (escala +
// traslación) que hace falta para que ESE contenido —no la imagen
// completa, margen incluido— ocupe el máximo espacio posible dentro del
// marco real, recentrado, sin deformarlo.
//
// Decisión (ver DECISIONES.md punto 33): a diferencia de la primera versión
// (punto 31), que escalaba hacia una fracción de alto fija y arbitraria
// (0.62) — y por eso terminaba casi siempre ACHICANDO la imagen respecto a
// lo que `object-fit: contain` ya lograba por su cuenta, que es el bug
// reportado — esta versión mide el tamaño REAL ya renderizado de la imagen
// y del marco (`getBoundingClientRect`, después de que el layout con
// `object-fit: contain` ya se aplicó) y calcula la escala mínima
// matemáticamente necesaria para que el bounding box del contenido toque
// los bordes del marco en el eje que lo permita sin deformar el otro. Por
// construcción, esa escala nunca es menor a 1 (nunca achica por debajo de
// lo que ya se veía): en el peor caso (imagen sin margen, tinta de borde a
// borde) da ~1; con margen, siempre da más de 1.

const NORMALIZE_MIN_SCALE = 1; // nunca achicar por debajo de lo que ya da `object-fit: contain`
const NORMALIZE_MAX_SCALE = 6; // tope defensivo alto: no debería alcanzarse con detecciones confiables (ver punto 33)
const NORMALIZE_MIN_CONTENT_FRACTION = 0.02; // bounding box más chico que esto (en cualquier eje) se considera detección no confiable
const NORMALIZE_EDGE_PADDING = 0.96; // deja un 4% de aire para que el contenido no toque el borde del marco
const NORMALIZE_SAMPLE_MAX = 220; // resolución (en el lado más largo) del canvas de análisis: barato de escanear
const NORMALIZE_INK_LUMINANCE = 200; // por debajo de esta luminancia (0-255) se considera "tinta"

/**
 * Calcula la transformación `{ scale, x, y }` que hay que aplicarle a
 * `imgEl` (ya cargada y ya dispuesta con `object-fit: contain` dentro de
 * `frameEl`) para que el contenido no blanco de la imagen —no la imagen
 * completa, márgenes incluidos— ocupe el máximo espacio posible dentro de
 * `frameEl`, centrado y sin deformar. `x`/`y` son un desplazamiento en
 * píxeles de pantalla (para usar con `translate()`) que recentra el
 * contenido cuando su bounding box no está centrado en la imagen original.
 * Devuelve la identidad (`{ scale: 1, x: 0, y: 0 }`) si no se puede
 * analizar, no se detecta contenido, o el marco/imagen todavía no tienen
 * tamaño renderizado (layout no disponible).
 */
export function computeContentTransform(imgEl, frameEl) {
  const identity = { scale: 1, x: 0, y: 0 };
  try {
    const w = imgEl.naturalWidth;
    const h = imgEl.naturalHeight;
    if (!w || !h) return identity;

    const longSide = Math.max(w, h);
    const sampleScale = NORMALIZE_SAMPLE_MAX / longSide;
    const sampleW = Math.max(1, Math.round(w * sampleScale));
    const sampleH = Math.max(1, Math.round(h * sampleScale));
    const canvas = document.createElement('canvas');
    canvas.width = sampleW;
    canvas.height = sampleH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, sampleW, sampleH);
    const { data } = ctx.getImageData(0, 0, sampleW, sampleH);

    // Bounding box en ambos ejes: primera/última fila y columna con al
    // menos un píxel de "tinta" (luminancia baja, no transparente).
    let top = -1;
    let bottom = -1;
    let left = -1;
    let right = -1;
    for (let y = 0; y < sampleH; y++) {
      const rowStart = y * sampleW * 4;
      for (let x = 0; x < sampleW; x++) {
        const i = rowStart + x * 4;
        if (data[i + 3] < 10) continue; // píxel transparente: no cuenta
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (lum >= NORMALIZE_INK_LUMINANCE) continue;
        if (top === -1) top = y;
        bottom = y;
        if (left === -1 || x < left) left = x;
        if (right === -1 || x > right) right = x;
      }
    }
    if (top === -1) return identity; // no se detectó contenido (imagen en blanco/muy clara)

    const bboxWFrac = (right - left + 1) / sampleW;
    const bboxHFrac = (bottom - top + 1) / sampleH;
    // Un bounding box demasiado chico en cualquiera de los dos ejes es más
    // señal de ruido/detección fallida que de contenido real muy recortado
    // (ver DECISIONES.md punto 33) — se prefiere no tocar la imagen antes
    // que aplicarle una escala gigante poco confiable.
    if (bboxWFrac < NORMALIZE_MIN_CONTENT_FRACTION || bboxHFrac < NORMALIZE_MIN_CONTENT_FRACTION) return identity;

    // Centro del bounding box relativo al centro de la imagen, en fracción
    // de su ancho/alto (rango aprox. -0.5..0.5): mide cuánto está corrido
    // el contenido respecto al centro geométrico de la imagen completa.
    const centerXFrac = (left + right + 1) / 2 / sampleW - 0.5;
    const centerYFrac = (top + bottom + 1) / 2 / sampleH - 0.5;

    // Tamaño ya renderizado (con `object-fit: contain`) de la imagen y del
    // marco disponible: acá es donde se sabe, recién, cuánto "aire" real
    // sobra en cada eje.
    const imgRect = imgEl.getBoundingClientRect();
    const frameRect = frameEl.getBoundingClientRect();
    if (!imgRect.width || !imgRect.height || !frameRect.width || !frameRect.height) return identity;

    const bboxRenderedW = bboxWFrac * imgRect.width;
    const bboxRenderedH = bboxHFrac * imgRect.height;
    if (bboxRenderedW <= 0 || bboxRenderedH <= 0) return identity;

    const rawScale = Math.min(frameRect.width / bboxRenderedW, frameRect.height / bboxRenderedH) * NORMALIZE_EDGE_PADDING;
    const scale = Math.min(NORMALIZE_MAX_SCALE, Math.max(NORMALIZE_MIN_SCALE, rawScale));

    // Traslación para recentrar el bounding box dentro del marco: como el
    // `transform-origin` es el centro y `scale()` se aplica antes que
    // `translate()` (ver zoom.js), hay que compensar multiplicando por la
    // escala final — ver DECISIONES.md punto 33 para la derivación.
    const x = -centerXFrac * imgRect.width * scale;
    const y = -centerYFrac * imgRect.height * scale;

    return { scale, x, y };
  } catch (e) {
    return identity; // cualquier falla de canvas (ej. imagen corrupta): no normalizar
  }
}

// Ver DECISIONES.md puntos 58/59: un paso de "Arpegios menores"/escalas
// puede traer 2 sistemas apilados en la misma imagen (arriba=⊓/abriendo,
// abajo=V/cerrando, ver punto 56) — para que la barra de práctica sepa
// dónde termina uno y empieza el otro, Y para que caiga exacta en cada
// compás real (no a velocidad pareja por todo el sistema, ver punto 59),
// se detectan las líneas de pentagrama de cada sistema y, dentro del hueco
// entre el pentagrama de violín y el de bajo (ahí nunca hay notas, solo
// puede haber una barra de compás real), las barras de compás reales.
// Misma idea que el recorte automático hecho fuera de la app (puntos 56/57)
// pero adaptada a canvas: se buscan las 2 líneas de pentagrama (violín y
// bajo) de cada sistema, y dentro de la franja en blanco ENTRE esas dos
// (donde nunca hay notas, solo puede haber una barra de compás real) se
// buscan columnas oscuras de punta a punta.
const LAYOUT_SAMPLE_MAX = 2000; // resolución de análisis: alcanza para las imágenes que genera el recorte automático (~1668px de ancho) sin reescalar
const LAYOUT_INK_LUMINANCE = 200;
const LAYOUT_STAFFLINE_MIN_WIDTH_FRAC = 0.5; // una línea de pentagrama cubre >=50% del ancho del sistema
const LAYOUT_LINE_MERGE_GAP = 3; // px: filas contiguas -> misma línea de pentagrama
const LAYOUT_INTRA_STAFF_MAX_GAP = 20; // px: separación típica entre las 5 líneas de UN pentagrama (a esta resolución)
const LAYOUT_BARLINE_GAP_FRACTION = 0.9; // una barra real cruza ~toda la franja entre pentagramas
const LAYOUT_BARLINE_MERGE_GAP = 10; // px: funde la barra final doble (fina+gruesa) en 1 solo evento
const LAYOUT_OPENING_MARGIN = 0.025; // fracción del ancho del sistema: ignora una barra pegada al inicio (la de apertura, no cierra ningún compás)

/**
 * Detecta la estructura real de `imgEl` (ya cargada): para cada sistema
 * (1 o 2, ver punto 56) encontrado, su rango vertical y la lista de
 * segmentos [inicioFrac, finFrac] — uno por compás real, delimitados por
 * las barras de compás detectadas — en fracción 0..1 del ancho de la
 * imagen. Devuelve `null` si no se detectan al menos 2 líneas de
 * pentagrama (imagen sin partitura reconocible, o análisis fallido).
 */
export function detectSystemLayout(imgEl) {
  try {
    const w = imgEl.naturalWidth;
    const h = imgEl.naturalHeight;
    if (!w || !h) return null;

    const longSide = Math.max(w, h);
    const sampleScale = Math.min(1, LAYOUT_SAMPLE_MAX / longSide);
    const sampleW = Math.max(1, Math.round(w * sampleScale));
    const sampleH = Math.max(1, Math.round(h * sampleScale));
    const canvas = document.createElement('canvas');
    canvas.width = sampleW;
    canvas.height = sampleH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, sampleW, sampleH);
    const { data } = ctx.getImageData(0, 0, sampleW, sampleH);

    const isDark = (x, y) => {
      const i = (y * sampleW + x) * 4;
      if (data[i + 3] < 10) return false;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      return lum < LAYOUT_INK_LUMINANCE;
    };

    // 1. Líneas de pentagrama: filas con tinta en >=50% del ancho.
    const rowThreshold = sampleW * LAYOUT_STAFFLINE_MIN_WIDTH_FRAC;
    const lineRows = [];
    for (let y = 0; y < sampleH; y++) {
      let count = 0;
      for (let x = 0; x < sampleW; x++) if (isDark(x, y)) count++;
      if (count > rowThreshold) lineRows.push(y);
    }
    if (lineRows.length === 0) return null;
    const lineBounds = mergeRuns(lineRows, LAYOUT_LINE_MERGE_GAP);

    // 2. Agrupar de a 5 líneas -> un pentagrama (violín o bajo).
    const staves = groupByGap(lineBounds, LAYOUT_INTRA_STAFF_MAX_GAP);
    if (staves.length < 2) return null;

    // 3. Agrupar pentagramas de a 2 (violín+bajo) -> un sistema, separando
    // por el hueco más grande entre pentagramas consecutivos.
    const systemsStaves = groupSystemsByBiggestGap(staves);

    // 4. Por cada sistema: rango vertical, ancho de contenido, y barras de
    // compás reales dentro del hueco violín->bajo.
    const systems = systemsStaves.map((sysStaves) => {
      const [treble, bass] = sysStaves; // cada uno [top, bottom]
      const yTop = treble[0];
      const yBottom = bass[1];
      // ancho de contenido del sistema (para ubicar la barra de apertura)
      let xLeft = -1;
      let xRight = -1;
      for (let x = 0; x < sampleW; x++) {
        for (let y = yTop; y <= yBottom; y++) {
          if (isDark(x, y)) { if (xLeft === -1) xLeft = x; xRight = x; break; }
        }
      }
      if (xLeft === -1) return { topFrac: yTop / sampleH, bottomFrac: yBottom / sampleH, segmentsFrac: [[0, 1]] };

      const gapTop = treble[1];
      const gapBottom = bass[0];
      const gapH = gapBottom - gapTop;
      const barThreshold = gapH * LAYOUT_BARLINE_GAP_FRACTION;
      const barCols = [];
      for (let x = xLeft; x <= xRight; x++) {
        let count = 0;
        for (let y = gapTop; y < gapBottom; y++) if (isDark(x, y)) count++;
        if (count > barThreshold) barCols.push(x);
      }
      const barGroups = mergeRuns(barCols, LAYOUT_BARLINE_MERGE_GAP).map(([a, b]) => Math.round((a + b) / 2));
      const openingMargin = (xRight - xLeft) * LAYOUT_OPENING_MARGIN + LAYOUT_LINE_MERGE_GAP * 8; // margen absoluto chico + proporcional
      const barlines = barGroups.filter((x) => (x - xLeft) > openingMargin);

      // Segmentos = compases reales: [inicio,barra1], [barra1,barra2], ..., [ultimaBarra,fin]
      const edges = [xLeft, ...barlines, xRight];
      const segmentsFrac = [];
      for (let i = 0; i < edges.length - 1; i++) {
        segmentsFrac.push([edges[i] / sampleW, edges[i + 1] / sampleW]);
      }
      return { topFrac: yTop / sampleH, bottomFrac: yBottom / sampleH, segmentsFrac };
    });

    return { systems };
  } catch (e) {
    return null; // cualquier falla de canvas: sin detección, el llamador cae al modo aproximado
  }
}

/** Agrupa números consecutivos (a lo sumo `maxGap` de separación) en runs `[inicio, fin]`. */
function mergeRuns(nums, maxGap) {
  if (nums.length === 0) return [];
  const runs = [];
  let start = nums[0];
  let prev = nums[0];
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] - prev <= maxGap) {
      prev = nums[i];
    } else {
      runs.push([start, prev]);
      start = nums[i];
      prev = nums[i];
    }
  }
  runs.push([start, prev]);
  return runs;
}

/** Agrupa runs `[top,bottom]` consecutivos (separación <= maxGap) en grupos más grandes. */
function groupByGap(runs, maxGap) {
  if (runs.length === 0) return [];
  const groups = [];
  let cur = [runs[0]];
  for (let i = 1; i < runs.length; i++) {
    if (runs[i][0] - cur[cur.length - 1][1] <= maxGap) {
      cur.push(runs[i]);
    } else {
      groups.push([cur[0][0], cur[cur.length - 1][1]]);
      cur = [runs[i]];
    }
  }
  groups.push([cur[0][0], cur[cur.length - 1][1]]);
  return groups;
}

/** Agrupa pentagramas [top,bottom] de a 2 (sistema), separando por el mayor salto entre huecos consecutivos (ver auto_crop_partitura.py, misma idea). */
function groupSystemsByBiggestGap(staves) {
  if (staves.length < 2) return staves.length ? [staves] : [];
  const gaps = [];
  for (let i = 0; i < staves.length - 1; i++) gaps.push(staves[i + 1][0] - staves[i][1]);
  const sorted = [...gaps].sort((a, b) => a - b);
  let threshold;
  if (new Set(sorted).size === 1) {
    threshold = sorted[0] + 1;
  } else {
    let bestIdx = 0;
    let bestJump = -1;
    for (let i = 0; i < sorted.length - 1; i++) {
      const jump = sorted[i + 1] - sorted[i];
      if (jump > bestJump) { bestJump = jump; bestIdx = i; }
    }
    threshold = (sorted[bestIdx] + sorted[bestIdx + 1]) / 2;
  }
  const systems = [];
  let cur = [staves[0]];
  for (let i = 1; i < staves.length; i++) {
    const gap = staves[i][0] - staves[i - 1][1];
    if (gap > threshold) { systems.push(cur); cur = [staves[i]]; } else { cur.push(staves[i]); }
  }
  systems.push(cur);
  // Cada sistema debe tener exactamente 2 pentagramas (violín+bajo); si algo
  // salió raro (ej. una sola línea suelta detectada de más), se descarta ese
  // grupo en vez de romper todo el análisis.
  return systems.filter((s) => s.length === 2);
}

/** Escapa texto para insertarlo de forma segura en HTML (contenido o atributos). */
export function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
