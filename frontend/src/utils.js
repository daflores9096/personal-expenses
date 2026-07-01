// Utilidades de formato.

export function formatMoney(monto) {
  const num = Number(monto) || 0;
  return num.toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatFecha(fecha) {
  if (!fecha) return '';
  // fecha viene como 'YYYY-MM-DD'
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y}`;
}

export function toISO(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

export function hoyISO() {
  return toISO(new Date());
}

// Primer día del mes calendario actual (YYYY-MM-DD).
export function inicioMesISO() {
  const d = new Date();
  return toISO(new Date(d.getFullYear(), d.getMonth(), 1));
}

// Convierte 'YYYY-MM-DD' a Date en medianoche local.
export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Devuelve true si la fecha 'YYYY-MM-DD' está dentro del rango [desde, hasta] (inclusive).
export function enRango(fecha, desde, hasta) {
  return (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
}

export const ETIQUETAS_PERIODO = {
  'mes-actual': 'Mes actual',
  'mes-anterior': 'Mes anterior',
  'ultimos-3-meses': 'Últimos 3 meses',
  rango: 'Rango de fechas',
};

/** Calcula desde/hasta según el tipo de período (excepto 'rango'). */
export function calcularFechasPeriodo(tipo) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (tipo === 'mes-actual') {
    return { desde: toISO(new Date(y, m, 1)), hasta: hoyISO() };
  }
  if (tipo === 'mes-anterior') {
    return { desde: toISO(new Date(y, m - 1, 1)), hasta: toISO(new Date(y, m, 0)) };
  }
  if (tipo === 'ultimos-3-meses') {
    return { desde: toISO(new Date(y, m - 2, 1)), hasta: hoyISO() };
  }
  return { desde: inicioMesISO(), hasta: hoyISO() };
}
