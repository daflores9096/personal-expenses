import { ETIQUETAS_PERIODO, formatFecha } from '../utils.js';
import { usePeriodo } from '../periodo.jsx';

/** Indica el período activo (compartido con Inicio, Gastos e Ingresos). */
export default function PeriodoIndicador() {
  const { periodo, desde, hasta } = usePeriodo();
  const etiqueta = ETIQUETAS_PERIODO[periodo] || 'Período';

  return (
    <p className="muted periodo-indicador">
      Mostrando: <strong>{etiqueta}</strong> ({formatFecha(desde)} – {formatFecha(hasta)})
    </p>
  );
}
