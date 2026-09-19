// Íconos SVG propios que reemplazan a los emojis del sistema (ver
// DECISIONES.md punto 85): mismo trazo redondeado que los íconos de
// transporte de player.js, y `currentColor` para que tomen el color del
// texto de cada botón (violeta en claro, ámbar en oscuro) sin CSS extra.
// El tamaño lo fija `.ico` en styles.css (relativo a la fuente).

const ICONS = {
  refresh: '<path d="M4.5 12a7.5 7.5 0 0 1 13-5.1"/><path d="M19.5 12a7.5 7.5 0 0 1-13 5.1"/><path d="M18.5 3.5V7.4h-3.9"/><path d="M5.5 20.5V16.6h3.9"/>',
  moon: { fill: true, d: '<path d="M20.4 14.6A8.6 8.6 0 0 1 9.4 3.6a8.6 8.6 0 1 0 11 11z"/>' },
  download: '<path d="M12 4v11"/><path d="M7.5 11 12 15.5 16.5 11"/><path d="M5 19.5h14"/>',
  upload: '<path d="M12 15.5v-11"/><path d="M7.5 9 12 4.5 16.5 9"/><path d="M5 19.5h14"/>',
  camera: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.2-2h6.6l1.2 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.4"/>',
  image: '<rect x="4" y="5" width="16" height="14" rx="2.2"/><circle cx="9" cy="10" r="1.6"/><path d="M4.5 17l5-4.5 3.5 3 2.5-2 4.5 4"/>',
  sparkle: '<path d="M11 4l1.8 5.2L18 11l-5.2 1.8L11 18l-1.8-5.2L4 11l5.2-1.8z"/><path d="M19 3.5v3.5M17.25 5.25h3.5"/>',
  trash: '<path d="M4.5 7h15"/><path d="M9.5 7V4.8h5V7"/><path d="M6.8 7l.9 12.2h8.6L17.2 7"/><path d="M10.4 11v5.2M13.6 11v5.2"/>',
  pause: { fill: true, d: '<rect x="6.5" y="4.5" width="4" height="15" rx="1.3"/><rect x="13.5" y="4.5" width="4" height="15" rx="1.3"/>' },
  archive: '<rect x="4" y="4.5" width="16" height="5" rx="1.3"/><path d="M5.5 9.5V18a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V9.5"/><path d="M10 13.5h4"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  alert: '<path d="M12 4.2 21 19.5H3z"/><path d="M12 10v4.6"/><path d="M12 17.2v.1"/>',
  check: '<circle cx="12" cy="12" r="8.6"/><path d="M8.2 12.4l2.7 2.7 4.9-5.4"/>',
};

export function icon(name) {
  const def = ICONS[name];
  const filled = typeof def === 'object';
  const body = filled ? def.d : def;
  const paint = filled
    ? 'fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"'
    : 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  return `<svg class="ico" viewBox="0 0 24 24" ${paint} aria-hidden="true">${body}</svg>`;
}
