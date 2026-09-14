// Generación/armado de ejercicios y helpers de cálculo de duración.
// No hay backend: todo el catálogo vive en localStorage (ver store.js).
//
// Decisión (ver DECISIONES.md punto 16): se eliminaron los 22 grupos de
// ejercicios de ejemplo que traía el prototipo anterior. buildSeedExercises()
// ahora devuelve un array vacío a propósito — la biblioteca arranca vacía,
// lista para cargar contenido real desde "Nuevo ejercicio".
//
// Decisión (ver DECISIONES.md punto 14): el modelo de datos cambió de "una
// entrada por tonalidad" a "una lista de pasos" (`pasos[]`) por ejercicio.
// Cada paso representa una combinación tonalidad+dirección de fuelle (o
// cualquier otra cosa que el usuario quiera etiquetar) con su propia imagen
// y, opcionalmente, un audio de demostración por cada velocidad de metrónomo.

import {
  TONALIDADES_MENORES_12,
  BPM_OPTIONS,
  BPM_MIN,
  BPM_MAX,
  COMPAS_TIEMPOS,
} from './theory.js';
import { uid, slug } from './util.js';

/** BPM válido dentro del rango libre del metrónomo (ver DECISIONES.md punto 44). */
export function isValidBpm(v) {
  return Number.isFinite(v) && v >= BPM_MIN && v <= BPM_MAX;
}

/**
 * Cantidad real de tiempos del compás dado (ej. '3/4' → 3). Si el ejercicio
 * no tiene compás guardado (datos creados antes de este campo, ver
 * DECISIONES.md ronda 3 punto 23) cae en 4/4, que era el comportamiento fijo
 * anterior — así los ejercicios viejos siguen calculando igual que antes.
 */
export function tiemposPorCompas(compas) {
  return COMPAS_TIEMPOS[compas] || 4;
}

/** Calcula segundos por paso: (compases × tiempos reales del compás) / (BPM / 60). */
export function computeSecondsPerPaso(bpm, compases, compas) {
  const safeBpm = Math.max(20, Number(bpm) || 60);
  const safeCompases = Math.max(1, Number(compases) || 1);
  return (safeCompases * tiemposPorCompas(compas)) / (safeBpm / 60);
}

// Alias con el nombre anterior, por si queda algún llamador legado.
export const computeSecondsPerTonalidad = computeSecondsPerPaso;

/**
 * Cantidad de compases real de UN paso puntual (ver DECISIONES.md ronda 6,
 * punto 34): cada paso puede durar una cantidad distinta de compases (ej. un
 * paso "abriendo" de 8 compases y uno "cerrando" de 6), así que ya no hay un
 * único valor global por ejercicio. Si el paso no tiene su propio campo
 * `compases` (dato cargado antes de este cambio), cae al `compasesPorPaso`
 * del ejercicio (el viejo control global) y, si tampoco existe, a 2 — el
 * mismo valor por defecto que ya se usaba.
 */
export function pasoCompases(paso, exercise) {
  const propio = paso && Number(paso.compases);
  if (propio && Number.isFinite(propio) && propio > 0) return propio;
  const delEjercicio = exercise && Number(exercise.compasesPorPaso);
  if (delEjercicio && Number.isFinite(delEjercicio) && delEjercicio > 0) return delEjercicio;
  return 2;
}

/** Duración estimada de un ejercicio en minutos, para armar la rutina diaria. */
export function computeGroupDurationMin(group) {
  if (group.tipo === 'fuelle') return group.duracionEstimadaMin || 4;
  const pasos = group.pasos || [];
  if (pasos.length === 0) return 0;
  const totalSeg = pasos.reduce(
    (sum, p) => sum + computeSecondsPerPaso(group.bpmDefault, pasoCompases(p, group), group.compas),
    0
  );
  return totalSeg / 60;
}

/** Crea un paso vacío (sin imagen ni audio) para agregar a mano en "Nuevo ejercicio". */
export function makePasoEntry(groupId, etiqueta, orden, compases) {
  return {
    id: `${groupId}--p${orden}-${slug(etiqueta || 'paso')}-${Math.random().toString(36).slice(2, 6)}`,
    etiqueta: etiqueta || `Paso ${orden + 1}`,
    orden,
    compases: Number(compases) > 0 ? Number(compases) : 2, // ver DECISIONES.md ronda 6, punto 34
    imagenUrl: null, // el dato real se guarda aparte, ver store.getImageFor/setCustomImage
    audios: Object.fromEntries(BPM_OPTIONS.map((bpm) => [bpm, null])), // idem, ver store.getAudioFor
  };
}

/**
 * Genera el esqueleto de 12 pasos de "Arpegios menores": una tonalidad por
 * paso. Cada imagen contiene el sistema "abriendo" y el "cerrando" de esa
 * tonalidad apilados en una sola foto (recortados del PDF con el mismo
 * molde). El usuario completa después la imagen (y opcionalmente el audio)
 * de cada paso. Ver DECISIONES.md puntos 15 y 56.
 */
export function generateArpegioMenorPasos(groupId, compases) {
  const pasos = [];
  let orden = 0;
  for (const tonalidad of TONALIDADES_MENORES_12) {
    pasos.push(makePasoEntry(groupId, tonalidad, orden, compases));
    orden++;
  }
  return pasos;
}

export function buildSeedExercises() {
  // Ver nota de la cabecera del archivo y DECISIONES.md punto 16.
  return [];
}

export function newCustomExerciseSkeleton() {
  const id = uid('custom');
  return {
    id,
    nombre: '',
    nivel: 'principiante',
    tipo: 'fuelle',
    articulacion: '',
    grupoEspecial: null, // ej: 'arpegios-menores' — ver DECISIONES.md punto 15
    bpmDefault: 60,
    compas: '4/4', // ver DECISIONES.md ronda 3 punto 23
    compasesPorPaso: 2,
    duracionEstimadaMin: 5,
    descripcion: '',
    pasos: null, // array de pasos para escala/arpegio; null para fuelle
    custom: true,
    creadoEn: new Date().toISOString(),
  };
}
