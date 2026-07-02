const OPCIONES_FILAS = [10, 25, 50, 100];

export default function Paginacion({
  pagina,
  totalItems,
  filasPorPagina,
  onPaginaChange,
  onFilasPorPaginaChange,
}) {
  if (totalItems === 0) return null;

  const totalPaginas = Math.max(1, Math.ceil(totalItems / filasPorPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * filasPorPagina + 1;
  const fin = Math.min(paginaActual * filasPorPagina, totalItems);

  return (
    <div className="paginacion">
      <div className="paginacion-izq">
        {onFilasPorPaginaChange && (
          <label className="paginacion-filas">
            <span className="paginacion-filas-label">Filas por página</span>
            <select
              className="filtro"
              value={filasPorPagina}
              onChange={(e) => onFilasPorPaginaChange(Number(e.target.value))}
            >
              {OPCIONES_FILAS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <span className="paginacion-info">
        {inicio}–{fin} de {totalItems}
      </span>

      <div className="paginacion-controles">
        <button
          type="button"
          className="btn paginacion-btn"
          disabled={paginaActual <= 1}
          onClick={() => onPaginaChange(paginaActual - 1)}
        >
          Anterior
        </button>
        <span className="paginacion-pagina">
          Página {paginaActual} de {totalPaginas}
        </span>
        <button
          type="button"
          className="btn paginacion-btn"
          disabled={paginaActual >= totalPaginas}
          onClick={() => onPaginaChange(paginaActual + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
