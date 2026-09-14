// Constantes de dominio: niveles, tonalidades y articulaciones.
// Ver DECISIONES.md para las decisiones tomadas sobre alcance de tonalidades
// por nivel y qué articulaciones incluir en los datos de ejemplo.

export const NIVELES = ['principiante', 'intermedio', 'avanzado'];

export const NIVEL_LABEL = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

export const NIVEL_DESCRIPCION = {
  principiante: 'Notas largas y control de aire / fuelle. Sin escalas ni arpegios todavía.',
  intermedio: 'Escalas y arpegios en 4 tonalidades (La, Do, Re y Mi menor). Arpegios de 2 octavas.',
  avanzado: 'Escalas y arpegios en las 12 tonalidades, con extensión completa del instrumento.',
};

// Tonalidades menores fijas para el nivel intermedio (según especificación del producto).
export const TONALIDADES_INTERMEDIO = ['La menor', 'Do menor', 'Re menor', 'Mi menor'];

// Las 12 tonalidades mayores para el nivel avanzado (recorrido cromático por quintas).
// Decisión: se usan las 12 mayores (no las 24 combinando relativas menores) para mantener
// el set de datos de ejemplo manejable. Ver DECISIONES.md.
export const TONALIDADES_AVANZADO = [
  'Do mayor', 'Sol mayor', 'Re mayor', 'La mayor', 'Mi mayor', 'Si mayor',
  'Fa# mayor', 'Reb mayor', 'Lab mayor', 'Mib mayor', 'Sib mayor', 'Fa mayor',
];

// Las 12 tonalidades menores (todas las clases de altura), usadas para generar
// automáticamente los 24 pasos (12 tonalidades × abriendo/cerrando) de
// "Arpegios menores". Ver DECISIONES.md punto 15.
export const TONALIDADES_MENORES_12 = [
  'La menor', 'Mi menor', 'Si menor', 'Fa# menor', 'Do# menor', 'Sol# menor',
  'Reb menor', 'Lab menor', 'Mib menor', 'Sib menor', 'Fa menor', 'Do menor',
];

export const DIRECCIONES_FUELLE = ['abriendo', 'cerrando'];

export const ARTICULACIONES = ['legato', 'staccato', 'marcato', 'arrastre'];

// Articulaciones "conocidas" de "Arpegios menores": las 3 con las que nació
// el grupo especial (ver DECISIONES.md punto 15). Siguen ofreciéndose como
// opciones rápidas en el desplegable de articulación y determinan el orden
// de ciclado por defecto, pero YA NO son la única forma de pertenecer al
// grupo: cualquier ejercicio de tipo "arpegio" nombrado exactamente "Arpegios
// menores" (comparación insensible a mayúsculas/espacios, ver
// `normalizeNombre` en `util.js`) del mismo nivel se agrupa junto a estas,
// sin importar qué articulación tenga. Ver DECISIONES.md punto 38.
export const ARTICULACIONES_ARPEGIO_MENOR = ['portato', 'nota-repetida', 'continuo'];

export const GRUPO_ARPEGIOS_MENORES = 'arpegios-menores';
export const NOMBRE_GRUPO_ARPEGIOS_MENORES = 'Arpegios menores';

export const ARTICULACION_LABEL = {
  legato: 'Legato',
  staccato: 'Staccato',
  marcato: 'Marcato',
  arrastre: 'Arrastre',
  sostenido: 'Sostenido',
  picado: 'Picado',
  portato: 'Portato',
  'nota-repetida': 'Nota repetida',
  continuo: 'Continuo',
};

export const TIPO_LABEL = {
  fuelle: 'Fuelle',
  escala: 'Escala',
  arpegio: 'Arpegio',
};

export const TIPOS = ['fuelle', 'escala', 'arpegio'];

// Las 3 velocidades de audio de referencia por paso (ver DECISIONES.md
// puntos 19-20 y 44): cada paso puede tener un audio de demostración grabado
// a 40, 60 y/o 80 BPM. Sigue siendo un conjunto FIJO y chico a propósito —
// grabar/subir un audio de referencia a cualquier BPM no es práctico — pero
// desde el punto 44 ya NO es el único rango posible para el metrónomo en
// vivo: ver BPM_MIN/BPM_MAX más abajo.
export const BPM_OPTIONS = [40, 60, 80];

// Rango libre del metrónomo en vivo (reproductor y "BPM sugerido" al cargar
// un ejercicio) — ver DECISIONES.md punto 44. Tocar uno de los audios de
// referencia (BPM_OPTIONS) sincroniza el metrónomo exactamente a esa
// velocidad; fuera de eso, el usuario puede moverse libremente en este rango.
export const BPM_MIN = 10;
export const BPM_MAX = 300;

// Compases soportados por ejercicio (ver DECISIONES.md ronda 3, punto 23):
// antes la fórmula de duración por paso asumía siempre 4/4. Ahora el compás
// es un campo configurable con al menos estas 3 opciones, cada una con su
// cantidad real de tiempos.
export const COMPAS_OPTIONS = ['2/4', '3/4', '4/4'];
export const COMPAS_TIEMPOS = { '2/4': 2, '3/4': 3, '4/4': 4 };

// Agrupación de acento del metrónomo (ver DECISIONES.md punto 26): "cada
// cuántos tiempos" suena el golpe fuerte, de 0 (ningún tiempo acentuado) a 9.
// Es independiente del compás real del ejercicio (sirve para practicar
// agrupaciones asimétricas, ej. acentuar cada 5 tiempos en un 4/4).
export const ACENTO_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
