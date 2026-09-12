// Metrónomo con sonido real, generado con Web Audio API (sin archivos de
// audio externos). Ver DECISIONES.md punto 19 y ronda 3 (puntos 24-26).
//
// Usa la técnica estándar de "lookahead scheduling": en vez de reproducir un
// click cada X milisegundos con setInterval (que arrastra deriva por el
// jitter del event loop), se programan los clicks con antelación sobre el
// reloj de precisión del propio AudioContext (`audioContext.currentTime`),
// y un timer liviano solo se encarga de ir completando la cola de clicks
// programados un poco antes de que hagan falta.
//
// Decisión (ver DECISIONES.md punto 24): a partir de la ronda 3 este módulo
// es además la ÚNICA fuente de verdad temporal para el reproductor de
// práctica. `start()` acepta un callback `onBeat` que se dispara una vez por
// cada tiempo, en el momento en que ese click efectivamente ocurre sobre el
// reloj de audio — no antes, calculado aparte en milisegundos. Para eso se
// combina el lookahead scheduler (que agenda los clicks de audio) con un
// segundo loop que compara `audioCtx.currentTime` contra la cola de clicks
// ya agendados y dispara `onBeat` apenas cada uno "sucede" (la misma técnica
// que usa el artículo de referencia de Chris Wilson, "A Tale of Two Clocks",
// para sincronizar visuales con Web Audio). El reproductor decide qué hacer
// con cada tiempo (cuenta de anticipación, avance de paso, segmento de
// progreso); el metrónomo solo lleva el reloj.
//
// Decisión (ver DECISIONES.md punto 29): ese segundo loop usa `setTimeout`,
// NO `requestAnimationFrame`. Chrome (y navegadores basados en él) pausan
// por completo los callbacks de `requestAnimationFrame` cuando la pestaña
// queda oculta (cambio de app, pantalla bloqueada) — el audio sigue sonando
// igual, pero `onBeat` dejaría de dispararse mientras tanto y, al volver a
// primer plano, se dispararían de golpe todos los tiempos acumulados
// (saltando varios pasos de una vez). `setTimeout` sigue funcionando en
// segundo plano (con throttling, pero sin pausarse del todo), así que el
// avance de pasos se mantiene razonablemente al día incluso si el usuario
// cambia de app un momento con el metrónomo sonando.

const LOOKAHEAD_MS = 25; // cada cuánto se revisa si hay que agendar más clicks
const SCHEDULE_AHEAD_SEC = 0.12; // cuánto margen de clicks futuros se mantiene agendado
const BEAT_POLL_MS = 20; // cada cuánto se revisa si ya "sucedió" algún click agendado

export function createMetronome() {
  let audioCtx = null;
  let schedulerTimerId = null;
  let beatPollTimerId = null;
  let nextNoteTime = 0;
  let beatCount = 0;
  let bpm = 60;
  let accentEvery = 0; // 0-9; 0 = ningún golpe acentuado (ver DECISIONES.md punto 26)
  let volume = 0.8; // 0..1, independiente del volumen del audio de demostración
  let playing = false;
  let onBeat = null; // (beatIndex, isAccent, audioTime) => void
  const pendingBeats = []; // clicks ya agendados en audio, esperando a "suceder" para avisar a onBeat

  function ensureCtx() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function isAccentBeat(n) {
    return accentEvery > 0 && n % accentEvery === 0;
  }

  function scheduleClick(time, accent) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = accent ? 1500 : 1000;
    // Mínimo no-cero: exponentialRampToValueAtTime no acepta 0, y volumen 0
    // debe seguir agendando el click (silencioso) para que onBeat no se
    // interrumpa (ver DECISIONES.md punto 25: el volumen no apaga el reloj).
    const peak = Math.max(0.0001, (accent ? 0.85 : 0.55) * volume);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  function scheduler() {
    while (nextNoteTime < audioCtx.currentTime + SCHEDULE_AHEAD_SEC) {
      const accent = isAccentBeat(beatCount);
      scheduleClick(nextNoteTime, accent);
      pendingBeats.push({ beatIndex: beatCount, time: nextNoteTime, accent });
      nextNoteTime += 60 / bpm;
      beatCount++;
    }
    schedulerTimerId = setTimeout(scheduler, LOOKAHEAD_MS);
  }

  function beatPoll() {
    if (audioCtx) {
      const now = audioCtx.currentTime;
      while (pendingBeats.length && pendingBeats[0].time <= now) {
        const beat = pendingBeats.shift();
        if (onBeat) onBeat(beat.beatIndex, beat.accent, beat.time);
      }
    }
    beatPollTimerId = setTimeout(beatPoll, BEAT_POLL_MS);
  }

  return {
    /**
     * Arranca el click en la velocidad/acento/volumen dados. Debe llamarse
     * desde un gesto del usuario. `onBeat(beatIndex, isAccent)` se llama una
     * vez por cada tiempo que efectivamente suena, con un contador que
     * arranca en 0 en cada `start()`.
     */
    start({ bpm: newBpm, accentEvery: newAccentEvery = 0, volume: newVolume = 0.8, onBeat: onBeatCb } = {}) {
      bpm = newBpm || bpm;
      accentEvery = newAccentEvery;
      volume = newVolume;
      onBeat = onBeatCb || null;
      ensureCtx();
      if (playing) return;
      playing = true;
      beatCount = 0;
      pendingBeats.length = 0;
      nextNoteTime = audioCtx.currentTime + 0.06;
      scheduler();
      beatPoll();
    },
    stop() {
      playing = false;
      clearTimeout(schedulerTimerId);
      clearTimeout(beatPollTimerId);
      pendingBeats.length = 0;
    },
    /** Cambia el tempo sin cortar el click (el próximo beat ya toma el nuevo valor). */
    setBpm(newBpm) {
      bpm = newBpm;
    },
    /** Cambia la agrupación de acento sin cortar el click. Ver DECISIONES.md punto 26. */
    setAccentEvery(n) {
      accentEvery = n;
    },
    /** Cambia el volumen del click sin cortar el click. Ver DECISIONES.md punto 25. */
    setVolume(v) {
      volume = v;
    },
    get isPlaying() {
      return playing;
    },
  };
}
