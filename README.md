# BandoGym — práctica diaria de bandoneón (prototipo)

PWA mobile-first para la entrada en calor y técnica diaria de bandoneonistas.
Prototipo de **frontend puro**: no hay backend ni base de datos real todavía;
el catálogo de ejercicios se genera en el navegador a partir de reglas simples
(`src/data.js`) y el progreso del usuario se guarda en `localStorage`.

> Las decisiones de diseño/implementación que tuve que resolver por mi cuenta
> (y por qué) están documentadas en [`DECISIONES.md`](./DECISIONES.md).

## Cómo correrlo localmente

No hace falta instalar dependencias (no hay `npm install` que correr: el
proyecto es JS/HTML/CSS plano, sin build step). Solo hace falta **Node.js**
(usado únicamente para levantar un servidor estático) o cualquier otro
servidor de archivos estáticos.

### Opción A — con Node (recomendado)

```bash
node server.js
# o, si tenés npm:
npm start
```

Después abrí **http://localhost:5173** en el navegador.

> ¿Por qué hace falta un servidor y no alcanza con abrir `index.html` con
> doble clic? Porque la app usa módulos ES (`<script type="module">`) y un
> service worker, y ambos requieren que la página se sirva por `http://`
> (no funcionan con `file://`).

### Opción B — cualquier otro servidor estático

Cualquier servidor de archivos sirve, por ejemplo:

```bash
npx serve .
# o
python -m http.server 5173
```

### Si editás código y no ves los cambios

El service worker cachea agresivamente para que la app funcione offline. Si
después de editar un archivo lo seguís viendo "viejo" en el navegador, es
porque el service worker ya instalado sigue sirviendo la versión cacheada
(esto es normal: solo vuelve a cachear cuando el archivo `service-worker.js`
en sí cambia de contenido). Para forzar que tome los cambios: DevTools →
Application → Service Workers → "Unregister", y Application → Storage →
"Clear site data" (o simplemente subí el número de `CACHE_NAME` en
`service-worker.js`).

### Probarlo como PWA instalable

1. Abrí la app en Chrome (Android/desktop) o Safari (iOS) desde el servidor
   local (o desde una URL con HTTPS si lo desplegás).
2. Android/Chrome: menú → "Instalar app" / "Agregar a pantalla de inicio".
3. iOS/Safari: botón de compartir → "Agregar a pantalla de inicio".
4. Una vez instalada, probá abrirla en modo avión: el service worker cachea
   el app shell completo, así que debería seguir funcionando offline.

## Estructura del proyecto

```
index.html              Shell de la app (topbar + contenedor de pantalla + tabbar)
manifest.webmanifest     Manifest de la PWA
service-worker.js        Cache del app shell para uso offline
server.js                Servidor estático mínimo para desarrollo (sin dependencias)
icons/                   Íconos de la PWA (generados con System.Drawing, ver scripts/)

src/
  app.js                 Router (hash-based) y montaje de pantallas
  theory.js               Constantes de dominio: niveles, tonalidades, articulaciones,
                           velocidades fijas de metrónomo, grupo "Arpegios menores"
  data.js                 Helpers de cálculo de duración y armado de "pasos"
                           (ya no hay catálogo de ejemplo, ver más abajo)
  store.js                Estado persistente: localStorage, repetición espaciada,
                           armado de la rutina diaria, agrupamiento de "Arpegios menores",
                           respaldo/restauración completa (buildBackup/restoreBackup)
  metronome.js             Metrónomo con clicks generados por Web Audio API
  zoom.js                  Pellizco/doble-tap para hacer zoom sobre la partitura
  annotate.js               Capa de anotaciones a mano (lápiz/resaltador/goma) sobre
                             la partitura del reproductor, por paso
  ui.js / util.js          Helpers de interfaz y utilidades (badges, toast, diálogo de
                           confirmación, SVG placeholder…)
  styles.css               Toda la hoja de estilos (tema, componentes, layout)
  screens/
    today.js               Pantalla "Hoy" (rutina diaria)
    library.js              Biblioteca de ejercicios (filtrable)
    player.js                Reproductor de práctica (la pantalla clave)
    newExercise.js            Alta de ejercicio nuevo y edición de uno existente
                              (multi-imagen) — ver rutas #/nuevo y #/editar/<id>
    profile.js                 Selector de nivel / perfil, exportar/importar
                                respaldo y aviso de respaldo pendiente
    community.js                Pestaña "Comunidad": vista previa del ranking
                                 por tiempo en la app + Instagram opcional
                                 (todavía sin backend real, ver DECISIONES.md
                                 punto 69)
```

## Qué es funcional hoy

- **Rutina diaria ("Hoy")**: orden fijo de pasos (fuelle → escalas → arpegios,
  salvo en nivel principiante que solo tiene fuelle), con contenido elegido
  según repetición espaciada simplificada (lo que peor salió o hace más
  tiempo que no se practica tiene prioridad). El tiempo total se ajusta según
  15/30/45 minutos elegidos por el usuario. Cada paso se puede reemplazar por
  "otro similar". El ejercicio especial **"Arpegios menores"** aparece como
  una única fila que agrupa **todas** las variantes cargadas con ese mismo
  nombre (comparación insensible a mayúsculas/espacios) y nivel — sin
  importar cuántas sean ni cómo se llame la articulación de cada una (ya no
  está limitado a Portato / Nota repetida / Continuo, ver DECISIONES.md
  puntos 15 y 38): el botón de la fila las cicla en vez de buscar "otro
  similar" en el resto de la biblioteca. También muestra una **racha
  semanal**: 7 bloques fijos lunes a domingo, marcando en qué días se
  terminó al menos un ejercicio esta semana (ver DECISIONES.md punto 75).
  Elegir un tiempo (15/30/45 min) además de fijar cuánto contenido entra
  en la rutina (como siempre) **arranca un temporizador de sesión real**:
  el picker se reemplaza por un botón grande "¡A estudiar! MM:SS" que
  cuenta atrás de verdad (sigue corriendo aunque se navegue a practicar
  un ejercicio y se vuelva), se puede pausar/reanudar tocándolo, y "Cambiar
  tiempo" vuelve al selector en cualquier momento (ver DECISIONES.md
  punto 76).
- **Reproductor de práctica**: cada ejercicio de escala/arpegio es una
  secuencia de **pasos** (una imagen por paso — típicamente tonalidad +
  dirección de fuelle, ej. "La menor abriendo"), cada uno con su **propia
  cantidad de compases** (campo independiente por paso, no un valor único
  para todo el ejercicio — ver DECISIONES.md ronda 6, punto 34). Avanza
  automáticamente de paso en paso según BPM (fijo en 40/60/80, ver más
  abajo), los compases de cada paso puntual y **compás real del ejercicio**
  (2/4, 3/4 o 4/4: determina cuántos tiempos dura cada paso, ver
  DECISIONES.md punto 23), con play/pausa, navegación anterior/siguiente, y
  **cuadraditos de progreso tocables** a nivel de paso — tocar uno salta
  directo a ese paso y resincroniza el conteo de tiempos (ver punto 35) — y
  una **barra de progreso segmentada** (un segmento por tiempo del compás)
  que se completa exactamente con cada click del metrónomo — el metrónomo
  (con su *lookahead scheduling* de Web Audio) es la única fuente de tiempo:
  no hay ningún timer aparte que pueda desincronizarse (ver DECISIONES.md
  punto 24). Antes de cada play hay una **cuenta de anticipación** de 2
  compases completos de click en vacío (ver punto 27). El metrónomo tiene
  **volumen propio** (independiente del audio de demostración, ver punto 25)
  y un **acento configurable de 0 a 9 tiempos** (independiente del compás
  real, para agrupaciones asimétricas, ver punto 26) — junto con los
  volúmenes, vive en un panel colapsable "Acento y volumen" para ahorrar
  espacio (ver punto 35). También: **audio de demostración** opcional por
  paso y por velocidad (40/60/80) con su propio control de volumen, botón
  para subir/reemplazar la imagen de ese paso puntual, zoom por pellizco o
  doble tap sobre la partitura (que además se **maximiza y normaliza
  automáticamente** entre pasos — ocupa el máximo espacio posible del marco
  sin deformarse ni saltar de tamaño entre imágenes con distinto margen, ver
  punto 33), botón de pantalla completa con la partitura siempre centrada
  verticalmente en su marco (ver punto 30), y un layout horizontal que
  aprovecha el ancho en modo apaisado y **entra completo en la altura del
  viewport sin scroll vertical** (ver DECISIONES.md puntos 17-20, 23-27 y
  ronda 6 punto 35). Además del avance automático por metrónomo, hay un
  **modo de avance manual** (pedal Bluetooth / teclado / toque sobre la
  partitura — mitad derecha avanza, mitad izquierda retrocede, ver punto 36
  —, sin tiempo fijo, ver punto 32), elegible por ejercicio con un selector
  arriba del reproductor. Los ejercicios de fuelle usan una versión
  simplificada (temporizador de práctica, sin metrónomo).
- **Anotaciones a mano sobre la partitura**: botón flotante (mismo estilo
  visual que el botón "Volver" de Práctica horizontal) sobre la imagen de
  cada paso, con lápiz (negro o rojo), resaltador (trazo grueso
  semitransparente) y goma de borrar (borra el trazo tocado/arrastrado
  entero). El dibujo vive en una capa `<canvas>` aparte — nunca modifica la
  imagen original —, queda guardado de forma permanente por paso individual
  (no por ejercicio completo) y se mantiene alineado con la partitura en
  cualquier nivel de zoom. Queda incluido automáticamente en el
  exportar/importar de respaldo de Perfil (ver más abajo), sin configuración
  aparte. Ver DECISIONES.md punto 67.
- **Biblioteca**: listado completo filtrable por nivel y por tipo
  (fuelle/escala/arpegio); arranca vacía (ver más abajo). Cada ejercicio
  tiene un botón "✎ Editar" que abre el mismo formulario de alta precargado
  con sus datos (ver DECISIONES.md punto 28).
- **Alta y edición de ejercicio**: un mismo formulario (`#/nuevo` para crear,
  `#/editar/<id>` para corregir uno existente: nivel, tipo, nombre,
  articulación, compás y sus pasos/imágenes) permite cargar **múltiples
  imágenes ("pasos")** dentro de una sola entrada de ejercicio, cada una con
  su etiqueta, orden y **cantidad de compases propia** editables
  (agregar/quitar/reordenar/reemplazar imagen — ver DECISIONES.md ronda 6,
  punto 34). El campo global "Compases por defecto para pasos nuevos" solo
  se usa como valor inicial al agregar un paso o generar el esqueleto de
  "Arpegios menores"; cada fila se puede corregir después de forma
  independiente. Un ejercicio de tipo "Arpegio" nombrado exactamente
  "Arpegios menores" (cualquiera sea su articulación) muestra un botón que
  genera automáticamente el esqueleto de 12 pasos (uno por tonalidad menor,
  con el sistema abriendo y el cerrando apilados en la misma imagen) listo
  para completar con imágenes, y queda agrupado con las demás variantes de
  ese mismo nombre y nivel en "Hoy" (ver DECISIONES.md puntos 15, 38 y 56).
  El audio de demostración por paso se carga
  después, desde el reproductor (ver DECISIONES.md punto 20).
- **Perfil**: selector de nivel (principiante/intermedio/avanzado) y resumen
  de progreso, con botón para reiniciar el progreso guardado.
- **Copia de seguridad (exportar / importar)**: como todo el contenido vive
  solo en `localStorage` (ver más abajo), Perfil tiene botones para
  **exportar** un respaldo completo (un archivo `fuelle-backup-<fecha>.json`
  con todos los ejercicios propios, sus pasos, imágenes, audios y
  anotaciones a mano en base64, y el progreso/nivel) e **importar** uno
  previamente exportado, que
  **reemplaza todo** el contenido actual tras una confirmación explícita
  (no fusiona, para no generar duplicados — ver DECISIONES.md ronda 7,
  punto 37). También hay un aviso no invasivo en Perfil si pasó más de una
  semana desde el último respaldo (y hay contenido real cargado para
  respaldar).
- **Fin de ejercicio**: al terminar (botón "Terminar", o al llegar
  automáticamente al último paso en modo auto) se registra el progreso y se
  vuelve a "Hoy"/Bandoteca, sin pedir ninguna calificación (antes se
  preguntaba "me costó / normal / bien" — se sacó por pedido del usuario,
  ver DECISIONES.md punto 68). La repetición espaciada de "Hoy" sigue
  funcionando igual, solo que ya no distingue dificultad.
- **Comunidad** *(vista previa, sin backend real todavía)*: pestaña con un
  ranking por **tiempo total en la app** — mezcla 3 "usuarios de fantasía"
  con tu propia fila real (el tiempo si se trackea de verdad, ver
  DECISIONES.md punto 69), botón para dejar tu Instagram (persistido, se
  ve en tu fila) y un botón "Iniciar sesión con Google" que por ahora solo
  avisa que no está conectado. Pensada para la comunidad de bandoneonistas
  del usuario — falta el backend compartido y el login real para que sea
  gente real la que se vea, no solo vos.
- **PWA**: manifest + service worker cacheando el app shell completo (funciona
  offline una vez instalada/visitada una vez).

## Qué falta (a propósito, fuera de alcance de este prototipo)

- Backend real / sincronización entre dispositivos (todo vive en
  `localStorage` del navegador; borrar datos del sitio, o un cambio de forma
  de los datos entre sesiones de desarrollo, pierde el progreso y el
  contenido cargado sin posibilidad de recuperarlo — el respaldo manual
  exportar/importar de Perfil, ver arriba, es la única red de seguridad
  posible sin backend).
- Lectura musical (mencionado en el contexto del producto como fase futura).
- Bloqueo real de orientación en pantallas que no son Práctica: no hace falta
  (solo Práctica necesita horizontal) y el bloqueo de orientación del
  navegador es, de por sí, best-effort (ver DECISIONES.md punto 17).
- Comunidad real (login con Google + backend compartido, ver DECISIONES.md
  punto 69): la pestaña "Comunidad" hoy es solo una vista previa de interfaz
  con datos de ejemplo — conectar un servidor de verdad (se evaluó y se
  aceptó sumar un servicio externo, ej. Firebase) queda para cuando haya más
  contenido cargado.

## Biblioteca vacía por diseño

Los 22 grupos de ejercicios de ejemplo que traía el prototipo anterior se
eliminaron a propósito (`buildSeedExercises()` en `src/data.js` devuelve
`[]`): la biblioteca arranca sin contenido, lista para cargar ejercicios
reales desde "Nuevo ejercicio". Ver DECISIONES.md punto 16.
