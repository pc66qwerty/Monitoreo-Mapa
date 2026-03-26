/**
 * Catálogo de tipos de evento con color e icono SVG (Heroicons stroke).
 * El campo `iconPath` contiene los elementos SVG internos (sin el tag <svg>).
 * Usar con viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
 */
export const tiposEvento = [
  {
    nombre: 'Emergencia',
    color: '#dc2626',        // red-600
    colorLight: '#fef2f2',   // red-50
    colorBorder: '#fca5a5',  // red-300
    // Rayo / alerta crítica
    iconPath: `<path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>`,
  },
  {
    nombre: 'Accidente vial',
    color: '#ea580c',
    colorLight: '#fff7ed',
    colorBorder: '#fdba74',
    // Carro con impacto (X en círculo)
    iconPath: `
      <circle cx="12" cy="12" r="9"/>
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 9l-6 6M9 9l6 6"/>`,
  },
  {
    nombre: 'Bloqueo',
    color: '#7c3aed',
    colorLight: '#f5f3ff',
    colorBorder: '#c4b5fd',
    // Señal prohibido (círculo con diagonal)
    iconPath: `
      <circle cx="12" cy="12" r="9"/>
      <path stroke-linecap="round" d="M5.636 5.636l12.728 12.728"/>`,
  },
  {
    nombre: 'Asistencia vial',
    color: '#2563eb',
    colorLight: '#eff6ff',
    colorBorder: '#93c5fd',
    // Llave / herramienta
    iconPath: `<path stroke-linecap="round" stroke-linejoin="round" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>`,
  },
  {
    nombre: 'Trabajos',
    color: '#d97706',
    colorLight: '#fffbeb',
    colorBorder: '#fcd34d',
    // Triángulo de obras (cono de seguridad)
    iconPath: `
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>`,
  },
  {
    nombre: 'Libre',
    color: '#16a34a',
    colorLight: '#f0fdf4',
    colorBorder: '#86efac',
    // Check en círculo
    iconPath: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>`,
  },
];

/** Devuelve la config del tipo por nombre (o el primero si no existe) */
export const getTipo = (nombre) =>
  tiposEvento.find(t => t.nombre === nombre) ?? tiposEvento[0];

/**
 * Genera el HTML para un marcador Leaflet divIcon.
 * @param {string} tipoNombre
 * @param {boolean} isActivo
 */
export const buildMarkerHtml = (tipoNombre, isActivo) => {
  const tipo = getTipo(tipoNombre);
  const color = isActivo ? tipo.color : '#6b7280';  // gris si finalizado
  return `
    <div style="
      width:30px;height:30px;
      background:${color};
      border-radius:50%;
      border:2.5px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
      ${isActivo ? '' : 'opacity:0.7;'}
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15"
        viewBox="0 0 24 24" fill="none"
        stroke="white" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round">
        ${tipo.iconPath}
      </svg>
    </div>`;
};
