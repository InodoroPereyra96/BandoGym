# Decisiones tomadas de forma autónoma

Este documento registra las dudas de diseño/implementación que surgieron construyendo
el prototipo y la decisión que tomé en cada caso, con la razón. Se armó siguiendo la
consigna de trabajar sin pausar a preguntar.

## 1. Stack técnico: sin build ni framework

**Duda:** ¿React/Vite u otra herramienta con build step, o algo más simple?

**Decisión:** JavaScript vanilla con módulos ES nativos del navegador (sin bundler,
sin dependencias de npm), servido por un servidor estático mínimo (`server.js`, con
`http` de Node, cero dependencias externas).

**Por qué:** Es un prototipo que tiene que "andar" ya, sin depender de que
`npm install` funcione (posible falta de red, versiones, etc.). Los módulos ES
nativos ya soportan perfectamente organizar el código en archivos separados
(router, store, pantallas), y evitar el build step hace que cualquier cambio se
vea con solo refrescar el navegador. Si el proyecto crece y conviene sumar un
framework, la separación actual en módulos por pantalla facilita la migración.

## 2. Tema visual: oscuro fijo, sin modo claro automático

**Duda:** ¿Debía respetar `prefers-color-scheme` y ofrecer modo claro/oscuro?

**Decisión:** Un único tema oscuro de alto contraste (fondo bordó casi negro,
texto crema, acentos dorados/latón), sin alternancia automática.

**Por qué:** El contexto de uso descripto es "luz de sala variable, a veces
tenue" mientras se toca — un tema oscuro fijo reduce el deslumbramiento en
ensayo/práctica nocturna y da consistencia visual total (paleta, contraste)
sin duplicar el diseño. Si más adelante hace falta un tema claro para uso a
la luz del día, los tokens de color ya están centralizados en `:root` en
`src/styles.css`, así que agregarlo es acotado.

## 3. Tipografía: system fonts, no Google Fonts

**Duda:** ¿Cargar una tipografía serif "de época" (ej. Google Fonts) para reforzar
la identidad tanguera?

**Decisión:** Pila de fuentes del sistema — serif (`Georgia`, `Iowan Old Style`,
`Palatino Linotype`) para títulos, sans-system para el resto.

**Por qué:** La PWA tiene que funcionar offline (service worker) y las fuentes
externas no se pueden garantizar cacheadas de forma confiable sin complejizar el
service worker. Los stacks elegidos igual dan un aire serio/editorial en los
títulos sin depender de red.

## 4. Alcance de tonalidades en nivel avanzado

**Duda:** La consigna pide "12 tonalidades" para avanzado pero no especifica si son
mayores, menores, o ambas (24 combinadas).

**Decisión:** Las 12 tonalidades mayores (Do, Sol, Re, La, Mi, Si, Fa#, Reb, Lab,
Mib, Sib, Fa mayor), recorriendo el círculo de quintas.

**Por qué:** Es la lectura más simple de "12 tonalidades" y mantiene el volumen de
datos de ejemplo manejable. Agregar las relativas menores como un segundo set
(24 en total) es una extensión directa del mismo generador de datos
(`src/data.js`) cuando se cargue contenido real.

## 5. Extensión de octavas en escalas

**Duda:** La consigna especifica extensión de 2 octavas para arpegios de nivel
intermedio, pero no dice nada de la extensión de las *escalas* en intermedio, ni
da un número concreto para "extensión completa" en avanzado.

**Decisión:** Escalas intermedias: 2 octavas (igual que los arpegios de ese
nivel). Escalas y arpegios avanzados: 3 octavas, etiquetado como "extensión
completa".

**Por qué:** Mantiene coherencia entre escalas y arpegios dentro de un mismo
nivel, y 3 octavas es una extensión práctica razonable en bandoneón para
representar "completa" en este prototipo. Es un campo (`extensionOctavas`)
editable en los datos, así que se ajusta fácil cuando haya contenido real.

## 6. Dato atómico: grupo de ejercicio vs. entrada por tonalidad

**Duda:** La consigna pide que "cada articulación se cargue como ejercicio
separado" pero también que "cada tonalidad sea una entrada de datos separada"
para poder subir una foto por cada una. ¿Cómo se concilian ambas reglas?

**Decisión:** Dos niveles de dato:
- **Grupo de ejercicio** = nivel + tipo (escala/arpegio) + articulación (+
  extensión de octavas si aplica). Este es el "ejercicio" que aparece en la
  rutina de "Hoy" y en la Biblioteca.
- **Entrada de tonalidad** = una fila dentro de `tonalidades[]` del grupo, con
  su propio `id` y su propio campo de imagen. El reproductor recorre estas
  entradas en secuencia.

**Por qué:** Así una articulación (ej. "Escala — Staccato") es un ejercicio
único y autocontenido (cumple la regla de datos), pero interna­mente contiene
una entrada separada por tonalidad, cada una lista para recibir su propia
foto de partitura (cumple el requisito del reproductor). Los ejercicios de
fuelle (nivel principiante) no tienen tonalidad, así que su `tonalidades` es
`null`.

## 7. El paso de "fuelle" en la rutina de intermedio/avanzado

**Duda:** La consigna describe los niveles como "tipos de contenido distintos, no
la misma dificultad progresiva" (principiante = solo fuelle; intermedio/avanzado
= solo escalas y arpegios), pero el ejemplo de rutina diaria dice "1° técnica de
fuelle, 2° escalas, 3° arpegios" — lo cual sugiere que el calentamiento de fuelle
es parte del ritual en *todos* los niveles.

**Decisión:** El catálogo de ejemplo solo trae ejercicios de fuelle taggeados
como nivel "principiante" (son los únicos datos de fuelle cargados), pero el
armado de la rutina diaria (`buildRoutine` en `src/store.js`) trata el paso de
fuelle como compartido entre los tres niveles: intermedio y avanzado también
empiezan su rutina con un paso de fuelle, tomado del mismo pool.

**Por qué:** Prioricé seguir el ejemplo explícito de ritual (fuelle siempre
primero) antes que la lectura estricta de "principiante = solo fuelle" como
exclusión total en los otros niveles. Cuando se cargue contenido real, nada
impide crear ejercicios de fuelle específicamente taggeados como intermedio/
avanzado (el alta de ejercicio nuevo lo permite) — en ese caso, cada nivel
verá los suyos.

## 8. Alta manual: un ejercicio por tonalidad, no el grupo completo

**Duda:** La pantalla de carga de ejercicio nuevo pedida en el MVP es simple
("nombre, nivel, tipo, tonalidad si aplica, articulación, imagen"). Pero un
grupo real de escala/arpegio tiene 4 o 12 tonalidades.

**Decisión:** Cada alta manual crea un ejercicio de **una sola tonalidad** (o
sin tonalidad, si es de fuelle). Para armar un grupo completo (ej. las 12
tonalidades de una escala en staccato) hay que cargar una entrada por cada
tonalidad.

**Por qué:** Es justo lo que pide el MVP ("pantalla simple") — una carga
masiva/por planilla es una mejora natural para cuando haya backend real, y no
tiene sentido resolverla ad-hoc en este prototipo.

> **Actualización (ver punto 14):** esta decisión quedó superada por un pedido
> posterior de soporte de múltiples imágenes por ejercicio. El alta ahora
> permite cargar varios "pasos" (imágenes) dentro de una misma entrada, en
> vez de una tonalidad por alta. Se deja este punto sin borrar porque explica
> por qué el prototipo original tenía esa limitación.

## 9. Repetición espaciada: fórmula simplificada (no SM-2 completo)

**Duda:** ¿Implementar un algoritmo de repetición espaciada tipo SM-2 (con
factor de facilidad, etc.) o algo más simple?

**Decisión:** Un esquema simplificado de 3 niveles: "me costó" → repasar mañana
(intervalo 1 día), "normal" → intervalo × 1.6, "bien" → intervalo × 2.3 (con
mínimos). La prioridad de selección para la rutina es "cuánto tiempo pasó desde
que venció el repaso" (más vencido = mayor prioridad); lo nunca practicado
tiene prioridad máxima.

**Por qué:** Es suficiente para que la rutina se sienta "viva" (prioriza lo que
peor salió o lo que nunca se probó) sin la complejidad de un SM-2 completo, que
sería sobre-ingeniería para un catálogo de ejemplo tan chico.

## 10. Reparto del tiempo disponible entre pasos de la rutina

**Duda:** La consigna dice que la duración total se ajusta según el tiempo
disponible (15/30/45 min), pero no especifica cómo repartir ese tiempo entre
fuelle / escalas / arpegios.

**Decisión:** 20% fuelle / 40% escalas / 40% arpegios cuando hay 3 pasos
(intermedio/avanzado); 100% fuelle cuando solo hay ese paso (principiante).
Dentro de cada paso, se van sumando ejercicios (por prioridad de repaso) hasta
cubrir su presupuesto de tiempo.

**Por qué:** Es un reparto razonable que le da más peso a escalas/arpegios (el
contenido técnico principal) sin descuidar el calentamiento. Es una constante
fácil de ajustar (`REPARTO_3_PASOS` en `src/store.js`) si en el uso real
conviene otro balance.

**Nota sobre el dato de ejemplo:** con el catálogo semilla (4 articulaciones por
tipo/nivel) las duraciones estimadas son cortas, así que en la práctica el
algoritmo termina incluyendo *todas* las articulaciones disponibles de escalas
y arpegios en vez de un subconjunto — no hay suficientes candidatos para
recortar. Esto se resuelve solo a medida que se cargue más contenido real
(más variantes por articulación/tonalidad).

## 11. "Otro similar" sin reemplazo disponible

**Duda:** ¿Qué pasa si el usuario pide "otro similar" y no hay otro ejercicio de
esa categoría/nivel que no esté ya en la rutina del día?

**Decisión:** Se muestra un aviso ("No hay otro ejercicio similar disponible
todavía.") y no se cambia nada.

**Por qué:** Con el catálogo de ejemplo (pocas variantes por categoría) este
caso va a ser frecuente al principio; falla de forma silenciosa y clara en vez
de romper la rutina o repetir un ejercicio ya asignado.

## 12. Persistencia: perfil único, sin login

**Decisión:** No hay pantalla de login ni multi-usuario: hay un solo perfil
guardado en `localStorage` del navegador.

**Por qué:** No estaba pedido y el foco del prototipo es la lógica de
práctica, no autenticación. El progreso vive en el dispositivo (se pierde si se
borran los datos del sitio) — aceptable para esta etapa, documentado también
en el README.

## 13. Imagen placeholder de partitura

**Decisión:** SVG genérico generado en el momento (pentagrama + clave + notas
de relleno + el nombre de la tonalidad superpuesto), no una imagen estática
única para todos los ejercicios.

**Por qué:** Da una referencia visual distinta por tonalidad (aunque el
contenido "musical" del SVG no representa notación real) y evita depender de un
archivo de imagen externo. Cada entrada de tonalidad ya tiene su propio `id`
para que, al subir una foto real (desde el reproductor o desde "Nuevo
ejercicio"), reemplace este placeholder de forma independiente.

---

## Ronda 2 — cambios pedidos sobre el prototipo ya andando

Las decisiones 14 a 22 corresponden a una segunda tanda de cambios (modelo de
datos multi-imagen, "Arpegios menores", limpieza de datos de ejemplo, práctica
horizontal, metrónomo real y audio de demostración), trabajados de forma
autónoma sobre el prototipo descripto arriba.

## 14. Modelo de datos: "pasos" en vez de "tonalidades", sin migración de la seed

**Duda:** El pedido es que un ejercicio tenga **múltiples imágenes** (una por
combinación tonalidad+dirección de fuelle, ej. "Am abriendo", "Am cerrando",
"Bbm abriendo"), cada una con etiqueta y orden propios. ¿Renombro/extiendo la
estructura `tonalidades[]` existente (ver punto 6) o hago un modelo nuevo? ¿Y
qué hago con los datos ya generados por el prototipo anterior?

**Decisión:** Se reemplazó `tonalidades[]` por `pasos[]` en cada ejercicio.
Cada paso es `{ id, etiqueta, orden, imagenUrl, audios: {40,60,80} }` — la
`etiqueta` es texto libre (no un campo de tonalidad tipado), así sirve tanto
para "La menor abriendo" como para cualquier otra cosa que el usuario quiera
practicar en secuencia. El reproductor recorre `pasos` ordenados por `orden`
con el mismo mecanismo de avance automático por BPM/compases que ya existía.
No se migraron datos: como al mismo tiempo se pidió vaciar la biblioteca de
ejemplo (punto 16), no había contenido real que migrar. Para que datos viejos
con la forma anterior (si alguien había cargado algo a mano) no rompan la app
al leerlos con el código nuevo, se bumpearon a `:v2` las claves de
`localStorage` de ejercicios personalizados, imágenes, "hoy" y configuración
del reproductor (`fuelle:customExercises`, `fuelle:customImages`,
`fuelle:todayState`, `fuelle:playerSettings:<id>`) — los datos con la clave
vieja quedan simplemente huérfanos e inofensivos.

**Por qué:** Un modelo nuevo y más simple (`pasos[]` con etiqueta libre) es
más flexible que forzar el campo `tonalidad` a servir también para
direcciones de fuelle u otras secuencias futuras, y evita cargar el código de
migración de un modelo viejo cuyo único contenido real era la seed que de
todos modos se iba a borrar.

## 15. "Arpegios menores": grupo especial con switch de articulación dedicado

**Duda:** El pedido es que "Arpegios menores" sean, en los datos, 3 ejercicios
independientes (Portato / Nota repetida / Continuo, cada uno con sus 24
imágenes), pero que en "Hoy" aparezcan como **una sola fila**, y que el botón
de esa fila cicle entre las 3 articulaciones en vez de comportarse como el
"otro similar" genérico. ¿Cómo se modela esto sin crear un tipo de dato
completamente paralelo al resto de ejercicios (que ya funcionan por
nivel+tipo+articulación)?

**Decisión:**
- Cada una de las 3 articulaciones sigue siendo un ejercicio normal
  (`tipo: 'arpegio'`), pero con un campo nuevo `grupoEspecial:
  'arpegios-menores'` que se asigna automáticamente en "Nuevo ejercicio"
  cuando la articulación elegida es Portato, Nota repetida o Continuo.
- Al armar la rutina de "Hoy" (`buildRoutine` en `store.js`), los ejercicios
  que comparten `grupoEspecial` se agrupan en un único candidato "virtual"
  que ocupa un solo lugar en la rutina (en vez de 3), eligiendo como variante
  activa inicial la de mayor prioridad de repaso.
- El paso de la rutina guarda `variantIds` (los ids de las 3 articulaciones,
  en el orden fijo Portato → Nota repetida → Continuo) además del
  `exerciseId` activo. El botón de la fila llama a
  `store.cycleGrupoEspecialStep`, que rota al siguiente id de `variantIds` en
  vez de llamar a `findSimilar` (el mecanismo de "otro similar" genérico).
  Si todavía no se cargaron las 3 variantes, cicla solo entre las que
  existen.
- `findSimilar` (usado por el resto de ejercicios, ej. Escalas) filtra
  explícitamente los ejercicios con `grupoEspecial`: nunca deben aparecer
  como sugerencia de "otro similar" genérico, solo a través de este
  mecanismo dedicado.
- Para agilizar la carga real, "Nuevo ejercicio" ofrece un botón "Generar 24
  pasos" que arma automáticamente el esqueleto de 12 tonalidades menores
  (`TONALIDADES_MENORES_12`, ver `theory.js`) × abriendo/cerrando, listo para
  completar con imágenes.

**Por qué:** Este enfoque reutiliza toda la infraestructura existente
(repetición espaciada, biblioteca, formulario de alta) sin crear un tipo de
ejercicio paralelo — "Arpegios menores" sigue siendo 3 ejercicios de tipo
`arpegio` normales y corregibles individualmente desde la Biblioteca — y
concentra el comportamiento especial únicamente en la pantalla "Hoy" y en el
armado de la rutina, que es donde el pedido lo requiere explícitamente.

## 16. Limpieza de datos de ejemplo: `buildSeedExercises()` devuelve `[]`

**Decisión:** Se eliminó el generador de los 22 grupos de ejemplo
(`buildEscalaArpegioGrupos`/`buildFuelleGrupos` en `data.js`). La función
`buildSeedExercises()` se dejó en el código (para no romper el import en
`store.js`) pero ahora devuelve siempre un array vacío, con un comentario que
explica la decisión. La biblioteca arranca vacía.

**Por qué:** Es exactamente lo pedido ("la biblioteca debe quedar vacía"). Se
mantuvo la función (en vez de borrarla y tocar `store.js`) para que quede
documentado en el propio código por qué existe una función que no genera
nada, y porque simplifica volver a poblarla con datos reales de prueba en el
futuro si hiciera falta.

## 17. Horizontal solo en Práctica: clase en `<body>` + best-effort Screen Orientation API

**Duda:** El pedido es que la pantalla de Práctica soporte horizontal
aprovechando el ancho, mientras el resto de las pantallas se mantiene en
vertical. La Screen Orientation API (`screen.orientation.lock()`) es la única
forma de *forzar* la orientación del dispositivo, pero solo funciona en
navegadores/contextos que la soportan (en la práctica, casi exclusivamente
Chrome/Android con la PWA instalada y en pantalla completa; Safari/iOS no la
implementa en absoluto). ¿Cómo se cumple el pedido de forma realista?

**Decisión:** Dos mecanismos combinados:
1. Al entrar a Práctica se intenta `screen.orientation.lock('landscape')`
   dentro de un `try/catch`, ignorando el error si no está disponible (y se
   llama a `unlock()` al salir). Es *best-effort*: en los contextos que lo
   soportan, fuerza el giro; en el resto, no hace nada (no rompe la app).
2. Independientemente de que el lock funcione, el layout de Práctica se
   adapta con `@media (orientation: landscape)` a un grid de 2 columnas
   (partitura grande a la izquierda, controles a la derecha) — así, si el
   usuario gira el dispositivo a mano (el camino que sí funciona en
   cualquier navegador), la pantalla ya se ve optimizada para ese ancho.
   Esta regla de CSS está *scopeada* con una clase `is-player` que
   `player.js` agrega a `<body>` solo mientras esa pantalla está montada
   (y quita en `destroy()`), así el resto de pantallas (Hoy, Biblioteca,
   Nuevo, Perfil) nunca reciben layout horizontal aunque el dispositivo esté
   físicamente apaisado.

**Por qué:** Forzar la rotación de forma 100% confiable no es técnicamente
posible en todos los navegadores/contextos, así que la solución robusta es
que el layout se vea bien en horizontal sin depender de que el lock
funcione, y usar el lock solo como una ayuda adicional donde el navegador lo
permite.

## 18. Zoom/pantalla completa de la partitura: implementación propia, sin librerías

**Duda:** El pedido es pellizco/doble-tap para zoom y un modo de pantalla
completa para la partitura. No hay build step ni bundler (ver punto 1), y la
lista blanca de CDN del entorno de Artifacts no aplica acá (esto es la app en
sí, no un artifact) — igual, para mantener el prototipo sin dependencias
externas (relevante para que el service worker pueda cachear todo para uso
offline, ver punto 3), se evita sumar una librería de gestos.

**Decisión:** `src/zoom.js` implementa pellizco (dos punteros, escala
proporcional a la distancia entre ellos), paneo (un puntero, cuando ya hay
zoom aplicado) y doble-tap (detectado por tiempo entre dos `pointerup`
consecutivos) a mano con Pointer Events nativos, aplicando `transform:
translate() scale()` sobre la imagen/SVG actual. El zoom se resetea a escala
1 cada vez que el reproductor cambia de paso. La pantalla completa usa la
Fullscreen API nativa (`element.requestFullscreen()`) sobre un contenedor que
envuelve únicamente el marco de la partitura (no toda la pantalla de
Práctica), así el mismo botón que la activa queda visible dentro del área en
pantalla completa para poder salir.

**Por qué:** Evita una dependencia externa (no hay npm ni CDN disponibles
offline) para una interacción que, con Pointer Events, es abarcable a mano en
pocas líneas. Fullscheenear solo el marco de la partitura (y no la pantalla
completa de la app) es más simple de implementar correctamente que ocultar/
mostrar el resto de los controles a mano.

## 19. Metrónomo real con Web Audio API y 3 velocidades fijas (40/60/80)

**Duda:** ¿Cómo generar un click "audible real" sin archivos de audio
externos, y cómo encajarlo con el reemplazo del control de BPM libre por 3
velocidades fijas?

**Decisión:** `src/metronome.js` genera el click con un oscilador +
envolvente de ganancia por Web Audio API (sin ningún archivo de audio), usando
la técnica estándar de *lookahead scheduling* (agendar los próximos clicks
sobre el reloj de precisión `audioContext.currentTime`, revisado cada 25ms)
en vez de `setInterval` puro, para que no arrastre deriva. El intervalo entre
clicks es `60 / bpm` segundos (un click por tiempo, no por compás) — esto
encaja exactamente con la fórmula ya existente para el avance de pasos
(`segundos = compases × 4 / (bpm/60)`, que asume 4 tiempos por compás), así
que metrónomo y avance de pasos comparten el mismo valor de BPM y quedan
sincronizados por diseño. El control de BPM libre (steppers +/-) se reemplazó
en **toda la app** — tanto en el reproductor como en "Nuevo ejercicio" (BPM
sugerido) — por un selector de 3 botones fijos: 40, 60 y 80 BPM
(`BPM_OPTIONS` en `theory.js`).

**Por qué:** El lookahead scheduling es la técnica recomendada para
metrónomos en Web Audio (evita el jitter del event loop de JS). Acotar a 3
velocidades fijas en toda la app (no solo en el reproductor) mantiene
consistencia: el BPM "sugerido" al cargar un ejercicio ahora es realmente uno
de los 3 valores que el metrónomo puede reproducir.

## 20. Audio de demostración por paso y por velocidad: carga posterior, reproducción manual

**Duda:** El pedido dice que el usuario "va a subir él mismo después" el
audio de cada paso, con un audio distinto posible por cada una de las 3
velocidades. ¿Se carga en el mismo formulario de "Nuevo ejercicio" (junto con
las imágenes) o en el reproductor? ¿Se reproduce automáticamente al llegar a
ese paso, junto con el metrónomo, o el usuario lo dispara a mano?

**Decisión:**
- El audio se carga **desde el reproductor** (no desde "Nuevo ejercicio"),
  con un control por paso y por velocidad (40/60/80): si no hay audio
  cargado para esa velocidad se muestra un botón de carga (`accept="audio/*"`,
  igual que el de imagen); si ya hay uno, se muestra un botón "▶" para
  reproducirlo y otro para quitarlo. Se guarda en `localStorage`
  (`fuelle:customAudios:v2`, `{ [pasoId]: { 40: dataUrl, 60: ..., 80: ... } }`),
  con el mismo patrón que ya existía para las imágenes (separado del objeto
  del ejercicio).
- La reproducción es **manual** (botón "▶"), no automática al cambiar de
  paso ni sincronizada al segundo con el metrónomo: el usuario dispara el
  audio de referencia cuando quiere escucharlo, pudiendo tenerlo sonando
  junto con el metrónomo si así lo prefiere.

**Por qué:** Cargarlo desde el reproductor (en vez de en el alta) refleja
literalmente el flujo descripto ("lo va a subir él mismo después") y evita
un formulario de alta todavía más largo (ya carga N imágenes, sumarle 3
campos de audio por paso lo haría pesado de usar). Que la reproducción sea
manual evita la complejidad de orquestar solapamientos de audio si el usuario
navega rápido entre pasos, y es más predecible: el audio de demostración es
una referencia que se consulta cuando se la necesita, no una pista que se
reproduce sola.

## 21. "Otro similar" nunca sugiere ejercicios de un `grupoEspecial`

Ver el mecanismo completo en el punto 15. Se documenta acá también porque es
una decisión sobre el comportamiento general de "otro similar" (`findSimilar`
en `store.js`), no solo sobre "Arpegios menores": cualquier ejercicio futuro
que use `grupoEspecial` quedará automáticamente afuera del switch genérico y
va a necesitar su propio mecanismo de ciclado dedicado, tal como hoy lo tiene
"Arpegios menores".

## 22. Reordenar pasos con botones ↑/↓, no drag-and-drop

**Duda:** El formulario de "Nuevo ejercicio" necesita permitir reordenar los
pasos/imágenes cargados. ¿Drag-and-drop o controles más simples?

**Decisión:** Botones ↑/↓ por fila (deshabilitados en los extremos) en vez de
arrastrar y soltar.

**Por qué:** Sin bundler ni librerías (ver punto 1 y 18), implementar
drag-and-drop táctil correcto (con scroll de la lista, umbral de arrastre,
soporte de mouse y touch a la vez) es bastante más código y superficie de
bugs que un par de botones, que además son más accesibles y funcionan igual
de bien con mouse, touch o teclado.

---

## Ronda 3 — edición de ejercicios, compás configurable, sincronización real
## con el metrónomo, volumen independiente, cuenta de anticipación y acento

Las decisiones 23 a 28 corresponden a una tercera tanda de cambios, trabajados
de forma autónoma sobre el prototipo ya andando (rondas 1 y 2 arriba), sin
pausar a preguntar según la consigna. En términos generales, el reproductor
de escala/arpegio (`src/screens/player.js`) y el metrónomo (`src/metronome.js`)
se reescribieron con más profundidad que el resto: los puntos 24 y 25
documentan por qué.

## 23. Compás configurable (2/4, 3/4, 4/4), con fallback a 4/4 en datos viejos

**Duda:** La fórmula de duración por paso (`computeSecondsPerPaso`) asumía
siempre compás 4/4 (`compases × 4 tiempos`). El pedido es que el compás sea
un campo configurable por ejercicio, con al menos 2/4, 3/4 y 4/4, y que tanto
el metrónomo como el cálculo de segundos usen la cantidad real de tiempos de
ese compás. ¿Cómo se agrega el campo sin romper los ejercicios ya cargados
por el usuario (que no lo tienen)?

**Decisión:**
- Nuevas constantes en `theory.js`: `COMPAS_OPTIONS = ['2/4', '3/4', '4/4']` y
  `COMPAS_TIEMPOS` (el mapa a cantidad real de tiempos: 2, 3, 4).
- Nuevo campo `compas` en el ejercicio (junto a `bpmDefault`/`compasesPorPaso`),
  editable en "Nuevo ejercicio"/"Editar ejercicio" con un selector de chips,
  visible solo para escala/arpegio (igual que BPM y compases/paso).
- `computeSecondsPerPaso(bpm, compases, compas)` en `data.js` ahora multiplica
  por `tiemposPorCompas(compas)` en vez de la constante `4` fija.
  `tiemposPorCompas` devuelve `4` si el ejercicio no tiene `compas` guardado
  (dato creado antes de este campo), preservando exactamente el cálculo
  anterior para esos ejercicios sin necesidad de migrar datos ni bumpear la
  clave de `localStorage` — es un campo aditivo con fallback seguro.
- El metrónomo en sí (intervalo entre clicks = `60/bpm`, uno por tiempo) no
  cambia: lo que cambia es cuántos tiempos componen un paso y la cuenta de
  anticipación (ver puntos 24 y 27), que ahora usan los tiempos reales del
  compás en vez de asumir 4.

**Por qué:** Es la lectura literal del pedido, con la menor cantidad de
código nuevo posible, y sin dejar huérfanos los ejercicios ya cargados por
el usuario en las rondas anteriores (que van a seguir sonando exactamente
igual que antes, en 4/4, hasta que alguien les edite el compás desde
"Editar ejercicio").

## 24. El metrónomo pasa a ser la única fuente de verdad temporal (bug de desincronización)

**Duda:** El bug reportado es que la barra de progreso corre con su propio
timer en segundos (`setInterval` de 150ms comparando contra
`computeSecondsPerPaso`), separado del *lookahead scheduler* de audio del
metrónomo — ambos relojes se desfasan con el tiempo (jitter del event loop,
redondeo de segundos vs. tiempos exactos). El pedido es que haya una única
fuente de tiempo, que la barra sea segmentos discretos (uno por tiempo) que
se completan con cada click, y que el cambio de paso se dispare desde el
mismo scheduler de audio. ¿Cómo se hace que el *scheduler* de Web Audio
"avise" a la UI en el momento exacto de cada click, si el reloj de audio
(`audioContext.currentTime`) no genera eventos de JavaScript por sí solo?

**Decisión:** Se combinó el *lookahead scheduling* que ya existía (agendar
clicks de audio con antelación sobre `audioContext.currentTime`) con un
segundo loop de dibujo por `requestAnimationFrame` que compara ese mismo
reloj de audio contra la cola de clicks ya agendados, y dispara un callback
`onBeat(beatIndex, isAccent)` apenas cada uno "sucede" — es la técnica
estándar para sincronizar visuales con Web Audio (ver el artículo de
referencia de Chris Wilson, "A Tale of Two Clocks"). `createMetronome().start()`
ahora recibe ese callback y es la ÚNICA función que decide cuándo pasó un
tiempo; el reproductor (`player.js`) ya no tiene ningún `setInterval` propio
para el avance de pasos ni para la barra de progreso — reacciona a
`onBeat`, contando tiempos transcurridos dentro del paso actual
(`beatsElapsedInPaso`) y disparando el cambio de paso exactamente cuando ese
contador llega a `compases × tiempos del compás` (ver punto 23). La barra
de progreso (`.progress-segments`) se redibuja como N segmentos discretos
(uno por tiempo del paso actual) y cada uno se marca "lleno" en el mismo
callback, en vez de una barra continua con `width: X%` calculado en
milisegundos aparte.

**Por qué:** Es la forma correcta y estándar de resolver el problema de raíz
(dos relojes independientes que se desfasan) en vez de parchear el timer
existente para que sea "más preciso" — eso solo reduciría el desfasaje, no
lo eliminaría. Al eliminar el `setInterval` de progreso y dejar que todo
dependa de `onBeat`, es estructuralmente imposible que la barra y el
metrónomo se desincronicen: son la misma señal.

## 25. Volumen del metrónomo y del audio demo: independientes y globales; volumen 0 no apaga el reloj

**Duda:** El pedido es "dos controles de volumen, uno para el metrónomo y
otro para el audio de demostración, ajustables de forma independiente". Dos
sub-dudas: (a) ¿el volumen se guarda por ejercicio (como BPM/compases) o es
una preferencia global del usuario? (b) el punto 24 establece que el
metrónomo debe seguir siendo la fuente de tiempo *siempre* que se está
reproduciendo — pero si el volumen del metrónomo se pone en 0, ¿deja de
sonar/agendarse el click, o sigue existiendo el reloj en silencio?

**Decisión:**
- (a) Volumen **global**, no por ejercicio: `store.getAudioSettings()` /
  `setAudioSettings()` guardan `{ metronomeVolume, demoVolume }` en una clave
  nueva de `localStorage` (`fuelle:audioSettings`), separada de
  `playerSettings` (que sigue siendo por ejercicio, para BPM/compases/acento).
  Se reemplazó el botón on/off "Metrónomo activado/desactivado" que existía
  antes por el slider de volumen (0% equivale al mute anterior).
- (b) El volumen nunca desactiva el *scheduling*: `scheduleClick` en
  `metronome.js` sigue agendando (y "sonando", aunque sea con una ganancia
  mínima de 0.0001, inaudible) cada click independientemente del volumen, y
  el callback `onBeat` se sigue disparando igual. Lo único que cambia con el
  volumen es la ganancia del oscilador.

**Por qué:** (a) El volumen de escucha ("no quiero que el click tape el
audio de referencia") es una preferencia de cómo el usuario quiere *oír* la
práctica, no algo específico de un ejercicio puntual — tiene más sentido que
se mantenga entre ejercicios, como el volumen del sistema. (b) Si volumen 0
desactivara el reloj interno, se reintroduciría exactamente el problema del
punto 24 (una fuente de tiempo que se puede "apagar" sin querer, dejando a
la barra de progreso y al avance de pasos sin motor) — bajar el volumen a 0
tiene que ser indistinguible, para la lógica de sincronización, de tenerlo
al 50%.

## 26. Acento configurable (0-9), independiente del compás real, persistido por ejercicio

**Duda:** El metrónomo anterior acentuaba siempre el primer tiempo de cada
grupo de 4 (`beatCount % 4 === 0`), asumiendo 4/4 fijo — igual que la
fórmula de duración (ver punto 23). El pedido es un selector 0-9 (0 = ningún
acento) para practicar agrupaciones asimétricas, EXPLÍCITAMENTE
independiente del compás real. ¿Dónde se guarda ese valor, y qué valor
inicial tiene por defecto?

**Decisión:** `createMetronome` recibe `accentEvery` (0-9) en `start()` y en
`setAccentEvery()`; el acento se calcula como `accentEvery > 0 && beatIndex %
accentEvery === 0`, sin ninguna relación con los tiempos del compás. Se
persiste **por ejercicio**, junto a BPM y compases/paso, en el mismo objeto
de `playerSettings` que ya existía (`fuelle:playerSettings:v2:<id>`) — no
hizo falta bumpear la clave, el campo nuevo simplemente no existe en
configuraciones viejas y cae al valor por defecto. El valor por defecto
(cuando el usuario todavía no lo cambió) es la cantidad de tiempos del
compás real del ejercicio (ej. 3 en un 3/4) — es decir, "acento en el primer
tiempo de cada compás", el comportamiento más intuitivo y el más parecido a
cómo se comportaba el metrónomo antes de este cambio — pero el selector deja
elegir cualquier valor 0-9 en cualquier momento, sin ninguna restricción
atada al compás.

**Por qué:** Guardarlo por ejercicio (no global) tiene más sentido que el
volumen (punto 25): la agrupación rítmica que conviene practicar es una
propiedad de qué se está tocando, no una preferencia de escucha general. El
valor por defecto "acento en el primer tiempo real" da continuidad con el
comportamiento previo sin sorprender al usuario la primera vez que abre un
ejercicio, mientras que dejar el selector totalmente libre (0-9, sin
relación con el compás) cumple literalmente el pedido de poder practicar
agrupaciones asimétricas.

## 27. Cuenta de anticipación: 2 compases, en cada play (no solo la primera vez)

**Duda:** El pedido es "2 compases completos de click sonando en vacío antes
de que arranque el ejercicio". No especifica si la cuenta de anticipación
ocurre solo una vez (al principio de toda la práctica) o cada vez que se
presiona play (incluyendo reanudar después de una pausa a mitad de
ejercicio). Tampoco aplica al modo fuelle (temporizador simple, sin pasos ni
metrónomo).

**Decisión:** La cuenta de anticipación se dispara **cada vez que se
presiona ▶** (transición de pausado a reproduciendo), no solo la primera
vez: 2 compases completos de click (usando los tiempos reales del compás
del ejercicio, ver punto 23, y el mismo acento configurado, ver punto 26),
durante los cuales el paso/imagen actual permanece fijo y el contador de
tiempos del paso (`beatsElapsedInPaso`) no se resetea — al terminar la
cuenta, la reproducción continúa exactamente donde estaba. Solo aplica al
reproductor de escala/arpegio (que tiene metrónomo y pasos); el modo fuelle
(temporizador simple sin metrónomo) no tiene cuenta de anticipación.

**Por qué:** Repetir la cuenta en cada reanudación (no solo al principio) es
más útil en la práctica real: si el usuario pausa para corregir algo a
mitad del ejercicio, necesita el mismo "empujón" para volver a entrar en
tempo que al arrancar por primera vez — y es más simple de implementar y
razonar de forma uniforme ("todo play pasa por count-in") que un caso
especial "solo la primera vez desde el índice 0". No resetear el progreso
del paso actual evita que una pausa a mitad de paso lo haga perder ese
avance.

## 28. Edición de ejercicios ya cargados: mismo formulario que el alta, ruta `#/editar/<id>`

**Duda:** Hasta ahora solo se podía crear un ejercicio nuevo; no había forma
de corregir uno ya cargado con nivel/tipo equivocado, ni de editar sus
pasos/imágenes. ¿Se construye una pantalla de edición nueva y separada, o se
reutiliza el formulario de alta?

**Decisión:**
- El mismo módulo `src/screens/newExercise.js` sirve para alta y edición:
  `render(container, { param })` — si `param` (el id de la URL) corresponde
  a un ejercicio existente, el formulario se precarga con sus datos (nombre,
  nivel, tipo, articulación —incluyendo el caso "otra" con texto libre—,
  compás, BPM sugerido, compases/paso, duración, descripción, imagen de
  fuelle y la lista completa de pasos con su imagen actual como vista
  previa) y el botón pasa a decir "Guardar cambios", llamando a
  `store.updateCustomExercise` en vez de `saveCustomExercise`. Nueva ruta
  `#/editar/<id>` en `app.js`, apuntando al mismo módulo que `#/nuevo`.
- Reordenar/agregar/quitar/reemplazar pasos usa exactamente los mismos
  controles que ya existían para el alta (ver punto 22): no hizo falta
  ningún control nuevo, salvo el propio precargado de la lista.
- En la Biblioteca, cada tarjeta deja de ser un único `<button>` (no se
  puede anidar un `<button>` de "editar" dentro de otro `<button>` que abre
  la práctica): pasa a ser un `<div>` contenedor con dos zonas clicables
  independientes — el cuerpo (`data-open`, abre el reproductor, comportamiento
  igual que antes) y un botón `✎` (`data-edit`, con `stopPropagation` para no
  disparar el click del cuerpo) que navega a `#/editar/<id>`.

**Por qué:** Reutilizar el formulario de alta evita duplicar toda la lógica
de pasos/imágenes/articulación especial que ya existía y ya estaba probada,
y mantiene un único lugar para mantener las reglas del formulario a futuro.
Los ids de los pasos existentes se preservan al editar (nunca se regeneran),
así que las imágenes y audios de demostración ya cargados —que se guardan
aparte, indexados por el id del paso, ver puntos 14 y 20— siguen intactos
aunque se reordenen o se edite la etiqueta; solo un paso nuevo agregado
durante la edición recibe un id nuevo.

## 29. El loop que avisa cada tiempo usa `setTimeout`, no `requestAnimationFrame`

**Cómo se encontró:** Probando el reproductor de punta a punta después de
armar el punto 24 (metrónomo como única fuente de verdad vía
`requestAnimationFrame` comparando contra `audioContext.currentTime`), con
la pestaña del navegador en segundo plano (oculta): el metrónomo seguía
sonando con normalidad, pero la barra de progreso y el avance de pasos
quedaban completamente congelados — `onBeat` dejaba de dispararse por
completo mientras la pestaña estuviera oculta, aunque el reloj de audio
seguía avanzando. Al volver a poner la pestaña en primer plano, todos los
tiempos acumulados durante ese lapso se iban a disparar de golpe en una sola
ráfaga (arriesgando saltar varios pasos de una vez, o directamente terminar
el ejercicio de sopetón).

**Causa:** los navegadores basados en Chromium pausan por completo los
callbacks de `requestAnimationFrame` cuando la pestaña no es visible (para
ahorrar batería/CPU) — es un comportamiento intencional de la plataforma,
no un bug de la app, pero reintroduce exactamente el problema que el punto
24 buscaba eliminar (una señal visual que se desincroniza del audio), esta
vez causado por el cambio de visibilidad de la pestaña en vez de por drift
de reloj.

**Decisión:** El loop que revisa la cola de clicks agendados y dispara
`onBeat` (`beatPoll` en `metronome.js`) usa `setTimeout` en vez de
`requestAnimationFrame`. `setTimeout` sigue corriendo en segundo plano
(los navegadores lo regulan/ralentizan, pero no lo pausan del todo como
a `requestAnimationFrame`), así que el avance de pasos se mantiene
razonablemente al día si el usuario cambia de app un momento con el
metrónomo sonando, en vez de congelarse indefinidamente y después saltar de
golpe. El *scheduling* de audio (`scheduler`, con su propio `setTimeout` de
`LOOKAHEAD_MS`) no cambió — ya usaba `setTimeout`, nunca dependió de rAF.

**Por qué:** Es la forma más simple de eliminar la dependencia de una API
que la plataforma pausa deliberadamente en segundo plano, sin perder
precisión perceptible: la barra de progreso son segmentos discretos (no una
animación continua), así que no hace falta la cadencia de 60fps que ofrece
`requestAnimationFrame` — un sondeo cada 20ms (`BEAT_POLL_MS`) es más que
suficiente para que cada segmento se sienta "instantáneo" al oído/ojo, y sigue
funcionando (aunque más lento) si la pestaña se oculta.

---

## Ronda 4 — centrado vertical, normalización de tamaño entre pasos y modo
## de avance manual (pedal/teclado/toque)

Las decisiones 30 a 32 corresponden a una cuarta tanda de cambios, trabajados
de forma autónoma sobre el prototipo descripto arriba.

## 30. Centrado vertical de la partitura en horizontal: el marco pasa a ocupar toda la altura disponible

**Duda:** En Práctica en horizontal, el marco de la partitura (`.score-frame`)
solo se estiraba hasta el alto de la imagen (con un tope de `max-height`),
así que cuando la imagen era más baja que el alto disponible de la columna
quedaba pegada arriba, con espacio vacío abajo — pese a que `.score-frame`
ya tenía `align-items/justify-content: center` en su CSS. ¿El problema era el
centrado en sí, o que no había "espacio" real dentro del cual centrar?

**Decisión:** Era lo segundo. En la media query de horizontal
(`@media (orientation: landscape)`, ver punto 17), `.score-frame-wrap` pasa a
tener una altura explícita (`height: calc(100vh - 20px - env(safe-area-inset-bottom))`,
la misma cuenta que ya se usaba como `max-height`) y `.score-frame` pasa a
`height: 100%` para llenar ese espacio. Como `.score-frame` ya centraba su
contenido con flexbox, alcanzó con darle un contenedor realmente alto para
que el centrado (que ya estaba bien escrito) tuviera efecto.

**Por qué:** Es el cambio mínimo: no hacía falta reescribir el centrado, solo
corregir que el elemento en el que se centra tuviera la altura real
disponible. Se scopeó a la media query de horizontal (no se tocó el modo
retrato ni pantalla completa) porque ahí es donde el pedido señala el
problema; en retrato el marco ya se ve bien tal como estaba.

## 31. Normalización automática de tamaño visual entre pasos: bounding box vertical de "tinta" + escala CSS

> **Actualización (ver punto 33):** este diseño (objetivo de fracción fijo
> `0.62`, solo eje vertical, `computeContentScale`) causó una regresión —
> terminaba achicando la imagen en vez de maximizarla — y se reemplazó por
> completo por `computeContentTransform` (bounding box en ambos ejes, medido
> contra el tamaño real ya renderizado del marco, con un piso que nunca
> achica). Se deja este punto sin borrar porque documenta la duda original y
> por qué el primer enfoque no funcionó; el punto 33 tiene el diseño vigente.

**Duda:** Las fotos/capturas que sube el usuario tienen proporciones y
márgenes blancos distintos entre sí, así que mostrarlas ajustadas solo al
marco (`object-fit: contain`) hace que el pentagrama se vea más chico o más
grande según cuánto margen tenga cada imagen puntual — se pidió compensar
esto sin pedirle al usuario que recorte a mano, con la estrategia más simple
y robusta posible sin librerías externas.

**Decisión:**
- `computeContentScale(imgEl)` (nuevo, en `util.js`) dibuja la imagen ya
  cargada en un canvas chico (140px de alto, ancho proporcional — barato de
  escanear sea cual sea la resolución original), y recorre sus filas de
  arriba a abajo y de abajo a arriba para encontrar la primera/última fila
  con al menos un píxel de "tinta" (luminancia por debajo de un umbral fijo,
  ignorando píxeles transparentes). Esa franja es el *bounding box vertical*
  del contenido no blanco de la imagen.
- Se calcula `contentFraction = altoDelBoundingBox / altoDeLaMuestra` (qué
  fracción de la imagen es realmente "contenido"), y la escala a aplicar es
  `objetivo (0.62) / contentFraction`, acotada entre 0.55 y 2 (topes
  defensivos para que una detección rara —imagen casi en blanco, ruido de
  foto— no dispare una escala absurda).
- Esa escala se aplica como transform CSS multiplicándose con el zoom manual
  existente (ver el cambio en `zoom.js`, `baseScale * scale` en `apply()`):
  `attachPinchZoom(...).reset(baseScale)` ahora acepta la escala de
  normalización como parámetro, así el pellizco/doble-tap del usuario sigue
  funcionando igual, como un multiplicador adicional sobre esa base. El
  cálculo se dispara en `paintTonalidad()` (`player.js`) apenas la imagen
  termina de cargar, con un contador de generación para descartar el
  resultado si el usuario ya cambió de paso antes de que termine.
- Solo se aplica a imágenes reales cargadas por el usuario; los placeholders
  SVG (`scorePlaceholderSVG`) no se normalizan porque ya se generan con
  proporciones consistentes entre sí (ver punto 13).
- No se persiste el resultado: se recalcula cada vez que se pinta el paso.
  El análisis (dibujar en un canvas de 140px de alto y escanear sus filas)
  es barato — del orden de milisegundos — así que no hace falta cachearlo,
  y evita sumar un esquema de almacenamiento nuevo solo para esto.

**Limitaciones (documentadas a propósito, ver pedido):**
- Solo se mide el bounding box **vertical** (alto), no el horizontal. Es
  intencional: la escala se aplica pareja en ambos ejes (estirar solo
  un eje distorsionaría el pentagrama), así que hace falta un solo número, y
  el alto es la referencia más estable para una partitura, que siempre se
  lee apaisada — pero significa que si una imagen tiene mucho margen a los
  costados pero no arriba/abajo (o viceversa), esa asimetría no se corrige.
- El umbral de "tinta" es una luminancia fija (200/255). Funciona bien con
  fotos de partituras sobre fondo blanco/crema con buena luz, pero una foto
  con sombras duras, fondo muy oscuro, o una captura de PDF con antialiasing
  agresivo puede sobre o sub-detectar el contenido, y por lo tanto sobre o
  sub-escalar esa imagen puntual.
- Es una heurística de "cuánto ocupa la tinta", no reconocimiento real del
  pentagrama — no distingue notación musical de una mancha, un sello, o
  texto al margen de la página; si una imagen tiene contenido no-musical
  fuera del pentagrama (ej. un pie de página con texto), ese contenido
  también cuenta para el bounding box y puede sesgar la escala.
- Los topes (0.55-2×) evitan casos extremos pero, dentro de ese rango, dos
  imágenes con contenido genuinamente distinto (ej. una escala de una sola
  línea vs. un acorde con muchas notas apiladas) van a normalizarse al mismo
  tamaño de "tinta total" aunque musicalmente no sean "equivalentes" — la
  normalización compensa el recorte/margen de la *foto*, no iguala la
  densidad de información musical.

**Por qué esta estrategia y no otra:** Es la más simple de las dos sugeridas
en el pedido (bounding box de contenido) y no requiere que las imágenes se
suban con ninguna convención previa. Se descartó normalizar por el tamaño
total de archivo/resolución de la imagen (no tiene relación directa con
cuánto margen blanco tiene) y normalizar recortando la imagen de verdad
(reemplazar el `src` por una versión croppeada) porque es más invasivo,
pierde el original, y complica el zoom/paneo existente (que ya opera con
`transform`, así que reusar ese mismo mecanismo para la escala automática
es la integración más chica).

## 32. Modo de avance manual (pedal / teclado / toque): toggle por ejercicio, gatea metrónomo y atajos

**Duda:** El pedido es un modo alternativo al automático donde el usuario
controla el avance con teclas (que son las que emulan los pedales Bluetooth
de pasar página) o tocando la partitura, sin que el metrónomo suene ni la
barra de progreso corra sola. Varias decisiones de diseño quedaban abiertas:
¿el modo se guarda por ejercicio o es una preferencia global? ¿qué pasa con
los controles que ya existían (BPM, compases, acento, volumen del
metrónomo, cuenta de anticipación) en modo manual? ¿cómo conviven "tocar la
partitura para avanzar" con el gesto de doble-tap-para-zoom que ya existía
(ver punto 18)? ¿los atajos de teclado deben estar activos siempre o solo en
este modo?

**Decisión:**
- **Por ejercicio, no global:** el modo (`'auto'` | `'manual'`) se guarda en
  el mismo objeto de `playerSettings` que ya persiste BPM/compases/acento
  (`fuelle:playerSettings:v2:<id>`), no en el ajuste global de audio (ver
  punto 25). Tiene sentido distinto: hay ejercicios que se van a practicar
  siempre con metrónomo (técnica) y otros como lectura a primera vista con
  el pedal (sin tiempo fijo) — es una propiedad de cómo se practica *ese*
  ejercicio, no una preferencia general de la app.
- **Un selector de 2 chips** ("🎵 Automático" / "🦶 Manual (pedal / teclado /
  toque)") arriba de todo en el panel del reproductor. Cambiar de modo
  corta cualquier reproducción/cuenta de anticipación en curso
  (`stopAll()`) antes de aplicar el cambio, para no dejar el metrónomo
  sonando "de fondo" en un modo que no debería tenerlo.
- **En modo manual se ocultan** (no se deshabilitan: se sacan de la vista
  para no confundir) los bloques que solo tienen sentido con tiempo real:
  la barra de progreso segmentada + su etiqueta de cuenta de anticipación,
  el bloque BPM/compases/acento, el volumen del metrónomo, y el botón de
  play/pausa (no hay "reproducir" en un modo sin tiempo: el avance es
  siempre una acción explícita). Quedan visibles los puntitos de progreso
  por paso (posición dentro de la secuencia, no depende del tiempo), el
  volumen del audio de demostración y el resto de controles (zoom, pantalla
  completa, cargar foto, terminar), que siguen siendo relevantes.
- **El metrónomo nunca se arranca en modo manual**: `togglePlay()` (que ya
  queda inalcanzable porque el botón está oculto) tiene además una guarda
  explícita `if (mode !== 'auto') return;` por si algo más lo llamara.
- **Atajos de teclado activos solo en modo manual** (`window.addEventListener('keydown', ...)`,
  agregado/quitado junto con el resto del ciclo de vida de la pantalla):
  flecha derecha, flecha abajo, `Espacio`, `Av Pág` para avanzar; flecha
  izquierda, flecha arriba, `Re Pág` para retroceder — exactamente las
  teclas que un pedal Bluetooth de "pasar página" emula, así que no hace
  falta ningún soporte de hardware especial. Cada tecla manejada llama a
  `e.preventDefault()`, tanto para que no se dispare el scroll nativo de la
  página (relevante para Espacio/Av Pág/Re Pág) como para que no se
  duplique el avance si el foco del teclado está sobre un botón enfocable
  (`preventDefault` en `keydown` evita también el click sintético que el
  navegador dispara sobre un botón enfocado al soltar Espacio/Enter).
  En modo automático estas teclas no hacen nada (se decidió que el modo
  manual sea el único que las escucha, ya que en modo automático ya existe
  el botón de play/pausa y no tiene sentido que además el teclado adelante
  pasos fuera de tiempo).
- **Tocar la partitura también avanza, solo en modo manual**: se extendió
  `attachPinchZoom` (`zoom.js`) con un callback `onSingleTap`, que se
  dispara únicamente cuando un tap NO se convierte en un doble-tap dentro de
  la misma ventana de tiempo que ya se usaba para detectar el doble-tap
  (320ms) — así un doble-tap sigue haciendo zoom como antes, y no dispara
  además un avance de paso. La contrapartida es una demora perceptible
  (hasta 320ms) entre tocar y que se note el avance, inherente a tener que
  esperar para descartar que sea el primer tap de un doble-tap; se aceptó
  como razonable porque el pedal/teclado (sin esa demora) es el mecanismo
  principal pedido, y el tap es "una alternativa si no se tiene el pedal a
  mano".

**Bug encontrado y corregido de paso:** al implementar `playBtn.hidden = true`
para ocultar el botón de play en modo manual, se encontró que el atributo
`hidden` no tenía ningún efecto en elementos con clase `.icon-btn` (que fija
`display: inline-flex`) — el navegador implementa `hidden` con una regla
`[hidden] { display: none }` en su propia hoja de estilos, y cualquier regla
de **autor** que fije `display` en ese mismo elemento la pisa (el origen de
la regla pesa más que la especificidad). Esto no era un problema nuevo: el
mismo bug ya afectaba a `#backBtn` (también `.icon-btn`), que en los hechos
quedaba siempre visible en todas las pantallas con tabs (Hoy, Biblioteca,
Nuevo, Perfil) pese a que `app.js` le pone `hidden` explícitamente ahí. Se
agregó `[hidden] { display: none !important; }` como regla global en
`styles.css` (cerca del reset, al principio del archivo) para que el
atributo `hidden` funcione siempre, sin importar qué otra clase tenga el
elemento — se verificó que corrige tanto el botón de play como el back
button preexistente.

**Por qué:** Guardar el modo por ejercicio (no global) y ocultar en vez de
deshabilitar los controles automáticos evita una pantalla con controles
visibles pero sin efecto (confuso); gatear los atajos de teclado detrás del
modo manual evita que el pedal/teclado interfiera con el uso normal en modo
automático; reusar la ventana de doble-tap ya existente para desambiguar el
tap-para-avanzar es la integración más simple con el gesto de zoom que ya
estaba armado, sin necesitar un segundo mecanismo de detección de gestos
paralelo.

---

## Ronda 5 — corrección urgente: la partitura quedaba chica con mucho margen

El punto 33 corresponde a una corrección de regresión, trabajada de forma
autónoma sobre un problema visual reportado como urgente después de la ronda 4.

## 33. La normalización de tamaño (punto 31) achicaba la imagen en vez de maximizarla: rediseño completo

**Síntoma reportado:** después de implementar el centrado vertical (punto 30)
y la normalización de tamaño entre pasos (punto 31), la partitura se veía
chica dentro de su marco, con mucho margen beige alrededor — tanto en la
vista normal como en pantalla completa. Se pidió que la imagen ocupe el
máximo espacio posible sin deformarse (aspecto original respetado), con el
menor margen posible, manteniendo el centrado (punto 30) y la ausencia de
saltos de escala entre pasos (punto 31).

**Causa raíz:** el diseño original del punto 31 escalaba el contenido
detectado hacia una fracción de alto **fija y arbitraria** (`0.62`, o "62%
del alto de la imagen"). Como en la práctica la mayoría de las imágenes ya
ocupan bastante más del 62% de su propio alto con `object-fit: contain`
(que ya maximiza la imagen completa, márgenes incluidos, dentro del marco),
aplicar ese objetivo fijo terminaba **achicando** la imagen en la mayoría de
los casos reales en vez de agrandarla — el bug no estaba en el centrado
(punto 30, que sí funciona) sino en el número objetivo elegido para la
escala del punto 31, que nunca se validó contra el tamaño que la imagen ya
tenía antes de normalizar.

**Decisión — rediseño del cálculo (no un ajuste del número):**
- `computeContentScale(imgEl)` (que devolvía un único factor de escala) se
  reemplaza por `computeContentTransform(imgEl, frameEl)` (en `util.js`),
  que devuelve `{ scale, x, y }` — escala y traslación de recentrado.
- En vez de un objetivo de fracción fijo, ahora se mide el **bounding box en
  ambos ejes** (alto y ancho, no solo alto) del contenido no-blanco, y se
  compara contra el tamaño **ya renderizado** de la imagen y del marco
  (`getBoundingClientRect()`, después de que `object-fit: contain` ya hizo
  su trabajo) para calcular la escala **mínima necesaria** para que ese
  bounding box toque los bordes del marco en el eje que lo permita, sin
  deformar el otro eje: `scale = min(anchoMarco/anchoContenidoRenderizado,
  altoMarco/altoContenidoRenderizado) × 0.96` (ese 4% es aire para que el
  contenido no quede pegado al borde). Por construcción matemática, esta
  escala **nunca es menor a 1**: en el peor caso (imagen sin margen,
  contenido de borde a borde) da ~1 (no toca nada); con cualquier margen,
  siempre da más de 1 (agranda). Se fijó `NORMALIZE_MIN_SCALE = 1` como piso
  explícito, así que estructuralmente es imposible que esta versión repita
  la regresión (achicar por debajo de lo que ya se veía).
- Se agrega recentrado: si el contenido no está centrado dentro de la
  imagen original, se calcula además una traslación (`x`, `y`) para que
  quede centrado en el marco — sin esto, maximizar la escala sin recentrar
  dejaría el contenido descentrado (y probablemente cortado por el
  `overflow: hidden` del marco) en imágenes con margen asimétrico.
- El tope defensivo ante detecciones degeneradas cambia de estrategia: en
  vez de limitar la escala de SALIDA (lo que en la práctica dejaba
  imágenes con margen grande pero legítimo sub-maximizadas, un bug que se
  encontró al probar con una imagen sintética de margen ~50%: el tope
  anterior de 3.5× cortaba la escala antes de que el contenido llegara a
  tocar los bordes del marco), ahora se valida la detección de ENTRADA: si
  el bounding box detectado es menor al 2% del ancho o alto de la imagen
  (`NORMALIZE_MIN_CONTENT_FRACTION`), se lo trata como ruido/detección no
  confiable y no se aplica ninguna transformación, en vez de confiar en un
  bounding box sospechosamente chico. El tope de escala de salida
  (`NORMALIZE_MAX_SCALE`) queda en 6× solo como respaldo final ante casos
  verdaderamente extremos, no como límite que se espere alcanzar en uso
  normal.
- `zoom.js` (`attachPinchZoom`) se adapta: `reset()` pasa de aceptar un
  número (`baseScale`) a aceptar `{ scale, x, y }` — la traslación base de
  recentrado (`baseX`/`baseY`) se suma a la traslación manual del usuario
  (paneo), y la escala base se sigue multiplicando con el zoom manual
  (pellizco/doble-tap), igual que antes.
- **Bug encontrado al probar el recálculo en pantalla completa/resize:** el
  marco cambia de tamaño real al entrar/salir de pantalla completa (ver
  punto 30) o al redimensionar la ventana, así que hace falta recalcular la
  transformación con el nuevo tamaño — se agregaron listeners de
  `fullscreenchange` y `resize` (con debounce) que llaman a una función
  compartida `applyAutoTransform()`. La primera versión de esa función medía
  el tamaño del `<img>` **sin neutralizar antes la transformación anterior**
  — como `getBoundingClientRect()` siempre refleja el tamaño ya
  transformado (con cualquier `scale`/`translate` CSS ya aplicado), cada
  recálculo sucesivo partía de una medición corrupta (la imagen ya agrandada
  de la vez anterior, no su tamaño neutro con `object-fit: contain`),
  arruinando el resultado. Se corrigió llamando `zoomCtl.reset()` (transform
  neutro) inmediatamente antes de medir, igual que ya se hacía en
  `paintTonalidad()` al pintar un paso por primera vez — se verificó que el
  recálculo ahora es idempotente (repetirlo varias veces seguidas da
  siempre el mismo resultado correcto, no se degrada).

**Verificación en navegador (no solo en el código):** se probó con tres
imágenes sintéticas de proporciones muy distintas (panorámica muy ancha con
margen arriba/abajo, cuadrada con margen parejo en los 4 lados, alta y
angosta con contenido descentrado hacia una esquina) en la vista normal del
reproductor, confirmando en cada caso — midiendo la geometría real
(`getBoundingClientRect`) contra el bounding box conocido de cada imagen de
prueba, no solo mirando capturas — que el contenido queda centrado (offset
del centro del bounding box respecto al centro del marco, sub-5px sobre
marcos de >1000px) y maximizado (toca ~96% del marco en el eje que lo
permite, nunca menos que el tamaño que ya daba `object-fit: contain`). No se
pudo probar `requestFullscreen()` end-to-end en este entorno de
automatización (la Fullscreen API rechaza la activación incluso con un click
real disparado por la herramienta de automatización — limitación del
entorno, no de la app), así que ese camino se verificó disparando
`fullscreenchange` manualmente y confirmando que el recálculo corre sin
errores y da un resultado idempotente.

**Por qué este rediseño y no un ajuste del número 0.62:** subir el número
objetivo (por ejemplo a 0.9) hubiera sido un parche que seguía sin resolver
el problema de fondo — seguía siendo un objetivo arbitrario, sin relación
con el tamaño real disponible en el marco, y seguía sin considerar el eje
horizontal. Medir el tamaño real ya renderizado (`getBoundingClientRect`) en
vez de asumir un objetivo fijo hace que el resultado sea *correcto por
construcción* (la escala mínima necesaria para maximizar sin deformar, con
un piso matemático que nunca achica) en vez de *correcto por casualidad*
para el rango de imágenes con el que se haya ajustado el número a mano.

---

## Ronda 6 — compases por paso, sin scroll vertical en horizontal, pasos
## tocables y toque bidireccional

Las decisiones 34 a 36 corresponden a una sexta tanda de cambios, pedidos
sobre el prototipo ya andando (rondas 1 a 5 arriba) y trabajados de forma
autónoma, sin pausar a preguntar. Los cuatro cambios pedidos fueron: (1)
que la pantalla de Práctica en horizontal entre sin scroll vertical, (2)
que los compases sean un campo propio de cada paso (no un control global),
(3) que los indicadores de paso sean cuadraditos tocables que saltan
directo y resincronizan el conteo, y (4) que el toque sobre la partitura en
modo manual sea bidireccional (mitad derecha avanza, mitad izquierda
retrocede). Se verificó todo en el navegador real (no solo revisando
código), con ejercicios de distinto compás (2/4, 3/4, 4/4) y distinta
cantidad de pasos (2, 5 y 24).

## 34. Compases por paso: campo propio de cada paso, ya no un control global

**Duda:** El control único "Compases / paso" (un stepper +/- en el
reproductor) aplicaba el mismo valor a todos los pasos de un ejercicio, pero
distintos pasos (distintas tonalidades, o "abriendo" vs. "cerrando" dentro
de la misma tonalidad) pueden tener una cantidad real de compases distinta
entre sí. Dos sub-dudas: (a) ¿cómo mantener compatibles los ejercicios/pasos
ya cargados que no tienen este campo? (b) ¿qué rango admitir en el
mini-stepper de cada fila, dado que el control global anterior topeaba en 8?

**Decisión:**
- Nuevo campo `compases` en cada paso (`pasos[]`), con su propio mini-stepper
  en la fila del formulario de alta/edición (`#/nuevo` y `#/editar/<id>`),
  con rango 1-16 (se amplió el tope de 8 que tenía el control global: ahora
  es plausible que UN paso puntual necesite más compases que el promedio que
  tenía sentido como valor único para todo el ejercicio, ej. una sección
  "cerrando" más larga que el resto).
- Nueva función `pasoCompases(paso, exercise)` en `data.js`: usa
  `paso.compases` si existe y es válido; si no, cae al viejo campo global del
  ejercicio (`exercise.compasesPorPaso`, que se sigue guardando); si tampoco,
  cae a 2 — el mismo valor por defecto que ya se usaba. Mismo criterio de
  fallback aditivo que ya se usó para el compás real del ejercicio (ver punto
  23): ejercicios/pasos cargados antes de este cambio no necesitan migración
  ni bump de clave de `localStorage`, y calculan exactamente igual que antes.
  `computeGroupDurationMin` (usado para estimar la duración en "Hoy") ahora
  suma la duración de cada paso con su propio `pasoCompases()` en vez de
  multiplicar "cantidad de pasos × un único valor".
- El control global de "Compases por paso" en el formulario de alta **no se
  eliminó**: se resignificó como "Compases por defecto para pasos nuevos" —
  el valor que usan el botón `+ Agregar paso` y `✨ Generar 24 pasos` al crear
  filas nuevas, pero cada fila queda después editable de forma
  independiente. Se decidió mantenerlo (en vez de sacarlo) porque agiliza
  cargar ejercicios donde la mayoría de los pasos comparten la misma
  cantidad de compases (el caso más común) sin tener que tocar fila por
  fila — solo hace falta editar a mano las excepciones.
- En el **Reproductor** se eliminó por completo el control de "Compases /
  paso": ahora `beatsPerPaso()` lee `pasoCompases(pasos[index], exercise)` en
  cada llamada, así que la duración real de cada paso (y la cantidad de
  segmentos de la barra de progreso) cambia sola al cambiar de paso, sin
  ningún control aparte que mantener sincronizado.

**Por qué:** Es la lectura literal del pedido (compases real por paso, no
global) con el menor código nuevo posible, reutilizando el patrón de
fallback ya probado en el punto 23, y sin obligar a re-tipear el mismo
número en cada fila cuando la mayoría de los pasos de un ejercicio real
comparten la misma cantidad de compases.

**Verificación en navegador:** se cargó (vía datos de prueba) un ejercicio
de 5 pasos en compás 3/4 con compases 3/6/2/8/4 — la barra de progreso
mostró 9/18/6/24/12 segmentos respectivamente (compases × 3 tiempos), y un
ejercicio en 4/4 con un paso "legacy" sin campo `compases` propio (debía
caer al `compasesPorPaso` guardado en el ejercicio, 3): mostró 12 segmentos
(3 × 4), confirmando el fallback. También se verificó de punta a punta en
"Nuevo ejercicio"/"Editar ejercicio": el mini-stepper de cada fila carga el
valor correcto al editar un ejercicio existente, un paso nuevo toma el
"default para pasos nuevos" vigente en ese momento (sin afectar los ya
cargados), "Generar 24 pasos" aplica ese mismo default a los 24, y el valor
de cada fila persiste correctamente al guardar.

## 35. Sin scroll vertical en Práctica horizontal + cuadraditos de paso tocables con resincronización

**Duda 1 (tamaños):** ¿alcanza con `clamp()`/`vh` para garantizar que TODO
entre sin scroll en cualquier alto de pantalla, incluso con muchos pasos
(ej. las 24 de "Arpegios menores")?

**Decisión:** se combinaron tres mecanismos: (a) `clamp()` atado a `vh` en
paddings/fuentes/alturas de casi todos los controles del panel derecho, para
que se achiquen solos en pantallas bajas; (b) agrupar acento + volumen
(metrónomo y demo) — los controles que el pedido marca como "menos usados"
— en un panel colapsable (botón `⚙ Acento y volumen`) que arranca **cerrado**
en horizontal (detectado con `matchMedia('(orientation: landscape)')` al
montar la pantalla) y **abierto** en vertical (donde esta pantalla ya
permitía scroll normal antes de este cambio, así no se oculta nada por
defecto ahí); (c) modo de avance, progreso/cuenta de entrada, nombre del
paso, cuadraditos, transport (⏮/▶/⏭), BPM, audio por velocidad, cargar foto
y terminar quedan siempre visibles, sin agrupar.

**Bug preexistente encontrado y corregido de paso:** verificando lo anterior
en el navegador (no solo leyendo el código) apareció scroll vertical de
**toda la pantalla** pese al panel colapsado. La causa: la fórmula de alto
que usaban `.score-frame-wrap`/`.player-side` desde la ronda 4 (punto 30,
`calc(100vh - 20px - safe-area)`) nunca descontaba el alto real de
`.topbar` ni de `.tabbar` — que siguen visibles en Práctica (`app.js` nunca
las oculta, solo deja de marcar un tab como activo). Con esos ~110-130px sin
descontar, el marco y el panel se forzaban a una altura mayor que el
espacio real de `.screen` (que ya tenía `overflow-y: auto` de base), y el
navegador mostraba scroll de página completa para llegar a ese exceso —
exactamente lo que este punto pide evitar. Este bug ya existía desde la
ronda 4 y no se había detectado antes porque, según deja documentado el
punto 33, no se había podido probar el layout de Práctica end-to-end contra
un navegador real en este mismo entorno de automatización.

**Corrección:** se reemplazó el cálculo en `vh` por `height: 100%`
encadenado desde `.screen` (que sí tiene una altura real y definida, vía
`flex: 1` dentro de `.app-shell`) hasta `.player-wrap` → `.score-frame-wrap`
/`.player-side`, y `.screen` pasa a `overflow: hidden` en esta pantalla (en
vez del `overflow-y: auto` general de las demás) — así el único scroll
posible queda contenido dentro de `.player-side` (ver el punto siguiente),
nunca en la página entera. Al encadenar `height: 100%` también apareció un
problema de grid: `align-items: start` (heredado de la ronda 4) hace que
cada celda mida solo su contenido, así que un `height: 100%` en el hijo no
tenía ninguna fila con tamaño definido contra la cual resolverse. Se cambió
a `align-items: stretch` + una fila explícita `grid-template-rows: minmax(0,
1fr)` + `min-height: 0` en los hijos (los ítems de grid tienen `min-height:
auto` por defecto, que impide encogerse por debajo del contenido) — con esto
la fila sí tiene una altura definida y las celdas la llenan solas, sin
necesitar `height: 100%` explícito en cada una.

**Duda 2 (qué hacer si ni así entra):** el pedido prevé explícitamente que en
pantallas muy chicas puede ser imposible que todo entre, y pide priorizar
partitura+transport siempre visibles con acento/volumen colapsable como
salida — pero un panel que el usuario puede EXPANDIR a mano rompe la
garantía de "sin scroll" si, expandido, tampoco entra.

**Decisión:** la garantía de "sin scroll" se interpretó como aplicable al
estado **por defecto** (panel colapsado) — ahí se verificó que nunca hace
falta scroll, ni con 5 pasos ni con 24. Si el usuario expande el panel a
propósito en una pantalla muy baja y el contenido no entra, es
`.player-side` (no `.screen` ni la página) quien absorbe ese excedente con
su propio `overflow-y: auto` — un scroll **contenido** solo dentro del panel
lateral, nunca sobre la partitura ni sobre toda la pantalla. Verificado en
el navegador expandiendo el panel con 24 pasos cargados: apareció un scroll
interno acotado a `.player-side` (165px de excedente) mientras `.screen`
seguía en 0.

**Cuadraditos de paso tocables + resincronización:** se reemplazaron los
puntitos decorativos (`<span class="dot">`) por `<button class="step-square">`
numerados, con un único listener delegado en el contenedor
(`dots.addEventListener('click', ...)`) que llama a `goTo(i)` — la misma
función que ya usaban ⏮/⏭ — con el índice del cuadradito tocado. Como
`goTo()` → `paintTonalidad()` ya reseteaba `beatsElapsedInPaso` a 0 en cada
cambio de paso (mecanismo de la ronda 3, punto 24), reusar la función
alcanza para que el salto quede resincronizado: el conteo de tiempos del
paso siempre arranca en 0 en el paso destino, sea cual sea el paso de
origen, y sin importar si el metrónomo estaba sonando en ese momento (el
salto no lo detiene: si estaba en fase "playing", el siguiente click ya
cuenta para el paso nuevo). Verificado saltando a mitad de una reproducción
activa (de un paso de 6 compases a uno de 8): el total de segmentos de la
barra cambió al instante al del paso destino y el conteo arrancó de 0, sin
continuar la cuenta del paso anterior.

**Por qué:** la fórmula del punto 30 nunca se había probado contra el alto
real de topbar/tabbar en un navegador de verdad — corregirla de raíz (altura
real encadenada, no una constante en `vh`) es la única forma de que la
garantía de "sin scroll" sea válida en la práctica, no solo en el caso
particular con el que se había ajustado el número original. Reusar `goTo()`
para los cuadraditos evita un segundo mecanismo de sincronización paralelo
al que ya existía y estaba probado.

## 36. Toque bidireccional en modo manual: mitad derecha avanza, mitad izquierda retrocede

**Duda:** `attachPinchZoom` (`zoom.js`) ya distinguía tap simple de
doble-tap por tiempo (ver punto 32), pero no exponía la posición del toque —
hacía falta sumar ese dato sin romper la firma que ya usaba `player.js`
(`onSingleTap()` sin argumentos) ni el mecanismo de doble-tap-para-zoom ya
existente y probado (punto 18).

**Decisión:** `onSingleTap` ahora recibe `{ x, y }` — las coordenadas de
viewport del `pointerup` que terminó siendo un tap simple, capturadas ANTES
de borrar ese puntero del registro interno de `zoom.js`. En `player.js`, el
callback compara esa `x` contra el punto medio del `getBoundingClientRect()`
del marco de partitura (`scoreFrame`) para decidir si el toque cayó en la
mitad derecha (avanza, `goTo(index + 1)`) o izquierda (retrocede,
`goTo(index - 1)`) — no se dibujó ninguna línea divisoria visual en el
marco: se consideró innecesaria (el pedal/teclado sigue siendo el mecanismo
principal pedido, y una raya en el medio de la partitura estorbaría la
lectura de la música) y, de hacer falta, se puede agregar después sin tocar
la lógica.

**Por qué:** mantiene la ventana de 320ms de desambiguación con doble-tap ya
existente, agregando solo el dato de posición que faltaba, en vez de
duplicar el detector de gestos con uno paralelo.

**Verificación en navegador:** se tocó repetidamente la mitad derecha
(avanza un paso por toque) y la mitad izquierda (retrocede un paso por
toque) de la partitura en modo manual, confirmando en cada caso el nombre
del paso mostrado; se confirmó además que el doble-tap en el centro de la
partitura sigue haciendo zoom (`transform: scale(2.5)`) sin disparar además
un cambio de paso de más — los dos gestos conviven sin conflicto.

---

## Ronda 7 — respaldo/restauración manual de todo el contenido (urgente)

La decisión 37 corresponde a una séptima tanda de cambios, pedida como
**urgente** después de perderse contenido real cargado (sin poder
recuperarlo, por vivir únicamente en `localStorage` — ver README) y
trabajada de forma autónoma. El pedido: exportar todo a un archivo,
importarlo de vuelta, y un recordatorio no invasivo para hacerlo seguido.

## 37. Exportar/importar un respaldo completo de `localStorage` + recordatorio

**Duda 1 (qué exporta exactamente):** la app guarda contenido en bastantes
claves de `localStorage` distintas (`KEYS` en `store.js`, pero también
`fuelle:playerSettings:v2:<id>` por ejercicio desde `player.js` y
`fuelle:timeBudget` desde `today.js`, ambas fuera de `store.js`). ¿El
exportador tiene que conocer y listar cada clave a mano (arriesgando
quedar desactualizado la próxima vez que se agregue una), o hay una forma
más robusta?

**Decisión:** `buildBackup()` (nuevo, en `store.js`) recorre **todas** las
claves de `localStorage` que empiecen con el prefijo `fuelle:` (ya usado en
toda la app) y las guarda tal cual — como texto crudo, sin volver a
parsear/reserializar el JSON interno de cada una — en un objeto
`{ app: 'fuelle', backupFormatVersion: 1, exportedAt, data: { <clave>: <valor crudo> } }`.
`restoreBackup(parsed)` hace lo inverso: borra todas las claves `fuelle:`
actuales y vuelve a escribir cada `[clave, valor]` de `data` (filtrando que
la clave empiece con `fuelle:` y el valor sea texto, por si el archivo fue
editado a mano o viene de otra versión). Guardar el valor crudo (no
re-tipado) es lo que hace que el respaldo cubra automáticamente CUALQUIER
clave nueva que se agregue en el futuro en cualquier archivo, sin tener que
acordarse de actualizar el exportador — mismo criterio que ya usa el resto
de la app para las claves con prefijo `fuelle:`.

**Duda 2 (reemplazar o fusionar al importar):** el pedido explícitamente
dejaba la decisión abierta, pero advertía que fusionar puede generar
duplicados.

**Decisión:** **reemplazar todo**, nunca fusionar, con una confirmación
explícita previa que dice textualmente qué se va a perder ("Esto va a
REEMPLAZAR todo el contenido actual — ejercicios, imágenes, audios,
progreso y nivel — por el del archivo elegido. No se puede deshacer.").

**Por qué:** fusionar objeto por objeto (por ejemplo, "agregar los
ejercicios del archivo que no estén ya por id") es engañoso en este caso
concreto: dos ejercicios con el MISMO id pero contenido distinto (ej. el
mismo id, pero uno con 5 pasos y otro con 8, de dos momentos distintos)
necesitarían una regla de qué gana, y el progreso/repetición espaciada
(`fuelle:progress`) fusionado a medias puede quedar en un estado
inconsistente (ej. un `dueAt` de una versión con un `intervalDays` de la
otra). Reemplazar todo es la única operación que da un resultado 100%
predecible: después de importar, el estado es EXACTAMENTE el que tenía el
dispositivo en el momento de exportar ese archivo — ideal para el caso de
uso real ("se perdió todo, quiero volver al último respaldo"), que es
justamente el que motivó este pedido urgente.

**Duda 3 (confirmación nativa o propia):** ¿usar `window.confirm()` del
navegador (una línea) o construir un diálogo propio?

**Decisión:** diálogo propio (`confirmDialog()`, nuevo en `ui.js`), un
overlay + hoja inferior con el mismo lenguaje visual que ya usaba la hoja
de calificación del reproductor (`.rating-overlay`/`.rating-sheet`,
reutilizadas), devuelto como una `Promise<boolean>`.

**Por qué:** `window.confirm()` no se puede estilar (aparece con el chrome
nativo del navegador, gris/blanco) y desentonaría fuerte con el tema oscuro
de toda la app — que además no usa NINGÚN diálogo nativo en ningún otro
lado. Como esta es la primera acción realmente destructiva e irreversible
de la app, vale la pena el diálogo propio (reutilizable después para
cualquier otra confirmación que haga falta, en vez de ser un caso especial).

**Bug encontrado y corregido al probar en el navegador:** la primera
versión validaba la forma del archivo (`{ app: 'fuelle', data: {...} }`)
recién DENTRO de `restoreBackup()`, después de que el usuario ya había
confirmado "reemplazar todo" — probando con un JSON válido pero que no era
un respaldo de la app (ej. `{"foo":"bar"}`), el diálogo de "¿reemplazar
todo?" se mostraba igual, y el error de formato aparecía recién después de
confirmar (sin llegar a tocar `localStorage`, así que no había pérdida de
datos, pero la secuencia confundía: pedía una confirmación grave para algo
condenado a fallar de entrada). Se corrigió agregando `store.isValidBackup()`
— la misma validación de forma que ya usaba `restoreBackup()`, extraída a
una función compartida (`backupEntries()` interna) — como chequeo previo en
`profile.js`: si el archivo no tiene la forma esperada, se avisa con un
toast y no se llega a mostrar el diálogo de confirmación.

**Duda 4 (repintar o recargar tras importar):** después de escribir el
nuevo contenido en `localStorage`, ¿alcanza con volver a pintar la pantalla
de Perfil, o hace falta algo más?

**Decisión:** recarga completa de la página (`window.location.reload()`,
con un `setTimeout` breve para que el toast de éxito alcance a verse antes).

**Por qué:** aunque ningún módulo de esta app cachea datos de
`localStorage` en variables de módulo de larga vida (cada pantalla vuelve a
leer `store.getX()` en cada render), una recarga completa es la forma más
simple de tener CERO riesgo de que algo quede con estado viejo en memoria
en cualquier pantalla — más barato de razonar y de mantener correcto a
futuro que auditar cada pantalla para confirmar que ninguna cachea nada.

**Recordatorio de respaldo (no invasivo):** en `profile.js`, `paintBackupStatus()`
muestra una tarjeta (no un modal, no bloquea nada) arriba de los botones de
exportar/importar cuando pasaron más de `BACKUP_REMINDER_DAYS` (**7 días**,
elegido como un intervalo semanal razonable — ni tan corto que sea
molesto, ni tan largo que deje pasar mucho contenido sin respaldar) desde
el último `fuelle:lastBackupAt` (o si esa clave nunca existió). El aviso
**no aparece** si `store.hasBackupableContent()` es falso (ningún ejercicio
propio cargado y ningún progreso registrado): no tiene sentido insistir con
un respaldo a una instalación recién empezada sin nada que perder. El
aviso desaparece solo exportando un respaldo nuevo (que actualiza
`fuelle:lastBackupAt`); no se agregó un botón de "recordarme después" — se
consideró innecesario porque el aviso ya es una tarjeta chica dentro de una
sola pantalla (Perfil, no global en toda la app), no un banner persistente
ni una notificación push.

**Por qué 7 días y no otro número:** es una elección arbitraria razonable
sin un dato real de cuánto contenido carga el usuario por sesión — se dejó
como constante nombrada (`BACKUP_REMINDER_DAYS` en `profile.js`) fácil de
ajustar si en el uso real conviene otro intervalo.

**Detalle menor — nombre del archivo sin hora:** `fuelle-backup-<YYYY-MM-DD>.json`
(reusando `todayISO()`, ya existente) no incluye la hora — si se exporta
dos veces el mismo día, el navegador ya resuelve la colisión de nombre
agregando un sufijo automático (`(1)`, `(2)`...) a la descarga, así que no
hizo falta complicar el nombre con hora/minuto para evitar duplicados.

**Verificación en navegador (export → pérdida simulada → import):** se
cargó contenido de prueba cubriendo TODAS las categorías de dato (un
ejercicio propio con un paso, imagen en base64, audio de demostración en
base64, configuración del reproductor de ese ejercicio, progreso con
calificación "bien", nivel de perfil "avanzado", tiempo elegido en "Hoy").
Se exportó un respaldo real (botón "⬇ Exportar respaldo"): el archivo se
descargó de verdad al disco (`fuelle-backup-2026-09-10.json`, contenido
verificado leyendo el archivo) y `fuelle:lastBackupAt` quedó registrado. Se
simuló la pérdida de datos (`localStorage.clear()` + recarga, el mismo
efecto que reportó el usuario) y se confirmó que el perfil volvía al
default y el progreso a cero. Se restauró el respaldo a través del flujo
real de la UI (seleccionar el archivo en el input, confirmar en el diálogo
"Reemplazar todo") y se verificó, tras la recarga automática: el nivel
"Avanzado" y las estadísticas de progreso de vuelta en Perfil, el ejercicio
visible en Biblioteca con sus badges correctos, y — lo más importante — la
**imagen y el audio del paso restaurados byte a byte** (comparación exacta
de los data URLs base64 contra los originales, y la imagen efectivamente
decodificada y renderizada en el reproductor, `naturalWidth`/`naturalHeight`
correctos). También se probaron los casos límite: un archivo que no es JSON
válido (toast de error, sin llegar a mostrar el diálogo de confirmación) y
un JSON válido pero sin forma de respaldo (mismo resultado, gracias a la
corrección de la duda 3) — en ningún caso se tocó el contenido existente.

**Por qué esta implementación y no otra:** guardar el valor crudo de cada
clave (en vez de reconstruir un objeto tipado) es la opción que menos
mantenimiento futuro pide (no hay que tocar el exportador cada vez que se
agrega una clave nueva en cualquier archivo) y la más fiel para restaurar
"exactamente como estaba" — que es lo único que importa para el caso de uso
real de este pedido (recuperar contenido perdido), no una fusión
inteligente que la propia consigna ya señalaba como fuente de duplicados.

---

## Ronda 8 — corrección de bug: agrupamiento de "Arpegios menores" atado a 3
## articulaciones fijas

El punto 38 corresponde a una corrección de bug reportada sobre el mecanismo
de agrupamiento de "Arpegios menores" (ver punto 15), trabajada de forma
autónoma sin pausar a preguntar.

## 38. El agrupamiento de "Arpegios menores" pasa a ser por NOMBRE (+ nivel), no por una lista fija de 3 articulaciones

**Bug reportado:** el mecanismo del punto 15 (una sola fila en "Hoy" que
cicla entre las variantes de "Arpegios menores") quedó implementado
verificando si la articulación elegida en "Nuevo ejercicio" era exactamente
Portato, Nota repetida o Continuo (`ARTICULACIONES_ARPEGIO_MENOR.includes(articulacion)`,
en `newExercise.js`). Si el usuario cargaba una variante nueva de "Arpegios
menores" con una articulación/rítmica distinta (ej. "Staccato", o cualquier
nombre libre vía "Otra…"), esa condición daba `false`, el ejercicio se
guardaba con `grupoEspecial: null` y quedaba fuera del grupo — en "Hoy"
aparecía como candidato de arpegio normal, y su botón de fila (que hubiera
sido "otro similar" genérico) mostraba "No hay otro ejercicio similar
disponible todavía" en vez de ciclar junto con las demás variantes.

**Causa raíz:** el resto de la infraestructura de agrupamiento (`splitVirtualGroups`,
`toCandidate` y `cycleGrupoEspecialStep` en `store.js`) YA era genérica —
opera sobre el campo `grupoEspecial` de cada ejercicio, agrupa cualquier
cantidad de variantes que lo compartan, y cicla `variantIds` sin ningún
límite fijo. El único lugar atado a las 3 articulaciones específicas era la
ASIGNACIÓN de ese campo al guardar el formulario — el bug estaba ahí, no en
el mecanismo de "Hoy" en sí.

**Decisión — generalizar la asignación de `grupoEspecial` a nombre + tipo,
no a una lista de articulaciones:**
- `newExercise.js`, al guardar: `exercise.grupoEspecial = (tipo === 'arpegio'
  && normalizeNombre(nombre) === normalizeNombre(NOMBRE_GRUPO_ARPEGIOS_MENORES))
  ? GRUPO_ARPEGIOS_MENORES : null` — ya no importa qué articulación tenga el
  ejercicio, solo que sea de tipo "arpegio" y que su NOMBRE, normalizado, sea
  exactamente "Arpegios menores". `normalizeNombre` (nuevo, en `util.js`)
  hace `trim()` + `toLowerCase()` + colapso de espacios repetidos, para que
  "arpegios   MENORES " cuente como el mismo nombre. El requisito de "mismo
  nivel" ya lo cumple gratis la infraestructura existente: `candidatesFor`
  arma la lista de candidatos filtrando por `nivel` ANTES de agrupar, así
  que dos ejercicios con el mismo nombre pero nivel distinto nunca conviven
  en la misma lista y nunca se agrupan entre sí — no hizo falta ningún
  chequeo de nivel adicional.
- Como la agrupación ahora depende del NOMBRE exacto, la sugerencia
  automática de nombre (al elegir Portato/Nota repetida/Continuo con el
  campo Nombre vacío) se simplificó: antes completaba `"Arpegios menores —
  <Articulación>"` (ej. "Arpegios menores — Portato"), lo que en los hechos
  YA NO hubiera calificado para el grupo con la nueva regla de comparación
  exacta. Ahora sugiere el nombre exacto del grupo, sin sufijo — la
  articulación ya se muestra aparte, como badge, tanto en "Hoy" (`articulacionBadge`)
  como en la Biblioteca, así que no se pierde esa información al quitarla
  del nombre.
- Se agregó un hint fijo bajo el campo "Nombre" (visible para cualquier
  ejercicio de tipo "Arpegio", sin importar el nombre actual) explicando la
  regla ("si lo llamás exactamente 'Arpegios menores' se agrupa..."), porque
  con articulaciones custom vía "Otra…" no hay ningún valor conocido del
  cual autocompletar el nombre — el usuario tiene que escribirlo a mano, y
  antes no había ninguna pista de que el nombre importara para esto.
- El orden de ciclado dentro del grupo (`ordenArpegioMenor` en `store.js`)
  sigue priorizando Portato → Nota repetida → Continuo cuando están
  presentes (no se quiso alterar el orden ya conocido para quien ya tiene
  esas 3 cargadas), y agrega cualquier articulación nueva DESPUÉS de esas
  3, en el orden en que se cargó — se corrigió además un detalle menor del
  comparador original (`indexOf` devuelve `-1` para articulaciones
  desconocidas, y `-1 < 0/1/2` las hubiera ordenado ANTES de Portato en vez
  de después; se normalizó el "no encontrado" a `Number.MAX_SAFE_INTEGER`).
- **Compatibilidad con datos ya guardados:** el campo `grupoEspecial` se
  computa solo al GUARDAR el formulario (alta o edición), no en cada
  render — así que ejercicios ya cargados con la regla vieja (nombre real
  del tipo "Arpegios menores — Portato", con el sufijo que generaba la
  sugerencia anterior) conservan su `grupoEspecial: 'arpegios-menores'` tal
  cual está en `localStorage` y siguen agrupados sin necesidad de tocarlos.
  El único caso en que se recalcula es si el usuario vuelve a EDITAR y
  GUARDAR uno de esos ejercicios viejos: si en ese momento su nombre
  todavía tiene el sufijo de articulación (no es exactamente "Arpegios
  menores"), la regla nueva ya no lo reconoce y se desagrupa. Se decidió no
  agregar lógica especial para este caso (ej. reconocer también nombres con
  prefijo "Arpegios menores —") porque el pedido es explícito en pedir
  comparación de nombre exacta, y la migración es de bajo costo para el
  usuario: si edita una variante vieja y quiere que seguir agrupada,
  alcanza con dejar el campo Nombre en exactamente "Arpegios menores" (el
  hint nuevo bajo ese campo lo explica in situ).

**Por qué esta decisión y no otra:** mover la clave de agrupamiento de
"articulación en una lista cerrada" a "nombre exacto" es la única forma de
cumplir literalmente el pedido ("agrupar automáticamente TODOS los
ejercicios... sin importar cómo se llame la articulación... sin límite fijo
de opciones") sin inventar una segunda lista igual de cerrada con otro
nombre. Comparar por nombre EXACTO (no por prefijo/contiene) es la lectura
más simple y predecible de "mismo nombre 'Arpegios menores'" tal como lo
pide la consigna, y evita falsos positivos (un ejercicio real llamado, por
ejemplo, "Arpegios menores (repaso)" no se agruparía por accidente con el
grupo especial). Dejar `variantIds`/`cycleGrupoEspecialStep`/`splitVirtualGroups`
sin tocar (ya eran genéricos) minimiza el diff y el riesgo de introducir un
bug nuevo en el mecanismo de "Hoy", que ya estaba probado.

**Verificación en navegador (no solo en el código):** se encontró primero
que el navegador servía una versión vieja cacheada de `newExercise.js` (el
service worker de la PWA, `service-worker.js`, ya tenía una instalación
previa con `CACHE_NAME = 'fuelle-v8'` de una sesión anterior del mismo
origen `localhost:5173`, y su estrategia es cache-first) — se detectó
porque un elemento del DOM (`#nombreArpegioMenorHint`) que el código nuevo
agrega no aparecía pese a que `curl` al servidor mostraba el archivo ya
actualizado en disco; se confirmó la causa desregistrando el service worker
y limpiando `caches` desde la consola del propio navegador, y recargando.
Con el código nuevo ya activo se cargaron, vía el formulario real de "Nuevo
ejercicio" (no manipulando `localStorage` a mano), 3 variantes de "Arpegios
menores" (nivel intermedio) con articulaciones libres que NO son ninguna de
las 3 originales — "Ricocheteado", "Legato con vibrato" (con el nombre
escrito además con espacios extra y mayúsculas irregulares, `"  arpegios
MENORES  "`, para probar la normalización) y "Trémolo suave" — cada una con
un solo paso (sin imagen, que el formulario no exige). En "Hoy" (nivel
intermedio) las 3 aparecieron agrupadas en una única fila "Arpegios
menores", y el botón ⇄ de esa fila cicló correctamente Ricocheteado → Legato
con vibrato → Trémolo suave → Ricocheteado (toast de confirmación en cada
paso, badge de articulación actualizado en la fila), confirmando que el
ciclo funciona con una cantidad arbitraria de variantes y con nombres de
articulación arbitrarios. También se verificó que el grupo preexistente
real (2 variantes, Portato/Nota repetida, nivel avanzado, cargadas antes de
este cambio) siguió intacto y agrupado sin tocarlo, confirmando la
compatibilidad hacia atrás descripta arriba. Los 3 ejercicios de prueba se
borraron de `localStorage` al terminar de verificar (junto con el estado de
"Hoy" para que se regenere) para no dejar datos de prueba mezclados con el
contenido real del usuario; el nivel de perfil (estaba en "avanzado" antes
de la prueba) se restauró a ese mismo valor.

## 39. Topbar/tabbar más chicas y sin título en Práctica horizontal; chips de modo de avance más cortos

**Pedido (probado en iPhone real, no en el navegador de escritorio):**
verificado el punto 17 (horizontal solo en Práctica) contra un iPhone físico
— algo que este entorno de automatización no puede hacer, ver punto 33 —
apareció una queja de proporción: `.topbar` (con el título "Práctica") y
`.tabbar` conservan la misma altura que en el resto de la app (fijada en
`px`, pensada para vertical), sin achicarse en horizontal pese a que el
punto 35 ya había optimizado con `clamp(vh)` prácticamente todo el resto del
panel lateral para ese mismo objetivo (partitura + controles siempre a la
vista, sin scroll). El pedido puntual: reducir ambas barras, sacar la
palabra "Práctica" (no cumple ninguna función — la pantalla ya se identifica
por su contenido) y en el selector de modo de avance acortar las etiquetas a
"Auto (metrónomo)" / "Manual", cambiando el emoji de pie (🦶) por uno de
mano (✋).

**Decisión:**
- `body.is-player .topbar-inner`/`.tab-btn` pasan a `clamp(vh)` en vez de los
  valores fijos de la regla base, mismo patrón que ya usa todo `.player-side`
  desde el punto 35 — se achican solos en pantallas bajas en vez de comerse
  altura fija. Scopeado a horizontal + `body.is-player` (misma clase del
  punto 17): el resto de las pantallas y la Práctica en vertical no cambian.
- `.topbar-title`/`.topbar-spacer` se ocultan enteras (no solo se achica la
  fuente) en ese mismo alcance: el hint de texto no aportaba nada aquí y
  sacarlo entero, en vez de dejarlo en tamaño mínimo, es lo que de verdad le
  devuelve esa altura a `.screen`. El botón "Volver" queda solo, encogido con
  `clamp()` como el resto de los íconos de Práctica.
- No se tocó `app.js` ni la lógica que decide qué pantallas muestran topbar/
  tabbar (siguen siendo las mismas de siempre, ver punto 35) — el cambio es
  puramente de tamaño/visibilidad vía CSS, así que no hay riesgo de romper la
  navegación ni el cálculo de alturas encadenado que ya corrige el punto 35
  (`.topbar`/`.tabbar` más chicas solo le dejan MÁS espacio a `.screen`,
  nunca menos).
- `player.js`: los chips de `#modePicker` pasan de "🎵 Automático
  (metrónomo)" / "🦶 Manual (pedal / teclado / toque)" a "🎵 Auto
  (metrónomo)" / "✋ Manual". El texto largo del modo manual era redundante
  con el hint fijo que ya aparece debajo (`#manualHint`, ver punto 32) al
  activarlo, que explica el detalle de pedal/teclado/toque — acortar el chip
  no pierde información, solo la deja de duplicar en dos lugares a la vez.

**Por qué:** el punto 35 ya había establecido el patrón correcto (achicar
con `clamp(vh)`, no ocultar contenido funcional) para todo lo que SÍ cumple
una función en Práctica; acá se extiende ese mismo patrón a topbar/tabbar, y
se aplica la otra herramienta disponible (ocultar del todo) solo al único
elemento sin función real en esa pantalla (el título). Mantener el pedido de
"sacarla" tal cual, en vez de la alternativa que también se había evaluado
("moverla al zócalo inferior"), evita agregarle una responsabilidad nueva a
`.tabbar` (que ya identifica la pantalla activa con el tab resaltado) solo
para relocalizar un texto que no hace falta en ningún lado.

## 40. Logo real (Atlas con bandoneón) reemplaza el ícono placeholder de fuelles

**Pedido:** el usuario aportó un logo ya ilustrado (un Atlas sosteniendo un
bandoneón en vez del mundo, sobre una insignia dorada con fondo azul marino y
ondas concéntricas) para que sea el ícono que aparece en la pantalla de
inicio del teléfono al instalar la PWA, pidiendo explícitamente sacarle el
fondo si hacía falta.

**Problema del archivo tal cual vino:** la imagen (512×512, generada por IA)
no era un ícono "de borde a borde" sino una insignia con esquinas ya
redondeadas y borde dorado, centrada sobre un margen plano color crema que
ocupaba buena parte del lienzo. Usar ese archivo tal cual como ícono hubiera
dado un resultado de "cuadrado redondeado dentro de otro cuadrado
redondeado" (el propio del sistema operativo, aplicado sobre uno que ya
traía el suyo), con un marco crema visible alrededor — el pedido explícito de
"quitarle el fondo" apuntaba justamente a esto.

**Decisión — pipeline de 2 pasos, reemplazando por completo el generador
geométrico anterior (`New-BandoneonIcon`, que dibujaba fuelles con
polígonos):**
1. **Recorte de fondo por flood fill** (`Remove-FlatBackground` en
   `scripts/make-icons.ps1`): en vez de un chroma-key ingenuo (reemplazar
   todo píxel "parecido al fondo" en toda la imagen, lo que hubiera borrado
   por error tonos crema que también aparecen DENTRO de la ilustración,
   como un brillo/resplandor cerca del centro), se hace flood fill a partir
   de los 4 bordes del lienzo: solo se vacía el fondo que está *conectado*
   al borde exterior, así cualquier tono similar encerrado dentro de la
   insignia queda intacto sin necesitar detectarlo como caso especial. Con
   tolerancia baja (25) quedaba un halo de píxels antialiased sin limpiar y
   la sombra proyectada de la insignia (pensada para verse sobre crema)
   sobrevivía como una mancha clara sin sentido sobre fondo oscuro; subir la
   tolerancia a 48 fue suficiente para que el flood fill se "comiera" tanto
   el halo como esa sombra sin llegar a tocar el borde dorado real (la
   distancia de color entre el crema de fondo y el dorado del borde es
   >80 en el canal azul, muy por encima del umbral). El resultado (fondo
   transparente, recortado a la caja delimitadora de lo que quedó opaco) se
   guarda como `icons/logo-cutout.png`, un activo reutilizable versionado
   junto con `icons/logo-original.png` (la imagen tal cual la subió el
   usuario) — así todo el proceso es reproducible sin depender de ningún
   archivo fuera del repo.
2. **Composición sobre fondo sólido** (`New-FlatIcon`): en vez de dejar el
   PNG con transparencia (iOS no la soporta bien en el ícono de la app: la
   aplana contra negro), cada tamaño se compone sobre un lienzo azul marino
   (`RGB(9,16,32)`, tomado del propio interior de la insignia) — así el
   relleno de las esquinas que la insignia redondeada deja libres es
   prácticamente invisible, en vez de crear un marco de color distinto. Los
   íconos normales (512/192/180/32) usan el contenido casi de borde a borde
   (98%) porque la insignia ya trae su propio margen/redondeo; el maskable
   (512, `contentFraction` 0.72) deja mucho más aire alrededor porque
   Android puede recortarlo en círculo, y con el bandoneón/manos llegando
   casi al borde un recorte circular sin ese margen extra se los hubiera
   comido.

**Por qué reemplazar el script entero y no solo los PNG:** los íconos
anteriores eran 100% generados por código (`New-BandoneonIcon`) — no existía
ningún archivo fuente que regenerarlos dependiera de conservar. Ahora que la
fuente es una imagen real, dejar el generador geométrico viejo en
`make-icons.ps1` hubiera sido código muerto y, peor, engañoso (alguien podría
correrlo pensando que regenera el logo actual y en cambio hubiera vuelto a
dibujar fuelles genéricos, pisando el logo real). Consolidar todo el pipeline
nuevo (recorte + composición) en el mismo script, parametrizado por tamaño/
fracción de contenido/color de fondo, deja un solo lugar para volver a
generar todo si el usuario trae una versión distinta del logo — alcanza con
reemplazar `icons/logo-original.png` y volver a correr el script.

**Verificado visualmente** (no solo corriendo el script sin errores): se
inspeccionó cada PNG generado (512, 192, 180, 32 y el maskable) — el halo y
la mancha de sombra desaparecieron con el umbral ajustado, el ícono se lee
bien incluso a 192px, y a 32px (favicon) sigue siendo reconocible como una
insignia dorada aunque se pierda el detalle fino del grabado. Se corrió
`make-icons.ps1` una segunda vez de punta a punta para confirmar que el
recorte da exactamente la misma caja delimitadora (406×416) que durante el
ajuste manual del umbral, antes de dejarlo como versión definitiva.

**Nota (fuera del alcance de este cambio):** los archivos de manifest/HTML
que referencian estas rutas (`manifest.webmanifest`, `index.html`) no
necesitaron tocarse — ya apuntaban a `icons/icon-*.png` por nombre de
archivo, y este cambio reemplaza el contenido de esos mismos archivos sin
renombrarlos. Lo que sí hace falta para verlo reflejado en un ícono ya
agregado a la pantalla de inicio de iOS: **borrar el ícono existente y
volver a agregarlo desde Safari** — a diferencia del resto de la PWA (HTML/
CSS/JS, servidos por el service worker y actualizables in-place, ver punto
"Bump CACHE_NAME"), iOS captura una instantánea del ícono en el momento de
"Agregar a pantalla de inicio" y no la vuelve a consultar después, así que
publicar un manifest nuevo no alcanza para actualizar un ícono ya instalado.

## 41. Sin topbar en Práctica horizontal: botón "Volver" flotante sobre la partitura

**Pedido (probado en iPhone real):** el punto 39 ya había achicado
`.topbar`/`.tabbar` y sacado el título "Práctica" en horizontal, pero
probado en el dispositivo real seguía quedando un margen superior
desaprovechado (el alto de la barra, aunque chica, seguía restándole
espacio a la partitura). El pedido puntual: que la barra superior
desaparezca del todo en Práctica horizontal, y que el botón "Volver" que
alojaba quede flotando sobre la partitura en la esquina superior izquierda,
como un círculo de un color que se destaque (el bordó de la app) con una
flecha blanca adentro.

**Decisión:**
- `body.is-player .topbar` pasa de `position: sticky` (la de base) a
  `position: absolute` dentro de `.app-shell` (que ya es `position:
  relative`), scopeado a horizontal + `body.is-player` como el resto de las
  reglas de esta pantalla (punto 17). Sacarla de la caja de flujo así, en
  vez de solo ponerle `display: none`, es lo que le devuelve ese espacio a
  `.screen` sin tocar nada de JS ni de la fórmula de alturas: `.screen`
  sigue siendo `flex: 1` dentro de `.app-shell` (punto 35), así que al
  desaparecer `.topbar` del flujo automáticamente pasa a ocupar también esa
  franja — el mismo razonamiento que ya había evitado recalcular nada a mano
  en el punto 39.
- `.topbar-title`/`.topbar-spacer` siguen ocultos (ya lo estaban desde el
  punto 39) y `.topbar` pierde fondo/borde/padding propios — lo único que
  quedó visible es `.back-btn`, ahora circular (`border-radius: 50%`) con
  fondo `var(--wine)` (el mismo tono que ya usa `.btn-wine` en esta misma
  pantalla, para "Terminar y calificar") y flecha blanca, con una sombra
  sutil para que se distinga incluso sobre partituras con fondo claro.
- No se tocó el DOM (`index.html`/`app.js`): sigue siendo el mismo
  `#backBtn` de siempre, solo reposicionado y restyleado por CSS — mismo
  patrón que el resto de los cambios de esta pantalla (evita duplicar el
  elemento o su listener de click).

**Por qué:** una vez que el punto 39 estableció que el título no cumplía
ninguna función acá, el paso lógico siguiente (pedido explícitamente por el
usuario tras probar en el dispositivo real) es cuestionar si la barra en sí
necesitaba seguir ocupando su propia franja — la única función real que le
quedaba (alojar "Volver") no requiere una barra entera, alcanza con el botón
mismo flotando. `position: absolute` sobre un ancestro `relative` es la
herramienta más simple para sacar un elemento del flujo sin tocar el resto
del layout ya establecido (grid/flex de los puntos 30 y 35), y reusar
`var(--wine)` en vez de inventar un color nuevo mantiene el botón coherente
con el resto de la paleta de esta pantalla.

**Verificado en el navegador:** con un ejercicio de prueba cargado y la
ventana en horizontal, se confirmó que la partitura gana el espacio antes
ocupado por la barra, que el botón circular flotante se ve por encima del
marco de la partitura (sin quedar tapado), y que el click sigue navegando
correctamente de vuelta a "Hoy"/Biblioteca (según de dónde se entró, ver
punto 28) — no se tocó el handler, así que el comportamiento no podía haber
cambiado, pero se verificó igual por tratarse de la única función que le
queda al elemento.

## 42. El acento del metrónomo deja de ser ajustable en Práctica: pasa a ser un dato fijo del ejercicio

**Pedido:** el usuario decidió que, para cómo usa la app, el acento del
metrónomo no necesita ser algo que se pueda tocar cada vez que abre un
ejercicio a practicar — lo va a dejar configurado una vez y no lo va a
volver a tocar desde ahí. Pidió sacar el selector "Acento cada" de la
pantalla de Práctica (reduciendo lo que hay que scrollear en el panel
lateral) y, si hace falta configurarlo, que se pueda hacer al cargar o
editar el ejercicio en la Biblioteca.

**Decisión — el acento pasa de "preferencia de sesión" a "dato del ejercicio":**
- Antes vivía en `fuelle:playerSettings:v2:<id>` junto con BPM y modo
  (auto/manual) — un valor que el usuario podía cambiar en cualquier
  momento desde el chip-row `#acentoPicker` dentro del panel "Acento y
  volumen" de `player.js`, y que quedaba persistido por ejercicio pero
  seguía siendo, conceptualmente, una preferencia de *cómo practicás*, no
  una propiedad del ejercicio en sí (al igual que BPM y modo, que siguen
  siendo ajustables en Práctica sin problema).
- Ahora es un campo más del ejercicio (`exercise.acentoDefault`), guardado
  junto con `bpmDefault`/`compas` en `newExercise.js` (alta y edición) —
  mismo patrón exacto que ya usaba "Velocidad de metrónomo sugerida" para
  `bpmDefault`: un chip-row (`ACENTO_OPTIONS`, ya existía en `theory.js`)
  ubicado justo debajo de "Compás" (de cuyo valor depende el default
  sugerido, `tiemposPorCompas(compas)`), oculto para ejercicios de tipo
  "Fuelle" igual que BPM/Compás (no usan metrónomo).
- `player.js` ya no lee ni escribe `acentoCada` en `playerSettings`: lo
  calcula una sola vez al montar la pantalla, directo de
  `exercise.acentoDefault` (con fallback a `tiemposPorCompas(compas)` si el
  ejercicio es de una carga vieja sin este campo), como una constante que no
  cambia durante la sesión de práctica. Se sacó por completo el bloque
  `#acentoBlock`/`#acentoPicker` del panel "ajustes avanzados", que pasa a
  contener solo los volúmenes — el botón que lo despliega cambia de "⚙
  Acento y volumen" a simplemente "⚙ Volumen" para reflejarlo.

**Compatibilidad con ejercicios ya cargados:** los que no tengan
`acentoDefault` (todos los cargados antes de este cambio) siguen
funcionando exactos a como sonaban antes — el fallback a
`tiemposPorCompas(compas)` es el mismo cálculo que usaba `defaultSettings()`
como valor inicial previo a este cambio, así que el comportamiento por
defecto no varió, solo dejó de poder tocarse desde Práctica. Si alguno tenía
un valor distinto guardado a mano en `playerSettings` (vía el picker viejo),
ese valor queda huérfano en `localStorage` (nunca más se lee) — no se agregó
migración porque no hay forma de saber, sin abrir cada ejercicio, cuál
valor "real" debería tener ahora en `acentoDefault`; el usuario puede
resetearlo editando el ejercicio una vez.

**Por qué:** mover el campo al mismo lugar y con el mismo patrón que
`bpmDefault` (en vez de inventar un mecanismo nuevo) mantiene el formulario
de alta/edición consistente consigo mismo, y evita que Práctica necesite
seguir sabiendo nada de acento más allá de pasárselo tal cual al metrónomo
al arrancar (`metronome.start({ accentEvery: acentoCada, ... })`, sin
cambios). Calcularlo una sola vez como constante (en vez de dejarlo en una
variable `let` reasignable, como quedó BPM) refleja directamente en el
código que ya no es algo que la pantalla permita cambiar en vivo.

## 43. Se saca "Cargar foto de este paso" de Práctica

**Contexto:** el usuario preguntó para qué servía este botón, dado que él
ya carga todas las imágenes de cada paso al crear el ejercicio en "Nuevo".
La respuesta (server para agregar/reemplazar la imagen de un paso sin tener
que ir a "Editar ejercicio" — útil si un paso quedó sin foto o salió mal
encuadrada) no aplica a su flujo de trabajo real: él carga todo de entrada y
no piensa reemplazar fotos desde Práctica.

**Decisión:** se sacó el control (`<label class="file-btn">` + `#imgInput`)
del `.footer-row`, que ahora solo tiene "Terminar y calificar", y su
listener de `change` (`store.setCustomImage(pasos[index].id, ...)`) — la
función de `store.js` que usaba (`setCustomImage`) no se tocó, porque
`newExercise.js` la sigue usando para guardar la imagen de cada paso al
cargar/editar un ejercicio; solo se quitó esta segunda vía de acceso a la
misma función. El usuario aclaró que es una decisión "por ahora" — si más
adelante hace falta reemplazar una foto sin pasar por "Editar ejercicio",
se puede volver a agregar.

**Por qué no tocar `store.setCustomImage`:** sigue siendo el mecanismo real
que usa el formulario de alta/edición para guardar imágenes de pasos — sacar
el botón de Práctica es remover un segundo *punto de entrada* a una función
que sigue siendo necesaria, no la función en sí.

## 44. BPM libre (10-300) en vez de 3 velocidades fijas, con sincronización automática al audio de referencia

**Contexto:** el punto 19 había reemplazado un control de BPM libre por 3
velocidades fijas (40/60/80) **en toda la app**, justamente para que el "BPM
sugerido" y el metrónomo en vivo coincidieran siempre con alguna de las 3
velocidades a las que se puede grabar un audio de referencia por paso (punto
20). El pedido ahora es el inverso parcial: el usuario quiere mover el
metrónomo libremente en un rango amplio (10 a 300 BPM) para practicar a la
velocidad exacta que le sirva, pero sin perder la referencia sonora — al
tocar uno de los audios grabados a 40/60/80, el metrónomo tiene que saltar
exactamente a esa velocidad para sonar a la par; fuera de eso, el usuario
puede alejarse libremente de esos 3 valores (perdiendo la sincronía con el
audio, algo esperado — un audio grabado no puede cambiar de tempo solo).

**Decisión:**
- `BPM_OPTIONS` (`theory.js`) queda tal cual (`[40, 60, 80]`) pero pasa a
  significar únicamente "a qué velocidades puede haber un audio de
  referencia grabado por paso" — ya no es el único rango posible para el
  metrónomo en vivo. Se agregan `BPM_MIN = 10` y `BPM_MAX = 300` para ese
  rango libre.
- El selector de 3 chips (`.bpm-picker`/`.bpm-chip`, tanto en `player.js`
  como en "BPM sugerido" de `newExercise.js`) se reemplaza en los dos
  lugares por un slider (`<input type="range">`, min/max `BPM_MIN`/`BPM_MAX`,
  step 1) con el valor numérico como label — mismo componente visual que ya
  usaban los sliders de volumen (`.volume-block`/`.volume-block-label`), así
  que no hizo falta CSS nuevo, solo reusar esas clases. Se agregó
  `isValidBpm()` en `data.js` (un solo lugar para el chequeo de rango
  `BPM_MIN..BPM_MAX`, en vez de repetir la comparación en cada archivo) para
  reemplazar los `BPM_OPTIONS.includes(...)` que validaban `bpmDefault`/
  `settings.bpm` contra la lista fija de 3 valores.
- **Sincronización al tocar un audio de referencia:** `player.js` centraliza
  todo lo que depende del BPM (variable `bpm`, valor del slider, texto del
  label, `metronome.setBpm()` y persistencia en `playerSettings`) en una
  única función `setBpm(newBpm)`. El handler de "▶" en cada audio de
  demostración (`paintAudioRow`, ver punto 20) ahora llama a `setBpm(refBpm)`
  —con `refBpm` siendo 40, 60 u 80 según qué botón se tocó— **antes** de
  reproducir el audio, así el metrónomo (suene o no en ese momento:
  `metronome.setBpm()` no corta un click en curso, ver su propio comentario
  en `metronome.js`) queda exactamente a esa velocidad. No hace falta ningún
  chequeo especial para "cuando el usuario se aleja a mano": simplemente el
  slider y el botón de audio escriben la misma variable `bpm` a través de la
  misma función, así que el último que se tocó gana, sin ningún estado de
  "sincronizado sí/no" que mantener aparte.
- El audio-row en sí (`paintAudioRow`) no necesitó ningún cambio más allá de
  la llamada a `setBpm`: sigue mostrando los 3 slots 40/60/80 igual que
  antes (subir/reproducir/borrar), esos 3 valores siguen siendo fijos a
  propósito (grabar/subir un audio de referencia a un BPM arbitrario no es
  práctico).

**Compatibilidad con datos viejos:** un `bpmDefault`/`playerSettings.bpm`
guardado antes de este cambio siempre era 40, 60 u 80 — todos esos valores
siguen siendo válidos dentro del rango `10..300`, así que ningún ejercicio ni
ajuste guardado quedó fuera de rango; no hizo falta ninguna migración.

**Por qué:** centralizar en `setBpm()` (en vez de que el slider y el handler
de audio escriban `bpm`/`metronome.setBpm()`/`saveSettings()` cada uno por su
lado) es lo que garantiza que "tocar un audio de referencia" y "mover el
slider a mano" sean, para el resto del código, exactamente la misma
operación — evita que un cambio futuro en uno de los dos caminos los
desincronice por accidente. Reusar `.volume-block` en vez de crear un
componente de slider nuevo mantiene consistencia visual (mismo look en
Práctica: label + valor arriba, barra abajo) con cero CSS adicional.

**Verificado en el navegador:** con un ejercicio de prueba (BPM sugerido
150) y un audio de referencia sembrado a mano en `localStorage` para 60 BPM
(ver `store.setCustomAudio`), se confirmó que Práctica arranca mostrando
"150 BPM" en el slider (el sugerido), y que tocar "▶ 60" hace que el slider
y el label salten a "60 BPM" al instante — tanto leyendo el DOM
(`#bpmSlider.value`) como visualmente. Los datos de prueba (ejercicio y
audio sembrado) se borraron de `localStorage` al terminar.

## 45. Rediseño visual "fuelle-pentagrama": paleta, íconos de tipo y Biblioteca/Hoy como lista

**Contexto:** el usuario pidió explorar direcciones estéticas nuevas para la
app (ver la sesión de diseño con Claude Design — 5 direcciones sobre la
pantalla de Biblioteca, más una hoja de íconos), sintiendo que el look
original era "un poco genérico" para una app pensada específicamente para
bandoneonistas. De esas direcciones, la elegida fue una mezcla entre la
"A" (cuero, con el fuelle como separador en zigzag) y la "D" (minimalista,
tipografía editorial, filas separadas por líneas finas en vez de tarjetas) —
con el separador de la "D" convertido en un fuelle real (plegado, no una
línea recta), más 3 íconos de tipo de ejercicio (Escala/Arpegio/Fuelle) y la
insignia de nivel convertida en un disquito de pesa (guiño a "gimnasio para
bandoneonistas"). Este punto documenta cómo se llevó esa dirección del
lienzo de diseño al código real.

**Alcance acordado con el usuario, explícito antes de tocar código:**
Biblioteca y "Hoy" (las dos pantallas que listan ejercicios) adoptan el
estilo de fila sin tarjeta; "Nuevo ejercicio"/"Editar"/Perfil (formularios)
solo cambian de paleta/tipografía, sin tocar su estructura de campos/chips
— no todo tenía sentido convertirlo a "lista".

**Decisión — paleta y tipografía (`styles.css`, `:root`):**
- Superficies/texto pasan de los tonos bordó (`#1a0d10`/`#2a161c`/...) a una
  paleta más neutra, marrón-carbón (`#151312`/`#1b1918`/`#efe9e1`/...) —
  la misma que se probó en las direcciones D/A+D del lienzo. `--gold` y
  `--wine` NO cambiaron: siguen siendo el hilo conductor con la identidad
  anterior (dorado como acento principal, bordó reservado para "Terminar y
  calificar" y el botón "Volver" flotante de Práctica), evitando que se
  sienta como una app completamente distinta.
- `--lvl-avanzado` pasa de un bordó (`#a8394a`, muy parecido a `--wine`) a
  un terracota (`#c97a5a`) — en la paleta vieja el nivel "Avanzado" y el
  botón de "Terminar" casi compartían color por coincidencia; ahora son
  visualmente distintos a propósito.
- **Tipografía: sigue sin haber Google Fonts** (ver punto 3, que sigue
  vigente y por la misma razón: el service worker solo cachea pedidos del
  mismo origen — `event.request.url.startsWith(self.location.origin)` en
  `service-worker.js` — así que una fuente externa se vería bien la primera
  vez online y fallaría en silencio (cae al fallback) en cada apertura
  offline después, para una app cuyo valor central es funcionar sin
  conexión). El look "editorial" de la dirección D se logró con
  `font-style: italic` sobre el mismo `--font-serif` (Georgia) de siempre,
  aplicado solo a `.topbar-title` — el resto de los títulos (`.card-title`,
  etc.) sigue en redonda para no perder legibilidad en una lista larga.

**Decisión — separador "fuelle" (`index.html` + `styles.css`):**
El borde inferior plano del topbar se reemplaza por un SVG de 4 líneas
onduladas/plegadas (`.fuelle-divider`, insertado una sola vez en
`index.html` dentro de `<header class="topbar">`, así aparece en todas las
pantallas sin tocar cada archivo de pantalla) — se lee como pentagrama de
lejos y como pliegues de fuelle de cerca. Se oculta junto con el resto del
topbar en Práctica horizontal (mismo bloque `body.is-player .topbar` del
punto 41).

**Decisión — íconos de tipo + insignia de nivel (`ui.js`):**
- `TIPO_ICON` (nuevo, en `ui.js`): un mini-SVG por tipo — escalerita de 3
  escalones para "Escala", los mismos 3 escalones pero como puntos sueltos
  para "Arpegio" (mismo origen visual: fue un pedido explícito del usuario
  que se vieran "emparentados"; se ajustó primero a 4 puntos y después a 3
  más separados, tras probarlo en el lienzo, para que no se vea "manchado" a
  tamaño chico), y los dos extremos + pliegues del bandoneón para "Fuelle".
  `tipoBadge()` (ya existía en `ui.js` pero **no se usaba en ningún lado** —
  tanto `library.js` como `today.js` armaban el badge de tipo a mano, texto
  suelto sin pasar por el helper) ahora sí se usa desde los dos lugares,
  con el ícono prepandido — de paso deduplica ese markup.
- `nivelBadge()` prepende un disquito de pesa (círculo + barra,
  `stroke="currentColor"`) antes del texto del nivel — hereda el color de
  `.badge-<nivel>` sin necesitar una variante de ícono por nivel.
- `.badge` pasa de `display:inline-block` a `inline-flex` con `gap:4px`
  para que ícono y texto queden alineados.

**Decisión — Biblioteca y "Hoy" como lista (`styles.css`, sin tocar JS/HTML
de esas pantallas):** `.card-list-item` (Biblioteca) y `.step-card` ("Hoy")
ya eran clases propias, separadas de la `.card` genérica que sigue usando
Perfil — así que alcanzó con una regla CSS nueva (`.card-list-item,
.step-card { background:transparent; border:none; border-radius:0;
box-shadow:none; border-bottom:1px solid var(--border-soft); margin-bottom:0
}` + `#list, #stepsList { border-top: 1px solid var(--border-soft) }`) para
convertirlas en filas separadas por líneas finas, sin tocar un solo archivo
de esas dos pantallas ni sus manejadores de click. `.card` (Perfil, "Nuevo")
no se tocó: sigue con fondo/borde/radio propios, solo con los colores
nuevos heredados de las variables de `:root`.

**Por qué (la decisión de alcance):** Biblioteca y "Hoy" son, literalmente,
listas de ejercicios — el patrón de fila-con-línea-fina es el que mejor
encaja ahí (y era, además, lo que el usuario señaló que le gustaba del
lienzo). "Nuevo ejercicio" y Perfil son formularios con bloques de campos,
steppers y chip-rows: no son una lista de ítems intercambiables, así que
forzar el mismo patrón ahí no tenía un beneficio claro y sí el riesgo de
romper una estructura ya probada — se lo planteamos directamente al usuario
antes de tocar código y confirmó "solo recolorear" para esas pantallas.

**Verificado en el navegador:** con un ejercicio de prueba de tipo "Escala"
nivel "Principiante", se confirmó en Biblioteca que la fila quedó sin
tarjeta (fondo transparente, separada por una línea fina) con el disquito
de pesa antes de "PRINCIPIANTE" y la escalerita antes de "ESCALA", ambos
legibles al tamaño real del badge. Se confirmó también que Perfil ("Nuevo
ejercicio"/nivel) conserva su tarjeta con fondo/borde propios, solo con la
paleta nueva. Sin errores nuevos en consola. El ejercicio de prueba se borró
de `localStorage` al terminar.

## 46. Íconos de transporte propios (play/pausa/anterior/siguiente) y nivel junto al título en Biblioteca

**Pedido:** dos cambios sueltos, seguimiento del punto 45. (1) Los botones
de reproducir/pausar/paso anterior/paso siguiente en Práctica usaban
glyphs de emoji (▶ ⏸ ⏮ ⏭) — pedido explícito de reemplazarlos por algo con
más personalidad, en línea con el resto de los íconos nuevos. (2) En la
tarjeta de Biblioteca, el nivel ("Avanzado") pase a estar al lado del
nombre del ejercicio, para que el renglón de abajo quede libre y muestre
tipo + articulación juntos en un solo renglón (ej. "Arpegio / Staccato") en
vez de dos badges separados.

**Decisión — íconos de transporte (`player.js`):** 4 constantes nuevas al
principio del archivo (`ICON_PLAY`/`ICON_PAUSE`/`ICON_PREV`/`ICON_NEXT`),
SVG rellenos (no de trazo como los íconos de tipo del punto 45 — un botón
de play necesita peso visual para reconocerse de un vistazo, forma
estándar tipo Material "play"/"pause"/"skip") con un trazo fino adicional
(`stroke-linejoin="round"`) para que no se sientan un ícono de librería
genérico. Reemplazan el contenido de los botones en LOS DOS reproductores
que tiene la app (el simple de "Fuelle", con un solo botón de play/pausa, y
el de escala/arpegio, con anterior/play/siguiente) — son casos separados en
el código (ver comentario del punto 14) así que hubo que tocar ambos. Cada
lugar que antes hacía `playBtn.textContent = '▶'/'⏸'` pasa a
`playBtn.innerHTML = ICON_PLAY/ICON_PAUSE` (un `<svg>` no se puede asignar
con `textContent`). El botón "▶ 40/60/80" para reproducir un audio de
referencia (ver punto 20) NO se tocó — no fue parte del pedido (que hablaba
puntualmente de "play, retroceder y avanzar", el transporte principal) y es
un control chico/secundario distinto.

**Decisión — nivel junto al título (`library.js` + `styles.css`, solo
Biblioteca):**
- Nueva fila `.card-title-row` (flex, `justify-content: space-between`)
  envolviendo `.card-title` + `nivelBadge(ex.nivel)` — el nivel se sacó de
  `.card-meta` y se movió acá.
- `.card-meta` ahora arma un solo renglón de texto plano para tipo +
  articulación (`"${TIPO_LABEL[tipo]} / ${ARTICULACION_LABEL[articulacion]}"`,
  con el ícono de tipo del punto 45 adelante, envuelto en `<span
  class="meta-tipo">` para que el ícono y el texto queden alineados) en vez
  de dos `<span class="badge">` separados — los ejercicios de tipo "Fuelle"
  (sin articulación) muestran solo el tipo. Si el ejercicio pertenece al
  grupo especial "Arpegios menores" (ver puntos 15/38), el nombre del grupo
  se agrega al final de ese mismo renglón (`· Arpegios menores`) en vez de
  un tercer badge aparte. La duración y la cantidad de pasos, que ya
  estaban, quedan con un separador "·" delante para no leerse pegadas al
  texto de tipo/articulación (antes ese espacio lo daba el borde de la
  badge-pill que ahora no está).
- "Hoy" (`today.js`) no se tocó: ahí no tiene sentido repetir el nivel por
  fila (todos los ejercicios del día ya son del nivel del perfil activo).

**Por qué:** juntar tipo+articulación en un renglón de texto plano (en vez
de dos badges) es lo que de verdad libera espacio horizontal para que el
nivel quepa junto al título sin que la tarjeta necesite una tercera línea —
mover el nivel solo, sin tocar lo demás, no alcanzaba por espacio. Reusar
`tipoIcon()` (ya separado de `tipoBadge()` en el punto 45 para poder
exportarlo suelto) evita duplicar la definición de los 3 SVG de tipo.

**Verificado en el navegador:** con un ejercicio de prueba nivel "Avanzado",
tipo "Arpegio", articulación "Staccato", se confirmó en Biblioteca el
renglón `Prueba layout tipo` con la insignia "⊖ AVANZADO" a la derecha del
nombre, y el renglón de abajo mostrando "⁘ Arpegio / Staccato · 1 min · 1
paso" tal como se pidió. En Práctica se confirmó que los 3 íconos de
transporte nuevos se ven (no glyphs de texto) y que tocar play cambia
correctamente al ícono de pausa y arranca la cuenta de entrada. El
ejercicio de prueba se borró de `localStorage` al terminar.

## 47. Separador "fuelle" más marcado, con puntitos tipo botones de bandoneón en los extremos

**Pedido:** afinar el separador del punto 45 (probado ya en el dispositivo
real, no solo en el navegador): que los pliegues se noten más pronunciados
(antes el vaivén era muy sutil), y que en cada extremo aparezcan 3 puntitos
verticales chicos — como los puntos del ícono de "Arpegio" del punto 45,
pero más chicos y en vertical — simulando los botones del bandoneón a los
costados del fuelle.

**Decisión (`index.html` + `styles.css`):**
- Las 4 polylines pasan de una amplitud de vaivén de ~1.2px (sobre un
  `viewBox` de 12 de alto) a ~6px sobre un `viewBox` de 24 — el doble de
  alto para que el pliegue más marcado tenga lugar sin verse recortado — más
  `stroke-width` (1 → 1.3) y `stroke-linecap="round"` para que cada pliegue
  se vea más "macizo". El contenedor (`.fuelle-divider`) pasa de 12px a 18px
  de alto y de opacidad 0.6 a 0.7 para acompañar.
- 6 círculos nuevos (`<circle>`, radio 1.7, relleno `var(--gold)`): 3
  apilados en vertical en cada extremo del SVG (x≈7 y x≈393 sobre un ancho
  de 400), a la misma altura que el fuelle — el dorado los hace leerse como
  un detalle metálico (botonera) y no como parte del propio trazo del
  fuelle, que sigue en `var(--text-faint)`.
- No hizo falta tocar el CSS de `body.is-player .fuelle-divider { display:
  none }` (punto 41): sigue ocultándose igual en Práctica horizontal, el
  cambio es solo de contenido del SVG.

**Por qué:** el pedido puntual pedía más contraste visual en dos ejes
distintos (amplitud del pliegue, y un elemento nuevo en los extremos) — se
resolvió cada uno con la herramienta más directa: subir la amplitud de las
polylines existentes para lo primero, agregar elementos nuevos (círculos)
para lo segundo, sin tocar la estructura general del separador (sigue
siendo un único SVG insertado una vez en `index.html`, visible en todas las
pantallas).

**Verificado en el navegador:** en Hoy y Biblioteca se confirmó visualmente
que el vaivén es notoriamente más marcado que antes y que los 6 puntitos
dorados aparecen apilados en ambos extremos, a la misma altura que el
fuelle.

## 48. Bandoteca, botones del fuelle afuera de las ondas, título centrado de verdad, e insignia de nivel sin ícono

**Pedido:** 4 ajustes puntuales, todos sobre cosas ya probadas en el
dispositivo real. (1) Renombrar "Biblioteca" a "Bandoteca". (2) Que las
líneas del fuelle (punto 47) no atraviesen los 3 puntitos de los extremos —
tienen que leerse como los botones del instrumento, afuera del fuelle en
sí, no una decoración más sobre la misma línea. (3) "Hoy"/"Bandoteca" en el
topbar se ven corridos levemente a la izquierda del centro real. (4) En
Biblioteca, sacar el ícono de disco de pesas de la insignia de nivel (punto
45) y dejar solo la palabra ("Avanzado", etc.) — "así sacamos lo que vaya
sobrando".

**Decisión — "Bandoteca" (`app.js` + `index.html`):** cambia el texto
visible nada más — `ROUTES.biblioteca.title` (usado por `topbarTitle`) y
el `.tab-label` de la barra inferior. La ruta interna (`#/biblioteca`), el
nombre del archivo (`library.js`) y las claves de `localStorage` no
cambian — es un cambio de nombre visible, no del modelo de datos ni de las
URLs.

**Decisión — botones del fuelle afuera de las ondas (`index.html`):** las 4
polylines pasaban de `x=0` a `x=400` (todo el ancho del SVG, cruzando por
debajo de los puntitos en `x≈7`/`x≈393`); ahora van de `x=26` a `x=374`
—dejan un margen limpio a cada lado— y los puntitos se corrieron un poco
más afuera (`x=9`/`x=391`) para que quede un hueco visible entre el fuelle
y la botonera, en vez de que se superpongan.

**Decisión — título centrado (`app.js`):** la causa era que `.topbar-spacer`
(un `<span>` de 44px que existe solo para balancear el ancho del botón
"Volver" cuando se muestra) quedaba siempre visible, incluso en las
pantallas donde `backBtn` está `hidden` — con `backBtn` fuera del flujo
(`display:none`) pero el spacer de 44px todavía ocupando espacio a la
derecha, el `<h1>` (que es `flex:1; text-align:center`) quedaba centrado
respecto de una caja recortada 44px del lado derecho, no del ancho real del
topbar — el texto terminaba corrido a la izquierda. Se agregó
`topbarSpacer.hidden = backBtn.hidden` en `render()`, junto al lugar donde
ya se decidía `backBtn.hidden` — así los dos aparecen o desaparecen juntos
y el título queda centrado en el ancho completo cuando no hay botón
"Volver" que balancear (Hoy, Bandoteca, Nuevo, Perfil), e igual que antes
en las pantallas que sí lo tienen (Práctica, Editar).

**Decisión — insignia de nivel sin ícono (`ui.js`):** se sacó
`NIVEL_PLATE_ICON` (la constante del disco de pesas) y su uso en
`nivelBadge()`, que vuelve a ser solo `<span class="badge
badge-${nivel}">${NIVEL_LABEL[nivel]}</span>` — la constante en sí también
se borró (no quedó código muerto). Los íconos de TIPO (`TIPO_ICON`,
escalerita/puntos/fuelle) no se tocaron — el pedido fue puntual sobre el
ícono de nivel.

**Por qué (el centrado, en particular):** el bug era invisible leyendo el
CSS solo (`.topbar-title { flex:1; text-align:center }` se ve correcto
aislado) — apareció recién al ver `backBtn`/`topbar-spacer` como el PAR
asimétrico que son: uno de los dos elementos que flanquean el título se
sigue mostrando aun cuando el otro no. La solución más chica es tratarlos
como el par que siempre debieron ser: se muestran juntos, se ocultan
juntos.

**Verificado en el navegador:** se confirmó visualmente en Hoy y Bandoteca
que el título quedó centrado de verdad (antes corrido a la izquierda), que
la pestaña inferior dice "Bandoteca", que los puntitos del fuelle ya no
tienen ninguna línea pasando por encima, y que la insignia de nivel de un
ejercicio de prueba ("Principiante") se ve sin el círculo, solo la
palabra. El ejercicio de prueba se borró de `localStorage` al terminar.

## 49. Motivo de fondo "fuelle" también en la tabbar inferior

**Pedido:** que el zócalo inferior (la barra de "Hoy"/"Bandoteca"/"Nuevo"/
"Perfil") tenga también un motivo ondulado de fondo, como el fuelle del
separador del topbar (puntos 45/47/48) — sutil, con líneas oscuras, sin
perder la distinción entre las 4 categorías.

**Decisión (`styles.css`, `.tabbar`):** a diferencia del separador del
topbar (un `<svg>` real insertado en `index.html`), acá el motivo va como
`background-image` con un `data:image/svg+xml` — 3 polylines plegadas
(mismo estilo zigzag que el resto de la familia "fuelle") en negro
translúcido (`rgba(0,0,0,0.35)`, bien sutil) estirado con `background-size:
100% 100%` para cubrir el alto real de la barra sea cual sea. Va como
fondo del elemento (`background-image`, no un `<div>` posicionado encima)
a propósito: un fondo SIEMPRE pinta detrás del contenido normal del
elemento, así no hace falta pelear con z-index para que quede detrás de
los 4 `.tab-btn` — la alternativa (un `<div>` con `position:absolute`
suelto adentro de `.tabbar`) de hecho HABRÍA pintado por ENCIMA de los
`.tab-btn` no posicionados, según el orden de pintado de CSS (los
descendientes posicionados sin z-index pintan después que los
no-posicionados) — un detalle no obvio que se dejó anotado en el propio
comentario del CSS para no repetir el error a futuro.
- No se usó ninguna variable de color (`var(--border)`, etc.): un `data:`
  URI es una cadena de texto plana insertada en la hoja de estilos, no se
  resuelve como CSS real — `var()` no funciona ahí. `rgba(0,0,0,0.35)` da
  el mismo resultado ("línea oscura, sutil") sin depender de qué tono
  exacto tenga `--border`/`--border-soft` en este momento, y sigue
  funcionando igual si esos tokens cambiaran en el futuro.

**Por qué no reusar el `<svg>` del punto 47 tal cual:** ese vive en
`index.html`, una sola vez, DENTRO del `<header>` — insertarlo también en
`.tabbar` hubiera significado duplicar el mismo bloque de marcado en dos
lugares de `index.html` (topbar y tabbar) para un efecto puramente visual.
Un `background-image` en CSS logra el mismo motivo con un solo cambio, en
un solo archivo, sin tocar `index.html` de nuevo.

**Verificado en el navegador:** se confirmó visualmente en Hoy que el
motivo ondulado aparece de fondo en la tabbar, sutil (no compite con el
texto), y que las 4 etiquetas siguen perfectamente legibles encima.

## 50. Bug real: íconos de transporte invisibles en iPhone (sin `width`/`height`) + volumen de metrónomo/audio separados en 2 botones

**Reporte del usuario:** los íconos de play/anterior/siguiente (punto 46)
no se veían en su iPhone, pese a andar bien en este entorno de
automatización — un caso real de "probado en el navegador de acá, pero no
en el dispositivo real" (ver punto 33 y otros: esta es otra instancia del
mismo patrón recurrente del proyecto).

**Causa raíz encontrada:** `ICON_PLAY`/`ICON_PAUSE`/`ICON_PREV`/`ICON_NEXT`
(punto 46) son `<svg>` sin atributos `width`/`height` propios, y no hay
ninguna regla CSS que les dé un tamaño (a diferencia de `TIPO_ICON` en
`ui.js`, que sí tenía `width="13" height="13"` explícito desde el punto 45
— por eso esos íconos sí se veían bien en todos lados). Un `<svg>` sin
tamaño propio ni CSS que lo fije cae al tamaño intrínseco por defecto del
navegador (300×150 según el spec) — Chrome/el navegador de este entorno de
automatización aparentemente lo escala para que quepa en el botón
igual, pero Safari/iOS lo respeta más al pie de la letra: el resultado es
un ícono roto o recortado a un pedazo en blanco dentro del botón de 44-72px,
que se percibe como "no se ve nada".

**Decisión:** se agregó `width="1em" height="1em"` a los 4 SVG. `1em` (no
un valor fijo en `px`) es a propósito: escala solo según el `font-size` del
botón que lo contiene (`.icon-btn` usa `1.3rem`, `.icon-btn-lg` —el botón
grande de play— `1.8rem`), el mismo mecanismo que ya usaban los glyphs de
emoji que reemplazaron (el tamaño de un carácter de texto también sigue el
`font-size`) — así el ícono grande y los chicos quedan proporcionados entre
sí sin necesitar dos constantes de ícono por tamaño.

**Por qué no se detectó en verificaciones anteriores:** el punto 46 sí se
"verificó en el navegador" (Chrome, vía este entorno), pero ese navegador
resulta ser tolerante con este caso específico — jamás iba a reproducir un
bug que depende del motor de renderizado exacto de Safari. Confirma, una
vez más (ver puntos 17 y 33), que ninguna cantidad de verificación en este
entorno reemplaza probar contra el dispositivo real cuando el bug depende
del navegador en sí.

---

**Pedido aparte (mismo turno):** separar el único botón "⚙ Volumen" (punto
35, que desplegaba juntos el volumen del metrónomo y el del audio de
demostración) en 2 botones independientes, uno por control, en el mismo
renglón — que cada uno despliegue/oculte solo su propio volumen.

**Decisión (`player.js` + `styles.css`):**
- `#advancedToggle`/`#advancedPanel` (un botón, un panel con los 2
  controles adentro) se reemplazan por `#metroVolToggle`/`#demoVolToggle`
  (`.volume-toggle-row`, `display:flex` para que queden lado a lado) más
  `#metroVolBlock`/`#demoVolBlock` como bloques independientes, cada uno
  con su propio estado abierto/cerrado (`metroVolOpen`/`demoVolOpen`,
  antes había un solo `advancedOpen`) sincronizado por `syncVolumeToggles()`
  (antes `syncAdvancedVisibility()`).
- El estado "activo" (desplegado) de cada botón se muestra con la misma
  clase `.active` que ya usan los chips de esta pantalla (fondo dorado) en
  vez de cambiar el texto del botón como hacía el botón único ("⚙ Volumen"
  → "⚙ Ocultar volumen") — con 2 botones, cambiar el texto de cada uno por
  separado hubiera sido más ruido visual que una sola marca de "activo"
  consistente con el resto de la app.
- `metroVolToggle.hidden = isManual` (además de `metroVolBlock.hidden`, que
  ya se ocultaba en modo manual desde el punto 32): en modo manual no suena
  el metrónomo, así que ahora tampoco se muestra el botón para desplegar su
  volumen — antes quedaba el control de acento... digo, el bloque de
  volumen simplemente vacío/oculto dentro del panel único; con 2 botones
  independientes, dejar el botón visible sin nada que desplegar hubiera
  sido confuso.
- Arrancan abiertos o cerrados por defecto con el mismo criterio que el
  panel único (colapsados en horizontal, expandidos en vertical) — ahora
  aplicado a cada uno por separado, pero con el mismo valor inicial
  (`!isLandscapeNow()`) para los dos, así que en la práctica arrancan
  siempre iguales entre sí; lo nuevo es que a partir de ahí cada toque los
  desacopla.
- Se sacó `.volume-row` (el `display:flex; flex-direction:column` que
  agrupaba los 2 bloques dentro del panel único) — ya no hace falta, cada
  bloque es independiente. `#metroVolBlock`/`#demoVolBlock` llevan su
  propio `margin-bottom` en vez de heredarlo del `gap` del wrapper que ya
  no existe.

**Verificado en el navegador:** con un ejercicio de prueba de tipo escala,
se confirmó que tocar "Metrónomo" despliega solo su slider (Audio demo
queda cerrado), que tocar "Audio demo" después despliega el suyo SIN
cerrar el de Metrónomo (los dos pueden estar abiertos a la vez), y que el
estado "activo" de cada botón (fondo dorado) refleja correctamente si está
desplegado. El ejercicio de prueba se borró de `localStorage` al terminar.

## 51. Bug real: saltar de paso a mano en pleno play no resincronizaba el metrónomo

**Reporte del usuario:** si mientras el metrónomo está sonando (dentro de
un compás, ej. en el tiempo 2 de 4) el usuario salta de paso a mano (⏮/⏭ o
un cuadradito), el paso cambia pero el metrónomo sigue sonando con la fase
vieja — el próximo click cae en el tiempo que le tocaba al PASO ANTERIOR
(ej. sigue por "tiempo 3, tiempo 4" de la cuenta vieja) en vez de arrancar
de nuevo en el tiempo 1 del paso nuevo.

**Causa raíz:** `goTo()` (llamado tanto por el avance automático al llegar
al final de un compás como por los saltos manuales del usuario) reseteaba
`beatsElapsedInPaso` a 0 — así lo dejó el punto 35 — pero nunca tocaba el
reloj del propio metrónomo (`metronome.js`, `nextNoteTime`/`beatCount`),
que sigue una cuenta continua e independiente desde que arrancó a sonar.
Reiniciar el CONTADOR de la app sin reiniciar el RELOJ que genera los
clicks solo cambia la etiqueta que se le pone al próximo click ("ahora
contá como tiempo 1"), no cuándo va a sonar — y ese "próximo click" seguía
siendo el que le correspondía al compás viejo. Para el avance AUTOMÁTICO
(el que dispara `handleBeat` al llegar naturalmente al último tiempo del
compás) esto nunca fue un problema: ahí el próximo click YA es,
naturalmente, el tiempo 1 del paso siguiente, así que no hacía falta tocar
el reloj. El bug es específico del salto manual, que puede pasar en
CUALQUIER punto del compás.

**Decisión:** `goTo()` gana un segundo parámetro, `{ manual: false }` por
defecto. Cuando se llama con `manual: true` (desde los handlers de ⏮/⏭ y
de los cuadraditos — no desde el avance automático de `handleBeat`, que
sigue llamando `goTo()` sin ese flag) y el reproductor está efectivamente
sonando en modo automático (`phase === 'playing' && mode === 'auto'`), se
reinicia el metrónomo de verdad: `metronome.stop()` seguido de
`metronome.start({ bpm, accentEvery: acentoCada, volume: metronomeVolume,
onBeat: handleBeat })` — esto resetea `nextNoteTime` a "ahora + 60ms" y
`beatCount` a 0 adentro de `metronome.js`, así el próximo click suena
prácticamente de inmediato y es, de verdad, el tiempo 1 del paso nuevo. Los
saltos del modo manual (toque en la partitura, teclas/pedal — ver puntos 32
y 36) no necesitaron ningún cambio: ya estaban guardados por
`if (mode !== 'manual') return;` en sus propios handlers, y de todos modos
en modo manual no hay metrónomo sonando (la condición `mode === 'auto'`
adentro de `goTo` los excluye igual si alguna vez se les agregara el flag).

**Por qué no se detectó antes:** el punto 35 (que agregó los cuadraditos
tocables) se verificó saltando "a mitad de una reproducción activa" y
confirmando que "el total de segmentos... cambió al instante... y el
conteo arrancó de 0" — esa verificación es real y correcta, pero se quedó
corta: confirma que el CONTADOR de la app arranca de 0, no que el AUDIO
también resincroniza. Hacía falta el reporte de un uso real, con el oído
puesto en el metrónomo mientras se salta, para notar la diferencia entre
"la barra de progreso se resetea" y "el click realmente vuelve a caer en
el tiempo 1".

**Tradeoff aceptado:** `metronome.stop()` no cancela los clicks de audio
que ya estaban agendados en el motor de Web Audio hasta
`SCHEDULE_AHEAD_SEC` (120ms) hacia adelante — en el peor caso, un click
"viejo" ya agendado justo antes del salto todavía se alcanza a escuchar,
superpuesto con el reinicio. Es un margen de hasta 120ms, prácticamente
imperceptible, y muy preferible a que el metrónomo quede desincronizado
durante el resto del paso — no se agregó lógica extra a `metronome.js`
para cancelar esos osciladores puntuales porque el costo/beneficio no lo
justifica para un caso tan acotado.

**Verificado en el navegador:** con un ejercicio de prueba de 3 pasos
(compás 4/4, 2 compases por paso), se arrancó el play, se esperó a estar a
mitad del Paso 2, y se tocó el cuadradito del Paso 3 — el paso cambió y la
cuenta de tiempos completados volvió a arrancar desde cerca de 0 (no
continuó desde donde iba el Paso 2), sin errores en consola. El ejercicio
de prueba se borró de `localStorage` al terminar.

## 52. Íconos propios para "Metrónomo" (reemplaza 🔔) y "Audio demo" (reemplaza 🎧, mini-bandoneón)

**Pedido:** el usuario mandó un dibujo a mano (un zigzag de varios picos con
3 puntitos verticales en cada extremo) pidiendo dos cosas: (1) un trazo
propio, consistente con el resto de los íconos nuevos, para la campanita
🔔 del botón "Metrónomo"; (2) un símbolo chico de bandoneón —basado en ese
mismo dibujo— para reemplazar los auriculares 🎧 del botón "Audio demo".

**Decisión (`player.js`):**
- `ICON_METRONOME`: pictograma de metrónomo de verdad (no relacionado con
  el zigzag) — cuerpo trapezoidal (la caja del metrónomo) con un brazo
  diagonal simulando el péndulo a mitad de oscilación y un puntito en el
  pivote. Trazo (`stroke`), no relleno, como el resto de la familia de
  íconos (puntos 45/46) — no como los íconos de transporte del punto 46,
  que son rellenos a propósito por tratarse de controles primarios que
  necesitan más peso visual.
- `ICON_BANDONEON_MINI`: en vez de inventar un dibujo nuevo desde cero, es
  el mismo motivo "fuelle" que ya usan el separador del topbar (puntos 45/
  47/48) y el ícono de tipo "Fuelle" (punto 45) — zigzag plegado + 3
  botones a cada lado— pero miniaturizado a 24×24 para caber al lado de un
  texto de botón. Reusar el motivo en vez de dibujar el bandoneón "de
  frente" otra vez mantiene una sola idea visual para "esto es un fuelle/
  bandoneón" en toda la app, en lugar de dos símbolos distintos que
  signifiquen lo mismo.
- Los dos siguen el mismo patrón de `width="1em" height="1em"` que ya
  corrigió el punto 50 (sin esto, roto/invisible en Safari) — se
  agregaron junto a `ICON_PLAY`/etc. en el mismo bloque de constantes, no
  sueltos en otro lado del archivo.
- Solo se usan en `#metroVolToggle`/`#demoVolToggle` (los dos únicos
  lugares donde aparecían 🔔/🎧 en todo el código) — no hay otro botón de
  volumen en la app que necesitara el mismo cambio.

**Verificado en el navegador:** con un ejercicio de prueba de tipo escala,
se confirmó que ambos íconos se ven junto a "Metrónomo"/"Audio demo" (ni
rotos ni vacíos), sin errores nuevos en consola. El ejercicio de prueba se
borró de `localStorage` al terminar.

## 53. Íconos de metrónomo/audio demo más grandes; mini-bandoneón con un pliegue más y curvado hacia arriba

**Pedido:** afinar los 2 íconos del punto 52, ya probados. (1) Que sean más
grandes en relación al botón, para notarse más. (2) Al mini-bandoneón
puntualmente: agregarle un pliegue más, y curvar el zigzag hacia arriba
—picos cada vez más altos de izquierda a derecha, como en el dibujo
original del usuario— en vez de un zigzag parejo, simulando el fuelle
doblado/comprimido.

**Decisión (`player.js`):**
- Tamaño: `width`/`height` pasan de `1em` a `1.6em` en los dos íconos —
  siguen atados al `font-size` del botón (`.volume-toggle`, ver punto 50:
  por qué `em` y no un `px` fijo), solo que ahora el ícono es
  deliberadamente más grande que la altura de línea del texto en vez de
  calzar 1:1 con ella.
- Mini-bandoneón: pasa de 5 puntos/4 segmentos (3 picos, 2 valles) a 6
  puntos/5 segmentos (3 picos, 3 valles) — el pliegue de más pedido — y los
  3 picos ya no están a la misma altura: suben de izquierda a derecha
  (`y=10 → 7 → 4`), los valles acompañan la misma tendencia (`y=19 → 17 →
  15`) — el conjunto se lee como una tira plegada que se va curvando hacia
  arriba, no un zigzag repetitivo. El `viewBox` pasa de `24×24` a `30×24`
  (más ancho, para que el pliegue extra entre sin apretar los demás) y los
  2 grupos de 3 puntitos de los extremos se reacomodaron en altura para
  seguir estando centrados en el tramo de zigzag que tienen al lado (el
  extremo izquierdo, más bajo, con puntitos en `y=8/13.5/19`; el derecho,
  más alto, en `y=4/9.5/15`) en vez de compartir la misma altura fija de
  antes — así siguen leyéndose como "los botones de ESE lado" y no quedan
  descolgados del dibujo.
- El ícono de metrónomo (el otro símbolo del punto 52) solo cambió de
  tamaño (`1em` → `1.6em`), no de forma — el pedido de "curvarlo" era
  específico del mini-bandoneón.

**Verificado en el navegador:** con un ejercicio de prueba de tipo escala,
se confirmó que los 2 íconos se ven notoriamente más grandes junto a
"Metrónomo"/"Audio demo" sin romper el layout del botón, y que el
mini-bandoneón muestra el zigzag de 3 picos ascendentes con los 2 grupos de
puntitos a los costados. El ejercicio de prueba se borró de `localStorage`
al terminar.

## 54. Los 3 audios de referencia (40/60/80) se mudan adentro del botón "Audio demo"

**Pedido:** la sección "Audio de demostración" (los 3 slots 40/60/80 —
subir/reproducir/borrar, ver punto 20) vivía siempre visible, aparte de los
botones de volumen del punto 50. El pedido: que quede adentro del botón
"Audio demo" — al desplegarlo, que se vean juntos el volumen Y los 3
audios; al tenerlo cerrado, que no se vea nada de eso.

**Decisión (`player.js`):** el bloque `<div class="section-title">Audio de
demostración</div><div class="audio-row" id="audioRow"></div>` se movió de
punta a punta del HTML (estaba después de `#demoVolBlock`, como su propia
sección siempre visible) a DENTRO de `#demoVolBlock`, después del slider de
volumen. No hizo falta tocar ni una línea de JS: `audioRow` se sigue
consultando con el mismo `container.querySelector('#audioRow')` de
siempre (el id no cambió, solo su posición en el árbol), `paintAudioRow()`
sigue pintando ahí igual, y como `#demoVolBlock` ya se ocultaba/mostraba
completo según `demoVolOpen` (punto 50), los audios ahora se ocultan/
muestran gratis junto con el volumen, sin ningún flag ni lógica nueva.

**Por qué fue un cambio de una sola línea de HTML:** el punto 50 ya había
dejado `#demoVolBlock` como un contenedor independiente con su propio
`hidden` controlado por un solo botón — mover contenido ADENTRO de un
contenedor que ya se oculta/muestra como unidad es gratis; si el volumen y
los audios todavía hubieran estado en la estructura vieja del panel único
(punto 35, antes del punto 50), este pedido hubiera necesitado tocar la
lógica de visibilidad también.

**Verificado en el navegador:** con un ejercicio de prueba de tipo escala,
se confirmó que con "Audio demo" cerrado no se ve ni el volumen ni los 3
audios, y que al abrirlo aparecen los dos juntos ("Volumen del audio de
demostración" + "AUDIO DE DEMOSTRACIÓN" con +40/+60/+80) debajo del botón.
El ejercicio de prueba se borró de `localStorage` al terminar.

## 55. Bug real: el marco de la partitura cambiaba de tamaño entre pasos en vertical

**Reporte del usuario:** mandó 2 capturas de su iPhone en vertical (pasos
distintos de un mismo ejercicio de "Arpegios menores") mostrando que el
recuadro blanco de la partitura tenía una altura visiblemente distinta
entre una y otra. Preguntó si tenía que cortar/preparar sus imágenes a un
tamaño exacto para poder implementar el deslizamiento entre pasos que
había pedido antes (ver el intercambio previo sobre esa idea).

**Corrección a lo que se había contestado antes:** la respuesta anterior
("el marco ya es un tamaño fijo, no hace falta preparar las imágenes") era
CORRECTA para Práctica horizontal, pero INCOMPLETA — no se había revisado
la regla base (fuera de la media query de horizontal). El usuario detectó
el problema real con evidencia (capturas del dispositivo), no solo
describiéndolo — otro caso más de "hace falta el dispositivo real" (puntos
17, 33, 50, 51).

**Causa raíz:** `.score-frame` (la caja blanca) tenía `max-height: 60vh`
pero ninguna altura mínima ni fija — sin una, la caja se ajusta al tamaño
YA renderizado de la imagen (`display:flex` + `object-fit:contain` en el
`<img>`), así que cada imagen, según su proporción original, terminaba
dejando la caja más alta o más baja. En horizontal esto no se nota porque
`body.is-player .player-wrap.escala-arpegio .score-frame` fuerza `height:
100%` dentro de una celda de grid con alto ya fijo (puntos 30 y 35) — pero
esa regla vive DENTRO de `@media (orientation: landscape)`, nunca se aplicó
en vertical.

**Por qué `max-height` y no una altura fija desde el principio:** un
comentario viejo en el propio CSS explica que el marco tenía antes un
aspect-ratio fijo (4:3) y se sacó porque dejaba franjas en blanco feas
cuando la proporción de la imagen no coincidía con esa proporción fija —
ese cambio resolvió el problema de las franjas, pero a costa de introducir
este otro (tamaño inconsistente entre pasos), sin que nadie lo notara hasta
ahora.

**Decisión:** `.score-frame` pasa de `max-height: 60vh` a `height: 60vh` —
una altura fija de verdad, no un tope. Esto por sí solo NO reintroduce el
problema de las franjas en blanco que motivó el cambio original, porque
para cuando se tomó esa decisión (mucho antes del punto 31) todavía no
existía el sistema de normalización/maximización automática
(`computeContentTransform` en `util.js`, puntos 31 y 33) que agranda cada
imagen para llenar el marco lo más posible sea cual sea su proporción — ese
sistema ya estaba resolviendo el problema de las franjas por otro lado,
independientemente de si el marco es fijo o no. Con las dos piezas juntas
(marco fijo + maximización automática) se resuelven los dos problemas a la
vez.

**Verificado en el navegador (con imágenes reales de proporciones
extremas, no solo con los placeholders):** los placeholders SVG que genera
la app ya vienen con proporciones parejas entre sí (ver punto 31), así que
no hubieran mostrado el bug ni confirmado el arreglo. Se generaron 2 imágenes
de prueba bien distintas (900×260 "ancha" y 280×780 "alta", con contenido
real dibujado, no en blanco, para que la detección de "tinta" de la
normalización tenga algo que medir) vía `System.Drawing`/PowerShell, se
inyectaron directo en `localStorage` (`fuelle:customImages:v2`, mismo
formato que usa `store.setCustomImage`) como los 2 pasos de un ejercicio de
prueba, y se midió `.score-frame.getBoundingClientRect()` en cada paso:
**235.6 × 256.65px en los dos casos, idéntico**, antes de este cambio el
alto variaba entre pasos. Los datos de prueba (ejercicio + imágenes) se
borraron de `localStorage` al terminar.

## 56. Recorte automático del PDF de partitura ("un molde") + Arpegios menores pasa de 24 a 12 pasos

**Pedido:** a raíz del punto 55, el usuario preguntó si convenía recortar
él mismo cada imagen "con un molde" para que el margen del pentagrama caiga
siempre igual. Aclaró que todas sus imágenes son capturas de pantalla de un
PDF que él mismo armó (no fotos), y compartió ese PDF (ejercicio "Arpegios
menores nota repetida", 6 páginas). Pidió automatizar el recorte en vez de
seguir cortando a mano.

**Decisión:** se escribió un script en Python (`auto_crop_partitura.py`,
fuera del repo/app — es una herramienta de autoría que se corre una vez por
PDF, no algo que la PWA necesite en runtime) que:
1. Rasteriza cada página del PDF a 216dpi (`pymupdf`).
2. Detecta la posición real de cada pentagrama por página: busca filas de
   píxeles casi 100% oscuras que cruzan todo el ancho (una línea de
   pentagrama), las agrupa de a 5 (un pentagrama) y las agrupa de a 2
   (violín+bajo = un sistema), separando sistemas distintos por el hueco
   más grande entre pentagramas consecutivos (el hueco violín→bajo de un
   mismo sistema es siempre mucho menor que el hueco entre sistemas —el
   punto de corte se calcula buscando el mayor salto entre huecos
   ordenados, no un umbral fijo a mano).
3. Recorta cada sistema con un margen fijo (120px arriba para el símbolo de
   fuelle ⊓/V y los números de dedos, 50px abajo para notas con líneas
   adicionales, definido una sola vez a partir de inspeccionar varias
   páginas), usando el ancho real del contenido de ese sistema.
4. Apila de a 2 sistemas consecutivos (⊓ + V de la misma tonalidad) en una
   sola imagen final = 1 paso.

De paso, `generateArpegioMenorPasos()` (`data.js`) pasó de generar 24 pasos
(12 tonalidades × abriendo/cerrando, cada dirección una imagen separada) a
generar 12 (una tonalidad por paso, con abriendo y cerrando ya combinados
en la imagen). Se actualizó todo el texto visible que mencionaba "24 pasos"
o "abriendo/cerrando" como pasos separados (botón, subtítulo, ayudas de
campo) en `newExercise.js`, más los comentarios en `theory.js` y `README.md`.

**Por qué:** al medir la posición de los 8 pentagramas (4 sistemas × 2)
en las 6 páginas del PDF del usuario, salieron **prácticamente idénticas
página a página** (variación de ±1-2px, ruido de rasterizado, no del
contenido) — esperable porque es un PDF generado por software de notación
con una plantilla de página fija, no un escaneo. Eso permite un recorte
100% automático y consistente sin tocar coordenadas a mano por imagen, que
es justo lo que el usuario pedía con "un molde". Se prefirió detectar los
pentagramas en vez de usar coordenadas fijas para que el mismo script sirva
con cualquier PDF futuro del usuario hecho con el mismo flujo de trabajo,
aunque cambie el contenido musical.

Sobre 12 vs 24 pasos: el nombre del propio PDF ("12 pasos arp menor...") y
el pedido explícito del usuario señalaban que cada paso debía mostrar
abriendo+cerrando juntos (una imagen por tonalidad), pero el código real
generaba 24 (una imagen por dirección) — se le señaló la contradicción
antes de tocar nada y confirmó: 12 pasos, 2 sistemas apilados por imagen.
`direccion` (abriendo/cerrando) no se usaba en ningún otro lado del código
más que para armar la etiqueta del paso, así que el cambio es seguro (no
afecta metrónomo, audio ni nada del reproductor).

**Nota importante (no resuelta por este cambio):** las imágenes de cada
paso viven como `data:` URL en `localStorage` del dispositivo (ver
store.js), no como archivos del repo — no hay forma de "subirlas" desde
acá ni de tocar el ejercicio ya cargado en el iPhone del usuario de forma
remota. Las 12 imágenes finales se le entregaron al usuario (vía
`SendUserFile`) para que las suba a mano, una por paso, desde el
formulario de edición en su propio dispositivo — ahí es donde vive su
ejercicio real "Arpegios menores nota repetida".

**Verificado en el navegador:** con tipo "Arpegio" y nombre "Arpegios
menores", el botón "Generar" ahora crea exactamente 12 filas en la lista
de pasos (antes 24); sin errores de consola nuevos. El script se corrió de
punta a punta sobre el PDF real del usuario: generó 12 imágenes, las 12 de
exactamente el mismo tamaño en píxeles (1668×872), revisadas visualmente
varias (incluida la última página) sin que se cortara ningún número de
dedo, símbolo de fuelle ni nota grave.

## 57. Orden real de tonalidades del PDF (cromático, no de quintas) + vía para reemplazar las imágenes del ejercicio real

**Pedido:** el usuario pidió que directamente reemplace yo las imágenes del
ejercicio "Arpegios menores nota repetida" que ya tiene cargado (en vez de
subirlas él a mano), y aclaró el orden real de tonalidades de su PDF: "Am
hasta Abm... cada dos sistemas cambia de tonalidad Am, Bbm, Bm etc" —es
decir, cromático ascendente cubriendo toda la octava, no el orden de
quintas que traía `TONALIDADES_MENORES_12` desde el punto 15.

**Decisión:**
1. `TONALIDADES_MENORES_12` (`theory.js`) pasa de orden de quintas (La, Mi,
   Si, Fa#, Do#, Sol#, Reb, Lab, Mib, Sib, Fa, Do) a orden cromático
   ascendente (La, Sib, Si, Do, Do#, Re, Mib, Mi, Fa, Fa#, Sol, Lab),
   confirmado por el usuario. Es el único lugar donde se usa esta
   constante (`generateArpegioMenorPasos` en `data.js`), así que el cambio
   no afecta nada más.
2. Se corrigieron además dos textos que todavía mencionaban "abriendo" en
   ejemplos de etiqueta de paso (comentario de cabecera y placeholder del
   input de etiqueta en `newExercise.js`), que habían quedado del modelo
   viejo de 24 pasos (punto 56).
3. Como las imágenes viven en `localStorage` del dispositivo y no en el
   repo (nota del punto 56), la vía acordada para que YO reemplace las del
   ejercicio real (en vez de que el usuario las suba a mano) fue: el
   usuario exportó su backup completo desde Perfil y lo mandó por el chat.
   Se encontró ahí el ejercicio real: **"Arpegios menoress"** (nombre con
   una "s" de más, articulación "nota-repetida", `id`
   `custom-mtvy0usg-txotu8`) — ya tenía 12 pasos cargados a mano (Am, Bbm,
   Bm, Cm, C#m, Dm, Ebm, Em, Fm, F#m, Gm, Abm, el mismo orden cromático del
   punto 57), cada uno con su imagen vieja (la de margen inconsistente del
   punto 55) en `fuelle:customImages:v2`, keyeada por `paso.id`. Se escribió
   un script Python (`patch_backup.py`, fuera del repo) que abre el JSON
   del backup, reemplaza únicamente esas 12 entradas de imagen (por orden:
   `paso_01.png`→orden 0, … `paso_12.png`→orden 11) codificándolas en
   base64 como `data:image/png;base64,...`, y vuelve a escribir el backup
   completo. Se le devolvió el archivo resultante al usuario para que lo
   importe desde Perfil.

   Nota: hay un segundo ejercicio de arpegio ("Arpegios menore", sin la
   "s" final, articulación staccato) con la misma estructura de 12 pasos
   — no se tocó, no es el que el usuario pidió reemplazar. Además, NINGUNO
   de los dos tiene `grupoEspecial` seteado porque ninguno se llama
   exactamente "Arpegios menores" (ambos tienen errores de tipeo en el
   nombre) — `esArpegioMenorPorNombre()` exige coincidencia exacta (punto
   15/38), así que hoy no se agrupan en "Hoy". No se corrigió porque no fue
   lo que se pidió; queda señalado para si el usuario lo quiere arreglar.

**Por qué:** el orden de tonalidades no es un detalle cosmético — si no
coincide con el de las imágenes reales, cada paso queda etiquetado (y
ordenado en el selector de pasos del reproductor) con una tonalidad que no
es la que se ve en pantalla. Se verificó con el usuario antes de tocar el
código en vez de asumir que el orden de quintas original (heredado del
punto 15, anterior a tener el PDF real) era el correcto.

**Verificado en el navegador:** con el ejercicio de prueba "Arpegios
menores" (tipo Arpegio), el botón "Generar" produce las 12 etiquetas en el
input de cada paso en el orden exacto: La menor, Sib menor, Si menor, Do
menor, Do# menor, Re menor, Mib menor, Mi menor, Fa menor, Fa# menor, Sol
menor, Lab menor — coincide 1 a 1 con `paso_01.png`…`paso_12.png` del
punto 56 (que ya siguen el orden de páginas del PDF), así que esas 12
imágenes no necesitan reordenarse.

**Verificado el parche del backup real:** se comparó el JSON parcheado
contra el original — todas las demás keys de `localStorage` (progreso,
perfil, otros ejercicios, configuración de reproductor) quedaron
**byte a byte idénticas**; `fuelle:customExercises:v2` (pasos, etiquetas,
compases, orden) sin cambios; las imágenes del otro ejercicio de arpegio
("Arpegios menore", staccato) sin cambios. Se decodificaron las 12 imágenes
nuevas del backup parcheado y se comparó su hash SHA-256 contra el archivo
fuente correspondiente: **las 12 coinciden exactamente**, confirmando que
no hubo corrupción en la codificación base64.

## 58. Barra de práctica sincronizada con el metrónomo, corriendo sistema por sistema dentro de un mismo paso (1ra etapa)

**Pedido:** el usuario preguntó si, ahora que las imágenes tienen un molde
consistente (puntos 56/57), sería más fácil hacer un slide de la partitura
mientras corre el metrónomo. Pidió: (a) que el slide sea solo en modo
automático; (b) una barra vertical corriendo por el pentagrama en sincronía
con el metrónomo; (c) que se vincule también con los audios de demostración;
(d) que, como cada paso trae 2 sistemas apilados en una sola imagen (⊓
arriba/V abajo, ver punto 56), la barra esté en un solo sistema a la vez y
después pase al de abajo. Pidió explícitamente que se le preguntara todo lo
necesario antes de arrancar.

**Decisiones de diseño, todas confirmadas con el usuario antes de tocar
código:**
1. **Precisión de la barra:** se probó primero detectar automáticamente las
   barras de compás reales (misma técnica que la detección de pentagramas
   de los puntos 56/57) para que el cursor cayera exacto en cada división.
   La prueba sobre las imágenes reales del usuario **no dio resultados
   confiables** (contaba 4-6 compases donde el dato real cargado decía
   6-8, y arriba/abajo daban distinto cuando deberían coincidir) — las
   plicas y corcheas juntas de las semicorcheas forman columnas oscuras
   tan altas como una barra de compás real y confunden al detector. Se le
   mostró la comparación completa al usuario y, en vez de invertir más
   tiempo afinando un detector de confiabilidad incierta, se optó por
   **velocidad constante dentro de cada sistema** (un salto igual de la
   barra por cada tiempo del metrónomo, no por compás real).
2. **Vista mientras suena un sistema:** se muestran los 2 sistemas
   siempre visibles (no se recorta/hace zoom al activo) — el que no está
   sonando se atenúa (oscurece) y la barra corre solo sobre el activo.
3. **Compases por sistema:** hoy un paso combinado (⊓+V) tiene UN solo
   número de compases para las dos mitades juntas (heredado de cuando eran
   pasos separados). Como a veces arriba y abajo duran distinto (ej. un
   caso real con 7 compases totales, no partible a la mitad), se agregó un
   campo nuevo editable en vez de asumir siempre mitad y mitad — ver
   modelo de datos más abajo.
4. **Audio demo:** la barra usa el BPM del audio de referencia elegido
   (40/60/80) para su velocidad, con el mismo cálculo que ya usa el
   metrónomo — no lee el archivo de audio en sí (`currentTime`). *(Nota:
   esta 1ra etapa deja el enganche real con la reproducción del audio demo
   para una siguiente etapa — ver "Pendiente" más abajo.)*

**Modelo de datos (`data.js`):** nuevo campo opcional `paso.compasesAbajo`.
Si no está presente (`null`/`0`, el caso de TODOS los pasos viejos de 1
solo sistema), el paso se comporta exactamente igual que hoy — cero
impacto en datos existentes. Si está presente, `paso.compases` pasa a
significar "compases del sistema de ARRIBA" y el total (usado por
`pasoCompases()`, ya consumido por el cálculo de duración y por el
metrónomo) es la suma de los dos. Nuevos helpers: `pasoTieneDosSistemas()`,
`pasoCompasesArriba()`, `pasoCompasesAbajo()`.

**Formulario (`newExercise.js`):** cada fila de paso tiene un botón "+ La
imagen tiene 2 sistemas (⊓ + V)" que, al activarlo, parte el total actual a
la mitad como sugerencia editable (no definitiva) y muestra un segundo
stepper "Compases abajo (V)"; el primero pasa a etiquetarse "Compases
arriba (⊓)". Al apagar el toggle se restaura el total (arriba+abajo) en vez
de perderlo — se encontró y corrigió un bug real de esto durante las
pruebas (el total "encogía" al apagar, quedándose solo con la mitad de
arriba).

**Detección del límite entre sistemas (`util.js`, `detectSystemSplit()`):**
en vez de pedirle al usuario que marque dónde empieza cada sistema dentro
de la imagen, se detecta solo, del lado del cliente, con la misma idea que
la detección de pentagramas hecha fuera de la app para el recorte
automático (puntos 56/57) pero adaptada a canvas: se dibuja la imagen a un
canvas de análisis, se mide qué filas tienen "tinta" (no blancas) y se
busca el hueco horizontal en blanco más ancho que no esté pegado a los
bordes (eso sería margen, no separación). A diferencia de la detección de
barras de compás (que falló), esto SÍ es confiable: alcanza con encontrar
UN hueco grande, no muchas líneas finas en medio de notas y plicas densas.

**Reproductor (`player.js`):** la imagen de cada paso ahora se envuelve en
un contenedor nuevo (`.score-inner`) junto con 2 rectángulos de atenuado
(`.score-dim-top/bottom`) y la barra (`.score-cursor`) — el zoom
táctil/pellizco (`zoom.js`) ahora transforma ese contenedor en vez de la
imagen directo, así los overlays se mueven y escalan siempre junto con la
imagen real sin tocar `zoom.js` (`getTarget` genérico, ya recibía un
callback). Nuevo estado `systemIndex` (0=arriba, 1=abajo) además del
`index` de paso existente: `beatsElapsedInPaso`/`beatsPerPaso()` se
renombraron a `beatsElapsedInSistema`/`beatsPerSistema()` (leen
`compasesArriba`/`compasesAbajo` según `systemIndex`). En `handleBeat`: si
se completan los tiempos del sistema de arriba y el paso tiene 2 sistemas,
se salta al de abajo SIN cambiar de paso (mismo `index`, misma imagen,
`goTo` no se llama); recién al completar el de abajo (o en un paso de 1
solo sistema) se avanza al paso siguiente como ya hacía antes.

**Pendiente (fuera del alcance de esta 1ra etapa, señalado pero no hecho):**
- El slide/deslizamiento VISUAL entre la imagen de un paso y la del
  siguiente (lo que se pidió originalmente en la charla sobre esta idea,
  antes del punto 55) — hoy el cambio de paso sigue siendo instantáneo,
  como siempre. Esta etapa solo resuelve el salto de sistema DENTRO de un
  mismo paso/imagen.
- El enganche real de la barra con la reproducción del audio demo
  (`currentTime` del elemento `<audio>`) — por ahora la barra, si sonara
  un audio demo, tendría que calcularse por BPM como con el metrónomo, pero
  ese enganche todavía no está conectado al reproductor de audio demo en
  sí (`audioRow`/`data-play`).

**Verificado en el navegador:** ejercicio de prueba con 2 pasos, cada uno
con 2 sistemas de distinta duración (3+2 y 2+2 compases, compás 4/4). Se
inyectaron 2 imágenes reales (del punto 56) directo en `localStorage` y se
reprodujo en modo automático, inspeccionando el DOM en cada punto:
- Mientras sonaba el sistema de abajo del paso 1 (5 de 8 tiempos): barra en
  `left: 62.5%` (5/8 exacto), atenuado activo arriba, inactivo abajo,
  posición vertical de la barra coincidiendo con el rango del sistema de
  abajo detectado.
- Al completarse los 2 sistemas del paso 2, el reproductor avanzó
  correctamente a la pantalla de calificación ("¿Cómo te salió?"), igual
  que sin este cambio.
- Sin errores de consola nuevos. Ejercicio e imágenes de prueba borrados de
  `localStorage` al terminar.

## 59. La barra de práctica ahora cae exacta en cada compás real (detección de barras de compás, 2do intento — esta vez funcionó)

**Reporte del usuario:** probó el punto 58 en su iPhone real y, aunque
funcionaba (barra + atenuado visibles), la precisión no servía: "no es para
nada precisa en cuanto a los tiempos de metrónomo... se debería posar
exactamente sobre los tiempos fuertes del compás y va cayendo de manera
azarosa en diferentes lugares" — exactamente el límite conocido y aceptado
en el punto 58 (velocidad pareja, no por compás real). Cuando se le explicó
que la detección automática de barras de compás ya se había intentado y
descartado por poco confiable, el usuario insistió con una observación
correcta: "la única línea que une pentagrama de sol y de fa es la línea de
compás... ¿no es posible guiarse por esa línea?" — señalando específicamente
el hueco ENTRE los dos pentagramas de un mismo sistema (no usado en los 2
intentos fallidos del punto 58, que miraban la altura del sistema completo).

**Debug real antes de tocar código:** en vez de seguir razonando en
abstracto, se generó una visualización (línea roja dibujada en la posición
detectada, sobre la imagen real agrandada) para cada hipótesis, algo que no
se había hecho en los intentos del punto 58:
1. Filtrar por el hueco entre pentagramas en vez de la altura completa del
   sistema: dio los mismos números que antes (sin mejora) — pero la
   visualización mostró que las líneas SÍ caían exactas en las barras
   reales; el problema no era falsos positivos sino un umbral de agrupado
   de columnas (3px) demasiado angosto para fundir la barra final doble
   (fina+gruesa) en un solo evento, contándola como 2.
2. Con el umbral de agrupado corregido (10px): quedó un desfase sistemático
   de +2 por paso, +1 por sistema, en TODOS los casos — la visualización
   mostró que era una barra "decorativa" pegada al inicio del sistema
   (justo después de la clave/armadura), antes de que empiece el primer
   compás real — no cierra ningún compás, hay que descartarla.
3. Con las dos correcciones juntas, la detección coincidió exacta con las
   barras reales en los casos probados (natural, sin alteraciones). En un
   caso con muchas alteraciones (Lab menor, 7 bemoles) aparecieron menos
   barras de las esperadas por comparación con otras tonalidades — se
   verificó con un umbral mucho más laxo (bajado a la mitad) que NO hay
   ninguna barra real perdida ahí (ninguna columna alcanza ni el 50% de
   oscuridad en esos huecos), así que la conclusión es que esos compases
   son genuinamente más anchos (las alteraciones ocupan más espacio
   horizontal por nota), no una detección fallida.

**Decisión:** se reemplaza `detectSystemSplit()` (punto 58, solo separaba
2 sistemas por el hueco en blanco entre ellos) por `detectSystemLayout()`
en `util.js` — hace lo mismo Y ADEMÁS detecta las barras de compás reales
de cada sistema (mismas 2 correcciones de arriba: hueco entre pentagramas
+ umbral de agrupado 10px + margen que descarta la barra de apertura),
devolviendo por sistema una lista de segmentos `[inicioFrac, finFrac]`, uno
por compás real. En `player.js`, `updateCursorPosition()` ahora ubica la
barra dentro del segmento real del compás actual (`Math.floor(beatsElapsedInSistema / tiempos)`),
interpolando parejo solo DENTRO de ese compás puntual — no de todo el
sistema. Si la imagen no tiene suficientes segmentos detectados para el
compás actual (desajuste con los compases cargados a mano, o detección
fallida), cae al modo parejo de todo el sistema del punto 58 como red de
seguridad — nunca se rompe, en el peor caso queda como antes.

De paso, la detección ahora se intenta para CUALQUIER paso con imagen (no
solo los de 2 sistemas, ver `pasoTieneDosSistemas` en el punto 58) — un
paso de 1 solo sistema también se beneficia de la barra cayendo exacta,
aunque no haya nada para atenuar.

**Por qué:** el usuario tenía razón en su intuición (guiarse por la unión
entre pentagramas) — los 2 intentos fallidos del punto 58 no habían
aislado esa franja específica, y encima tenían un bug de agrupado que
inflaba el conteo independientemente del enfoque. La combinación de
"mirar el debug visual en vez de solo los números" + "la pista concreta
del usuario sobre qué línea mirar" fue lo que destrabó esto — otro caso
del patrón ya documentado varias veces en este archivo de que las
hipótesis abstractas sin evidencia visual llevan a conclusiones
equivocadas (ver puntos 17, 33, 50, 51, 55).

**Verificado en el navegador:** con un paso real (imagen del punto 56,
"Am", 4+4 compases configurados) reproducido a 90 BPM en modo automático,
se registraron 28 posiciones de la barra (`cursor.style.left`) en
distintos tiempos del metrónomo y se compararon contra los segmentos
calculados a mano a partir de las barras detectadas — **coincidencia
exacta en todos los puntos verificados** (ej. al completar el 3er compás
la barra salta a 85.79%, no al 75% que daría el reparto parejo — y 85.79%
es justo donde está la barra de compás real detectada). `detectSystemSplit`
quedó sin usos (reemplazada por `detectSystemLayout`) y se borró de
`util.js`. Sin errores de consola nuevos. Ejercicio e imagen de prueba
borrados de `localStorage` al terminar.

## 60. Botón para eliminar un ejercicio

**Pedido:** el usuario pidió un botón para eliminar ejercicios — hasta
ahora no existía ninguna forma de borrar un ejercicio propio desde la app
(solo se podían crear/editar).

**Decisión:** `store.deleteCustomExercise(exerciseId)` (nuevo) borra el
ejercicio de `fuelle:customExercises:v2` y, además, todo lo que le
pertenece únicamente a él para no dejar basura huérfana en
`localStorage`: las imágenes y audios de sus pasos (o los del ejercicio
mismo si es tipo "fuelle"), su progreso (`fuelle:progress`) y sus
preferencias de reproductor (`fuelle:playerSettings:v2:<id>`, clave propia
por ejercicio fuera de `KEYS`). En `newExercise.js`, un botón "🗑 Eliminar
ejercicio" (rojo/vino, `.btn-wine`) aparece solo en modo edición (no tiene
sentido borrar algo que todavía no existe) al final del formulario, y usa
`confirmDialog()` (ui.js, el mismo diálogo estilado que ya se usa para
restaurar un backup — ver ronda 7 punto 37) en vez de `window.confirm()`
nativo, avisando que la acción no se puede deshacer.

**Por qué:** con varios ejercicios de prueba/duplicados dando vueltas
(ver "Arpegios menore" vs "Arpegios menoress" del punto 57, o el nuevo
"Arpegios menores" sin typo del punto 59) hacía falta una forma de
limpiar sin tener que editar `localStorage` a mano.

**Verificado en el navegador:** ejercicio de prueba con paso, imagen,
audio, progreso y configuración de reproductor cargados a propósito en
`localStorage`; se tocó "Eliminar ejercicio", se confirmó el diálogo, y
se comprobaron las 5 claves relacionadas — todas ausentes después de
borrar, navegación correcta a Bandoteca, sin errores de consola.

## 61. Investigación de un margen inconsistente entre pasos en pantalla completa (no se pudo confirmar la causa exacta; se endureció un punto débil real de todos modos)

**Reporte del usuario:** en pantalla completa, mandó 2 capturas mostrando
que el margen ("zócalo") debajo del pentagrama variaba visiblemente entre
un paso y otro — con las imágenes YA del molde consistente (puntos 56/57),
así que no era un problema de recorte. Preguntó si convenía volver a
cargar todo de cero.

**Investigación:** se midió `computeContentTransform()` directo (sin pasar
por la app) contra 2 pares de imágenes reales, en 2 proporciones de marco
distintas (parecida a escritorio, y a pantalla completa 1920×1080) — en
los 4 casos dio exactamente el mismo `scale` para ambas imágenes de cada
par, con una diferencia de traslación vertical de ~1.5-2% (imperceptible).
Un intento posterior de simular pantalla completa manipulando el DOM del
reproductor en vivo (ya que la API real de pantalla completa exige un
gesto de usuario genuino, no se puede disparar por script) sí mostró una
imagen "gigante" y cortada — pero se confirmó que era un artefacto de la
simulación (el tamaño del marco se cambiaba a mano DESPUÉS de que la
transformación ya se había calculado con el tamaño viejo, sin
recalcularla), no evidencia de un bug real de la app.

**No se pudo reproducir el bug reportado de forma confiable.** Sin
embargo, revisando el código real que dispara el recálculo al entrar a
pantalla completa (`onFsChange`), se encontró un punto débil genuino e
independiente: el recálculo se hacía con un solo `requestAnimationFrame`
después del evento `fullscreenchange`, asumiendo que el navegador ya
había terminado de aplicar el nuevo layout en ESE frame — no siempre es
cierto (la transición a pantalla completa puede tardar más de un frame en
algunos navegadores/dispositivos, especialmente iOS Safari), y si se mide
antes de tiempo, la escala mal calculada queda pegada hasta el próximo
cambio de tamaño real.

**Decisión:** se reemplazó el listener de `fullscreenchange` (que hacía el
recálculo) + el listener de `resize` con debounce por un único
`ResizeObserver` sobre `#scoreFrame`, que dispara exactamente cuando el
tamaño del marco YA cambió de verdad — sea la causa pantalla
completa/salir de ella, resize de ventana, o rotación — sin depender de
adivinar cuántos frames tarda cada transición. Es un cambio defendible por
sí solo (más robusto que la lógica vieja) independientemente de si era la
causa exacta de lo que vio el usuario.

**Por qué no se seleccionó "recargar todo de nuevo" como solución:** no
había ninguna razón técnica para creer que volver a subir las mismas
imágenes (ya recortadas con el molde consistente) iba a cambiar algo —
`computeContentTransform` da resultados idénticos con los datos que ya
había. Recargar a ciegas sin entender la causa hubiera sido un
"arreglo" de fe, no una solución — se prefirió investigar primero (ver
DECISIONES.md, patrón repetido de no adivinar sin evidencia).

**Pendiente:** no se pudo confirmar con certeza que este haya sido el bug
que vio el usuario (la API de pantalla completa real no se puede probar
por automatización). Queda a la espera de que lo prueble en su dispositivo
real después de este cambio y confirme si se resolvió o si el problema
persiste — en cuyo caso hace falta seguir investigando con más datos
(ej. qué pasos puntuales, capturas con la etiqueta de tonalidad visible).

**Verificado en el navegador:** se comprobó que el `ResizeObserver` nuevo
dispara y recalcula correctamente ante cambios de tamaño de viewport
reales (no simulados a mano) — la transformación aplicada coincidió
exactamente con un cálculo fresco hecho en el momento, en varios tamaños
de marco distintos. Sin errores de consola. Ejercicio e imágenes de
prueba borrados de `localStorage` al terminar.
