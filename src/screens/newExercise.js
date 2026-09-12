// Alta de ejercicio nuevo — y edición de uno ya cargado.
//
// Decisión (ver DECISIONES.md punto 14): a diferencia del prototipo anterior
// (que creaba un ejercicio por tonalidad), este formulario permite cargar
// MÚLTIPLES imágenes ("pasos") dentro de una sola entrada de ejercicio, cada
// una con su propia etiqueta (ej. "La menor abriendo") y orden. El
// reproductor después recorre esos pasos en secuencia.
//
// Decisión (ver DECISIONES.md punto 15, generalizada en el punto 38): si el
// tipo es "arpegio" y el NOMBRE del ejercicio es exactamente "Arpegios
// menores" (insensible a mayúsculas/espacios), el ejercicio queda taggeado
// como parte del grupo especial "Arpegios menores" —sin importar qué
// articulación tenga— y aparece un botón para generar automáticamente el
// esqueleto de 24 pasos (12 tonalidades menores × abriendo/cerrando) en vez
// de cargarlos a mano.
//
// Decisión (ver DECISIONES.md punto 28): este mismo formulario sirve para
// EDITAR un ejercicio ya cargado (nivel, tipo, nombre, articulación, compás
// y pasos/imágenes) — la ruta `#/editar/<id>` llama a este mismo `render`
// con el id como `param`; si hay un ejercicio con ese id, el formulario se
// precarga con sus datos y el guardado actualiza en vez de crear uno nuevo.

import * as store from '../store.js';
import { newCustomExerciseSkeleton, makePasoEntry, generateArpegioMenorPasos, pasoCompases } from '../data.js';
import {
  NIVELES, NIVEL_LABEL, TIPOS, TIPO_LABEL,
  ARTICULACIONES, ARTICULACION_LABEL, ARTICULACIONES_ARPEGIO_MENOR, GRUPO_ARPEGIOS_MENORES,
  NOMBRE_GRUPO_ARPEGIOS_MENORES, BPM_OPTIONS, COMPAS_OPTIONS,
} from '../theory.js';
import { escapeHTML, normalizeNombre } from '../util.js';
import { toast } from '../ui.js';

export function render(container, { param, navigate }) {
  const existing = param ? store.getExerciseById(param) : null;
  const isEdit = !!existing;
  const exercise = existing ? { ...existing } : newCustomExerciseSkeleton();

  // Pasos existentes (si se está editando) con su imagen actual precargada
  // como vista previa, para que se vean en la lista igual que un paso recién
  // agregado. Ver DECISIONES.md punto 28.
  let pasos = existing && existing.pasos
    ? existing.pasos.slice().sort((a, b) => a.orden - b.orden)
      .map((p) => ({ ...p, compases: pasoCompases(p, existing), _imgPreview: store.getImageFor(p.id) || p.imagenUrl || null }))
    : []; // { id, etiqueta, orden, compases, _imgPreview }
  let bpm = BPM_OPTIONS.includes(existing?.bpmDefault) ? existing.bpmDefault : 60;
  let compases = existing?.compasesPorPaso || 2;
  let compas = COMPAS_OPTIONS.includes(existing?.compas) ? existing.compas : '4/4';
  let duracion = existing?.duracionEstimadaMin || 5;
  let fuelleImageDataUrl = existing && existing.tipo === 'fuelle' ? (store.getImageFor(existing.id) || null) : null;

  const articulacionOptions = [
    ...ARTICULACIONES,
    ...ARTICULACIONES_ARPEGIO_MENOR,
  ].map((a) => `<option value="${a}">${ARTICULACION_LABEL[a]}</option>`).join('');

  container.innerHTML = `
    <p class="subtitle">${isEdit
      ? 'Editá nivel, tipo, nombre, articulación, compás y los pasos/imágenes de este ejercicio.'
      : 'Cargá un ejercicio nuevo. Podés subir varias imágenes (una por cada tonalidad/dirección de fuelle) dentro de esta misma entrada.'}</p>

    <form id="newForm">
      <div class="field">
        <label for="f-nombre">Nombre del ejercicio</label>
        <input type="text" id="f-nombre" required placeholder="Ej: Escala Sol mayor — legato" value="${escapeHTML(exercise.nombre || '')}" />
        <div class="field-hint" id="nombreArpegioMenorHint" hidden>Si un ejercicio de tipo "Arpegio" se llama exactamente "Arpegios menores" (sin importar mayúsculas/espacios), se agrupa automáticamente en "Hoy" con las demás variantes de ese mismo nombre y nivel —cualquiera sea su articulación— para ciclarlas con un solo botón.</div>
      </div>

      <div class="field">
        <label for="f-nivel">Nivel</label>
        <select id="f-nivel">
          ${NIVELES.map((n) => `<option value="${n}" ${n === exercise.nivel ? 'selected' : ''}>${NIVEL_LABEL[n]}</option>`).join('')}
        </select>
      </div>

      <div class="field">
        <label for="f-tipo">Tipo</label>
        <select id="f-tipo">
          ${TIPOS.map((t) => `<option value="${t}" ${t === exercise.tipo ? 'selected' : ''}>${TIPO_LABEL[t]}</option>`).join('')}
        </select>
      </div>

      <div class="field" id="articulacionField">
        <label for="f-articulacion">Articulación</label>
        <select id="f-articulacion">
          ${articulacionOptions}
          <option value="otra">Otra…</option>
        </select>
        <input type="text" id="f-articulacion-otra" placeholder="Especificar articulación" hidden style="margin-top:8px;" />
        <div class="field-hint" id="arpegioMenorHint" hidden>Este ejercicio va a formar parte del grupo "Arpegios menores": en la pantalla "Hoy" se agrupa con las demás variantes de ese mismo nombre y nivel en una sola fila.</div>
      </div>

      <div class="field" id="bpmField">
        <div class="config-label" style="margin-bottom:8px;font-weight:700;color:var(--text);">Velocidad de metrónomo sugerida</div>
        <div class="bpm-picker" id="bpmPicker">
          ${BPM_OPTIONS.map((b) => `<button type="button" class="bpm-chip ${b === bpm ? 'active' : ''}" data-bpm="${b}">${b}</button>`).join('')}
        </div>
      </div>

      <div class="field" id="compasField">
        <label>Compás</label>
        <div class="field-hint">Determina cuántos tiempos dura cada paso y cada tiempo de la cuenta de anticipación (ver práctica).</div>
        <div class="chip-row" id="compasPicker">
          ${COMPAS_OPTIONS.map((c) => `<button type="button" class="chip ${c === compas ? 'active' : ''}" data-compas="${c}">${c}</button>`).join('')}
        </div>
      </div>

      <div class="field" id="compasesField">
        <label for="f-compases">Compases por defecto para pasos nuevos</label>
        <div class="field-hint">Cada paso tiene su propio campo de compases (más abajo, en su fila) porque puede durar una cantidad distinta — este valor solo se usa como punto de partida al agregar un paso nuevo o generar los 24 de "Arpegios menores".</div>
        <div class="stepper">
          <button type="button" class="icon-btn" id="compDown">−</button>
          <div class="stepper-value" id="compValue">${compases}</div>
          <button type="button" class="icon-btn" id="compUp">+</button>
        </div>
      </div>

      <div class="field" id="duracionField">
        <label for="f-duracion">Duración estimada (minutos)</label>
        <div class="stepper">
          <button type="button" class="icon-btn" id="durDown">−</button>
          <div class="stepper-value" id="durValue">${duracion}</div>
          <button type="button" class="icon-btn" id="durUp">+</button>
        </div>
      </div>

      <div class="field">
        <label for="f-descripcion">Descripción / indicaciones</label>
        <textarea id="f-descripcion" placeholder="Qué tener en cuenta al practicarlo">${escapeHTML(exercise.descripcion || '')}</textarea>
      </div>

      <div class="field" id="fuelleImgField">
        <label>Imagen de referencia (opcional)</label>
        <label class="file-drop" id="fileDrop">
          📷 Tocar para elegir una imagen
          <input type="file" accept="image/*" id="f-imagen" hidden />
        </label>
        <img id="imgPreview" class="file-preview" src="${fuelleImageDataUrl || ''}" ${fuelleImageDataUrl ? '' : 'hidden'} />
      </div>

      <div class="field" id="pasosField">
        <label>Pasos (imágenes en secuencia)</label>
        <div class="field-hint">Cada paso es una imagen (ej. "Am abriendo", "Am cerrando", "Bbm abriendo"…). El reproductor los recorre en este orden.</div>
        <button type="button" class="btn btn-outline btn-sm" id="generarArpegioBtn" hidden style="margin:10px 0;">✨ Generar 24 pasos (12 tonalidades × abriendo/cerrando)</button>
        <div id="pasosList"></div>
        <button type="button" class="btn btn-outline btn-sm" id="addPasoBtn" style="margin-top:8px;">+ Agregar paso</button>
      </div>

      <button type="submit" class="btn btn-primary" id="submitBtn">${isEdit ? 'Guardar cambios' : 'Guardar ejercicio'}</button>
    </form>
  `;

  const nivelSel = container.querySelector('#f-nivel');
  const tipoSel = container.querySelector('#f-tipo');
  const bpmField = container.querySelector('#bpmField');
  const compasesField = container.querySelector('#compasesField');
  const duracionField = container.querySelector('#duracionField');
  const compasField = container.querySelector('#compasField');
  const fuelleImgField = container.querySelector('#fuelleImgField');
  const pasosField = container.querySelector('#pasosField');
  const articulacionSel = container.querySelector('#f-articulacion');
  const articulacionOtra = container.querySelector('#f-articulacion-otra');
  const arpegioMenorHint = container.querySelector('#arpegioMenorHint');
  const nombreArpegioMenorHint = container.querySelector('#nombreArpegioMenorHint');
  const generarArpegioBtn = container.querySelector('#generarArpegioBtn');
  const pasosList = container.querySelector('#pasosList');
  const nombreInput = container.querySelector('#f-nombre');

  // Prefill de articulación (ver DECISIONES.md punto 28): si el valor
  // guardado no está entre las opciones fijas, se trata como "Otra…" con el
  // texto libre precargado.
  if (existing && existing.articulacion) {
    const conocidas = [...ARTICULACIONES, ...ARTICULACIONES_ARPEGIO_MENOR];
    if (conocidas.includes(existing.articulacion)) {
      articulacionSel.value = existing.articulacion;
    } else {
      articulacionSel.value = 'otra';
      articulacionOtra.value = existing.articulacion;
      articulacionOtra.hidden = false;
    }
  }

  // Ver DECISIONES.md punto 38: la pertenencia al grupo especial "Arpegios
  // menores" ya no depende de qué articulación se eligió (antes: solo
  // Portato/Nota repetida/Continuo) — depende únicamente de que el NOMBRE
  // del ejercicio (normalizado) coincida con el nombre del grupo. Así
  // cualquier rítmica/articulación nueva que el usuario cargue a futuro con
  // ese mismo nombre se agrupa sola, sin límite fijo de variantes.
  function esArpegioMenorPorNombre() {
    return tipoSel.value === 'arpegio' && normalizeNombre(nombreInput.value) === normalizeNombre(NOMBRE_GRUPO_ARPEGIOS_MENORES);
  }

  function syncVisibility() {
    const esFuelle = tipoSel.value === 'fuelle';
    bpmField.hidden = esFuelle;
    compasField.hidden = esFuelle;
    compasesField.hidden = esFuelle;
    pasosField.hidden = esFuelle;
    duracionField.hidden = !esFuelle;
    fuelleImgField.hidden = !esFuelle;
    if (esFuelle) nivelSel.value = 'principiante';

    // El aviso bajo "Nombre" (cómo entrar al grupo) se muestra para
    // cualquier arpegio, sin importar el nombre actual; el resto (botón de
    // generar 24 pasos + confirmación de que YA quedó agrupado) solo cuando
    // el nombre efectivamente coincide.
    nombreArpegioMenorHint.hidden = tipoSel.value !== 'arpegio';
    const especial = esArpegioMenorPorNombre();
    generarArpegioBtn.hidden = !especial;
    arpegioMenorHint.hidden = !especial;
  }

  tipoSel.addEventListener('change', syncVisibility);
  nombreInput.addEventListener('input', syncVisibility);
  syncVisibility();

  container.querySelector('#compasPicker').addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    compas = btn.dataset.compas;
    container.querySelectorAll('#compasPicker .chip').forEach((c) => c.classList.toggle('active', c.dataset.compas === compas));
  });

  articulacionSel.addEventListener('change', () => {
    articulacionOtra.hidden = articulacionSel.value !== 'otra';
    // Atajo de conveniencia: si el usuario elige una de las 3 articulaciones
    // "clásicas" del grupo y todavía no puso nombre, se sugiere el nombre
    // exacto del grupo (sin sufijo de articulación — ver punto 38, el
    // agrupamiento depende de que el nombre sea EXACTAMENTE "Arpegios
    // menores"). Para una articulación nueva/custom ("Otra…") no hay
    // articulación "conocida" de la cual inferir la sugerencia: el usuario
    // escribe el nombre "Arpegios menores" a mano, guiado por el hint de
    // abajo del campo Nombre.
    if (tipoSel.value === 'arpegio' && ARTICULACIONES_ARPEGIO_MENOR.includes(articulacionSel.value) && !nombreInput.value.trim()) {
      nombreInput.value = NOMBRE_GRUPO_ARPEGIOS_MENORES;
    }
    syncVisibility();
  });

  function stepper(downId, upId, valueId, get, set, min, max, step) {
    container.querySelector(downId).addEventListener('click', () => {
      set(Math.max(min, get() - step));
      container.querySelector(valueId).textContent = get();
    });
    container.querySelector(upId).addEventListener('click', () => {
      set(Math.min(max, get() + step));
      container.querySelector(valueId).textContent = get();
    });
  }

  stepper('#compDown', '#compUp', '#compValue', () => compases, (v) => (compases = v), 1, 8, 1);
  stepper('#durDown', '#durUp', '#durValue', () => duracion, (v) => (duracion = v), 1, 30, 1);

  container.querySelector('#bpmPicker').addEventListener('click', (e) => {
    const btn = e.target.closest('.bpm-chip');
    if (!btn) return;
    bpm = Number(btn.dataset.bpm);
    container.querySelectorAll('#bpmPicker .bpm-chip').forEach((c) => c.classList.toggle('active', Number(c.dataset.bpm) === bpm));
  });

  // ---------- Imagen única (ejercicios de fuelle) ----------

  const fileInput = container.querySelector('#f-imagen');
  const imgPreview = container.querySelector('#imgPreview');
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      fuelleImageDataUrl = reader.result;
      imgPreview.src = fuelleImageDataUrl;
      imgPreview.hidden = false;
    };
    reader.readAsDataURL(file);
  });

  // ---------- Pasos (imágenes en secuencia, escala/arpegio) ----------

  function pasoRowHTML(p, i) {
    return `
      <div class="card paso-row" data-idx="${i}">
        <div class="paso-row-head">
          <span class="paso-index">${i + 1}</span>
          <input type="text" class="paso-etiqueta" placeholder="Ej: Am abriendo" value="${escapeHTML(p.etiqueta)}" />
        </div>
        <div class="paso-row-body">
          <label class="file-drop file-drop-sm">
            ${p._imgPreview ? '🖼 Cambiar imagen' : '📷 Agregar imagen'}
            <input type="file" accept="image/*" class="paso-img-input" hidden />
          </label>
          ${p._imgPreview ? `<img class="file-preview file-preview-sm" src="${p._imgPreview}" alt="Vista previa" />` : ''}
        </div>
        <div class="paso-row-compases">
          <span class="paso-compases-label">Compases de este paso</span>
          <div class="stepper stepper-sm">
            <button type="button" class="icon-btn" data-comp-down="${i}" aria-label="Bajar compases de este paso">−</button>
            <div class="stepper-value" data-comp-value="${i}">${p.compases}</div>
            <button type="button" class="icon-btn" data-comp-up="${i}" aria-label="Subir compases de este paso">+</button>
          </div>
        </div>
        <div class="paso-row-actions">
          <button type="button" class="icon-btn" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Subir paso">↑</button>
          <button type="button" class="icon-btn" data-down="${i}" ${i === pasos.length - 1 ? 'disabled' : ''} aria-label="Bajar paso">↓</button>
          <button type="button" class="icon-btn" data-remove="${i}" aria-label="Quitar paso">✕</button>
        </div>
      </div>`;
  }

  function paintPasos() {
    pasos.forEach((p, i) => (p.orden = i));
    pasosList.innerHTML = pasos.length
      ? pasos.map((p, i) => pasoRowHTML(p, i)).join('')
      : '<p class="field-hint">Todavía no agregaste ningún paso/imagen.</p>';

    pasosList.querySelectorAll('.paso-etiqueta').forEach((input, i) => {
      input.addEventListener('input', () => { pasos[i].etiqueta = input.value; });
    });
    pasosList.querySelectorAll('.paso-img-input').forEach((input, i) => {
      input.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          pasos[i]._imgPreview = reader.result;
          paintPasos();
        };
        reader.readAsDataURL(file);
      });
    });
    pasosList.querySelectorAll('[data-up]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.up);
        if (i > 0) {
          [pasos[i - 1], pasos[i]] = [pasos[i], pasos[i - 1]];
          paintPasos();
        }
      });
    });
    pasosList.querySelectorAll('[data-down]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.down);
        if (i < pasos.length - 1) {
          [pasos[i + 1], pasos[i]] = [pasos[i], pasos[i + 1]];
          paintPasos();
        }
      });
    });
    pasosList.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.remove);
        pasos.splice(i, 1);
        paintPasos();
      });
    });
    // Compases propios de cada paso (ver DECISIONES.md ronda 6, punto 34):
    // mini-stepper por fila, igual patrón que ↑/↓/✕ pero solo repinta el
    // número (no hace falta un repintado completo de la lista).
    pasosList.querySelectorAll('[data-comp-down]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.compDown);
        pasos[i].compases = Math.max(1, pasos[i].compases - 1);
        pasosList.querySelector(`[data-comp-value="${i}"]`).textContent = pasos[i].compases;
      });
    });
    pasosList.querySelectorAll('[data-comp-up]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.compUp);
        pasos[i].compases = Math.min(16, pasos[i].compases + 1);
        pasosList.querySelector(`[data-comp-value="${i}"]`).textContent = pasos[i].compases;
      });
    });
  }

  container.querySelector('#addPasoBtn').addEventListener('click', () => {
    pasos.push(makePasoEntry(exercise.id, '', pasos.length, compases));
    paintPasos();
  });

  generarArpegioBtn.addEventListener('click', () => {
    pasos = generateArpegioMenorPasos(exercise.id, compases);
    paintPasos();
    toast('Se generaron 24 pasos. Completá la imagen de cada uno cuando la tengas.');
  });

  paintPasos();

  // ---------- Guardar ----------

  container.querySelector('#newForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = nombreInput.value.trim();
    if (!nombre) {
      toast('Poné un nombre para el ejercicio.');
      return;
    }

    const nivel = nivelSel.value;
    const tipo = tipoSel.value;
    const articulacion = articulacionSel.value === 'otra' ? articulacionOtra.value.trim() : articulacionSel.value;
    const descripcion = container.querySelector('#f-descripcion').value.trim();

    exercise.nombre = nombre;
    exercise.nivel = nivel;
    exercise.tipo = tipo;
    exercise.articulacion = articulacion || null;
    exercise.descripcion = descripcion;

    if (tipo === 'fuelle') {
      exercise.duracionEstimadaMin = duracion;
      exercise.pasos = null;
      exercise.grupoEspecial = null;
      if (fuelleImageDataUrl) store.setCustomImage(exercise.id, fuelleImageDataUrl);
    } else {
      if (pasos.length === 0) {
        toast('Agregá al menos un paso (imagen) antes de guardar.');
        return;
      }
      exercise.bpmDefault = bpm;
      exercise.compas = compas;
      exercise.compasesPorPaso = compases;
      // Ver DECISIONES.md punto 38: el grupo se asigna por NOMBRE (+ tipo
      // arpegio), no por una lista fija de articulaciones — así cualquier
      // rítmica nueva bajo el nombre "Arpegios menores" entra al grupo sola.
      exercise.grupoEspecial = (tipo === 'arpegio' && normalizeNombre(nombre) === normalizeNombre(NOMBRE_GRUPO_ARPEGIOS_MENORES)) ? GRUPO_ARPEGIOS_MENORES : null;
      exercise.pasos = pasos.map((p, i) => ({
        id: p.id,
        etiqueta: p.etiqueta.trim() || `Paso ${i + 1}`,
        orden: i,
        compases: Number(p.compases) > 0 ? Number(p.compases) : 2, // ver DECISIONES.md ronda 6, punto 34
        imagenUrl: null,
        audios: Object.fromEntries(BPM_OPTIONS.map((b) => [b, null])),
      }));
      pasos.forEach((p) => {
        if (p._imgPreview) store.setCustomImage(p.id, p._imgPreview);
      });
    }

    if (isEdit) {
      store.updateCustomExercise(exercise);
      toast('Ejercicio actualizado.');
    } else {
      store.saveCustomExercise(exercise);
      toast('Ejercicio guardado en la biblioteca.');
    }
    navigate('#/biblioteca');
  });
}
