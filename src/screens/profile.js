// Selector de nivel / perfil básico. Sin cuentas ni login: un solo perfil
// local guardado en localStorage (ver DECISIONES.md).
//
// Ver DECISIONES.md ronda 7, punto 37: también vive acá la exportación/
// importación de un respaldo completo del contenido (todo lo guardado en
// localStorage) y el aviso no invasivo para recordar hacerlo — es la única
// red de seguridad posible dado que no hay backend (ver README).

import * as store from '../store.js';
import { NIVELES, NIVEL_LABEL, NIVEL_DESCRIPCION } from '../theory.js';
import { toast, confirmDialog } from '../ui.js';
import { todayISO } from '../util.js';
import { icon } from '../icons.js';

// Cada cuántos días, sin un respaldo nuevo, se muestra el aviso (ver
// DECISIONES.md ronda 7, punto 37 — por qué 7 días y no otro número).
const BACKUP_REMINDER_DAYS = 7;

function daysSince(isoString) {
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return Infinity;
  return (Date.now() - then) / (1000 * 60 * 60 * 24);
}

function formatBackupDate(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function render(container, { navigate }) {
  const profile = store.getProfile();

  container.innerHTML = `
    <p class="subtitle">Elegí tu nivel. Esto define qué tipo de contenido aparece en tu rutina de "Hoy" — no es una escala de dificultad progresiva, son enfoques distintos.</p>
    <div id="levels"></div>

    <div class="section-title">Apariencia</div>
    <button type="button" class="chip chip-block ${profile.temaOscuro ? 'active' : ''}" id="temaOscuroToggle">${icon('moon')} Tema oscuro en toda la app</button>
    <p class="field-hint">Práctica siempre usa tema oscuro. Con esto activado, el resto de la app (Hoy, Bandoteca, Nuevo, Comunidad, Perfil) también.</p>

    <div class="section-title">Tu progreso</div>
    <div class="card" id="statsCard"></div>

    <div class="section-title">Copia de seguridad</div>
    <div id="backupBanner"></div>
    <p class="field-hint">Todo el contenido (ejercicios, imágenes, audios y progreso) vive solo en este navegador — no hay backend. Exportá un respaldo de vez en cuando para no perderlo.</p>
    <div class="btn-row" style="margin-top:10px;">
      <button class="btn btn-primary" id="exportBtn">${icon('download')} Exportar respaldo</button>
      <label class="btn btn-outline file-btn" style="margin:0;">
        ${icon('upload')} Importar respaldo
        <input type="file" accept="application/json,.json" id="importInput" hidden />
      </label>
    </div>
    <p class="field-hint" id="lastBackupHint" style="margin-top:10px;"></p>

    <div class="section-title">Otras acciones</div>
    <button class="btn btn-outline" id="resetBtn">Reiniciar progreso guardado localmente</button>

    <div id="adminSection" style="margin-top:20px;"></div>
  `;

  function paintBackupStatus() {
    const lastBackupAt = store.getLastBackupAt();
    const hint = container.querySelector('#lastBackupHint');
    hint.textContent = lastBackupAt
      ? `Último respaldo exportado: ${formatBackupDate(lastBackupAt) || lastBackupAt}.`
      : 'Todavía no exportaste ningún respaldo.';

    const banner = container.querySelector('#backupBanner');
    const overdue = !lastBackupAt || daysSince(lastBackupAt) > BACKUP_REMINDER_DAYS;
    // No molesta si no hay nada que respaldar todavía (perfil recién
    // instalado, sin ejercicios propios ni progreso) — ver DECISIONES.md.
    if (overdue && store.hasBackupableContent()) {
      const msg = lastBackupAt
        ? `Hace más de ${BACKUP_REMINDER_DAYS} días que no exportás un respaldo. Convendría hacer uno nuevo.`
        : 'Todavía no hiciste ningún respaldo de tu contenido. Exportá uno ahora para no perderlo.';
      banner.innerHTML = `
        <div class="backup-banner">
          <span class="banner-icon">${icon('archive')}</span>
          <p>${msg}</p>
        </div>`;
    } else {
      banner.innerHTML = '';
    }
  }

  function paint() {
    const current = store.getProfile().nivel;
    container.querySelector('#levels').innerHTML = NIVELES.map(
      (n) => `
      <button class="level-card ${n === current ? 'selected' : ''}" data-nivel="${n}">
        <h3>${NIVEL_LABEL[n]} <span class="level-check">✓</span></h3>
        <p>${NIVEL_DESCRIPCION[n]}</p>
      </button>`
    ).join('');

    container.querySelectorAll('[data-nivel]').forEach((btn) => {
      btn.addEventListener('click', () => {
        store.setNivel(btn.dataset.nivel);
        toast(`Nivel actualizado: ${NIVEL_LABEL[btn.dataset.nivel]}`);
        paint();
      });
    });

    // Ver DECISIONES.md punto 68: ya no se le pregunta al usuario "cómo te
    // salió" (se sacó la hoja de calificación), así que este resumen ya no
    // puede distinguir "bien"/"normal"/"me costó" — solo cuántos ejercicios
    // distintos tienen progreso registrado.
    const progress = store.getProgress();
    const total = Object.keys(progress).length;
    container.querySelector('#statsCard').innerHTML = total === 0
      ? '<p class="mb-0">Todavía no practicaste ningún ejercicio. ¡Arrancá por "Hoy"!</p>'
      : `<p class="mb-0">${total} ejercicio${total === 1 ? '' : 's'} con progreso registrado.</p>`;

    paintBackupStatus();
  }

  paint();

  // ---------- Tema oscuro en toda la app (ver DECISIONES.md punto 72) ----------
  container.querySelector('#temaOscuroToggle').addEventListener('click', () => {
    const nuevo = !store.getProfile().temaOscuro;
    store.setTemaOscuro(nuevo); // ya aplica la clase en <body> sola (ver store.applyTheme)
    container.querySelector('#temaOscuroToggle').classList.toggle('active', nuevo);
    toast(nuevo ? 'Tema oscuro activado en toda la app.' : 'Tema oscuro desactivado fuera de Práctica.');
  });

  // ---------- Modo administrador oculto (ver DECISIONES.md punto 82) ----------
  // No aparece en la pantalla: se revela tocando 5 veces seguidas (dentro de
  // 3 segundos) el texto de arriba, y se vuelve a ocultar al salir de Perfil.
  const adminSection = container.querySelector('#adminSection');

  function paintAdminSection() {
    const admin = store.isAdmin();
    adminSection.innerHTML = `
      <div class="section-title">Modo administrador</div>
      <button type="button" class="chip chip-block ${admin ? 'active' : ''}" id="adminToggle">${icon('wrench')} ${admin ? 'Modo administrador activado' : 'Vista de usuario activada'}</button>
      <p class="field-hint">Activado: se ve "Nuevo" y el botón de editar ejercicios. Desactivado: la app se ve como la vería un usuario.</p>`;
    adminSection.querySelector('#adminToggle').addEventListener('click', () => {
      store.setAdmin(!store.isAdmin());
      paintAdminSection();
    });
  }

  let secretTaps = [];
  container.querySelector('.subtitle').addEventListener('click', () => {
    const now = Date.now();
    secretTaps = secretTaps.filter((t) => now - t < 3000);
    secretTaps.push(now);
    if (secretTaps.length >= 5) {
      secretTaps = [];
      paintAdminSection();
      adminSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  container.querySelector('#resetBtn').addEventListener('click', () => {
    // Ver DECISIONES.md punto 14: la clave de "hoy" se bumpeó a ":v2" junto
    // con el resto del modelo de datos.
    ['fuelle:progress', 'fuelle:todayState:v2'].forEach((k) => localStorage.removeItem(k));
    toast('Progreso reiniciado.');
    paint();
  });

  // ---------- Exportar respaldo ----------
  // Ver DECISIONES.md ronda 7, punto 37.
  container.querySelector('#exportBtn').addEventListener('click', () => {
    const backup = store.buildBackup();
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fuelle-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // El navegador ya tomó los bytes del blob al iniciar la descarga: se
    // puede liberar la URL enseguida (no hace falta esperar a que termine).
    URL.revokeObjectURL(url);

    store.markBackupDone();
    toast('Respaldo exportado. Guardalo en un lugar seguro (Drive, mail a vos mismo, etc.).');
    paintBackupStatus();
  });

  // ---------- Importar / restaurar respaldo ----------
  // Ver DECISIONES.md ronda 7, punto 37 (por qué reemplaza todo en vez de fusionar).
  container.querySelector('#importInput').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo después
    if (!file) return;

    let parsed;
    try {
      const text = await file.text();
      parsed = JSON.parse(text);
    } catch (err) {
      toast('Ese archivo no es un JSON válido.');
      return;
    }

    // Validar la FORMA del archivo antes de pedir confirmación: no tiene
    // sentido mostrar "¿reemplazar todo?" para algo que de entrada no es un
    // respaldo de esta app (evita un paso de confirmación que solo termina
    // en un error después).
    if (!store.isValidBackup(parsed)) {
      toast('Ese archivo no tiene el formato de un respaldo de BandoGym.');
      return;
    }

    const ok = await confirmDialog({
      title: 'Restaurar respaldo',
      message: 'Esto va a REEMPLAZAR todo el contenido actual (ejercicios, imágenes, audios, progreso y nivel) por el del archivo elegido. No se puede deshacer. ¿Continuar?',
      confirmLabel: 'Reemplazar todo',
      cancelLabel: 'Cancelar',
      danger: true,
    });
    if (!ok) return;

    try {
      store.restoreBackup(parsed);
    } catch (err) {
      toast(err.message || 'No se pudo restaurar el respaldo.');
      return;
    }

    toast('Respaldo restaurado. Recargando…');
    // Recarga completa (en vez de solo volver a pintar esta pantalla): así
    // TODAS las pantallas/módulos vuelven a leer el localStorage restaurado
    // desde cero, sin arriesgar que alguna quede con estado viejo en memoria.
    setTimeout(() => window.location.reload(), 600);
  });
}
