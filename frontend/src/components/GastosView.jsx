import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { usePeriodo } from '../periodo.jsx';
import { enRango, formatFecha, formatMoney } from '../utils.js';
import GastoForm from './GastoForm.jsx';
import Modal from './Modal.jsx';
import PagoGastoFijoModal from './PagoGastoFijoModal.jsx';
import Acciones from './Acciones.jsx';
import DetalleModal from './DetalleModal.jsx';
import PeriodoIndicador from './PeriodoIndicador.jsx';

export default function GastosView({ gastos, categorias, recargar }) {
  const { desde, hasta } = usePeriodo();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filasPorPagina, setFilasPorPagina] = useState(10);
  const [pagina, setPagina] = useState(1);

  const [gastosFijos, setGastosFijos] = useState([]);
  const [pagando, setPagando] = useState(null);
  const [viendo, setViendo] = useState(null);
  const [ordenCampo, setOrdenCampo] = useState('fecha');
  const [ordenDir, setOrdenDir] = useState('desc');

  const alternarOrden = (campo) => {
    if (ordenCampo === campo) {
      setOrdenDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrdenCampo(campo);
      setOrdenDir(campo === 'titulo' ? 'asc' : 'desc');
    }
  };

  const iconoOrden = (campo) => {
    if (ordenCampo !== campo) return '↕';
    return ordenDir === 'asc' ? '↑' : '↓';
  };

  const cargarGastosFijos = useCallback(async () => {
    try {
      setGastosFijos(await api.listarGastosFijos(desde, hasta));
    } catch {
      // Si falla (p. ej. sin permisos), simplemente no se muestran pendientes.
      setGastosFijos([]);
    }
  }, [desde, hasta]);

  useEffect(() => {
    cargarGastosFijos();
  }, [cargarGastosFijos]);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroCategoria, filasPorPagina, desde, hasta]);

  const pendientes = useMemo(
    () => gastosFijos.filter((gf) => !gf.pagado_actual),
    [gastosFijos]
  );

  const trasPagar = useCallback(async () => {
    await Promise.all([recargar(), cargarGastosFijos()]);
  }, [recargar, cargarGastosFijos]);

  const gastosPeriodo = useMemo(
    () => gastos.filter((g) => enRango(g.fecha, desde, hasta)),
    [gastos, desde, hasta]
  );

  const gastosFiltrados = useMemo(() => {
    let lista = gastosPeriodo;

    if (filtroCategoria) {
      lista = lista.filter((g) => String(g.categoria_id) === filtroCategoria);
    }

    const termino = busqueda.trim().toLowerCase();
    if (termino) {
      lista = lista.filter((g) =>
        [g.titulo, g.detalle]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(termino)
      );
    }

    return lista;
  }, [gastosPeriodo, filtroCategoria, busqueda]);

  const gastosOrdenados = useMemo(() => {
    const lista = [...gastosFiltrados];
    lista.sort((a, b) => {
      let cmp = 0;
      if (ordenCampo === 'titulo') {
        cmp = a.titulo.localeCompare(b.titulo, 'es', { sensitivity: 'base' });
      } else {
        cmp = a.fecha.localeCompare(b.fecha);
      }
      if (cmp === 0) cmp = b.id - a.id;
      return ordenDir === 'asc' ? cmp : -cmp;
    });
    return lista;
  }, [gastosFiltrados, ordenCampo, ordenDir]);

  const gastosPaginados = useMemo(() => {
    const inicio = (pagina - 1) * filasPorPagina;
    return gastosOrdenados.slice(inicio, inicio + filasPorPagina);
  }, [gastosOrdenados, pagina, filasPorPagina]);

  const barraFiltros = (
    <div className="lista-filtros-bar">
      <p className="lista-filtros-titulo">Buscar y filtrar</p>
      <div className="lista-filtros-controles">
        <label className="filtro-campo filtro-campo-buscador">
          <span className="filtro-campo-label">Buscar por título y detalle</span>
          <input
            type="search"
            className="filtro"
            placeholder="Buscar…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>
        <label className="filtro-campo">
          <span className="filtro-campo-label">Categoría</span>
          <select
            className="filtro"
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="filtro-campo">
          <span className="filtro-campo-label">Filas por página</span>
          <select
            className="filtro"
            value={filasPorPagina}
            onChange={(e) => setFilasPorPagina(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
      </div>
    </div>
  );

  const total = useMemo(
    () => gastosFiltrados.reduce((acc, g) => acc + Number(g.monto), 0),
    [gastosFiltrados]
  );

  const abrirNuevo = () => {
    setEditando(null);
    setMostrarForm(true);
  };

  const abrirEditar = (gasto) => {
    setEditando(gasto);
    setMostrarForm(true);
  };

  const cerrarForm = () => {
    setMostrarForm(false);
    setEditando(null);
  };

  const guardar = async (datos) => {
    setGuardando(true);
    try {
      if (editando) {
        await api.actualizarGasto(editando.id, datos);
      } else {
        await api.crearGasto(datos);
      }
      await Promise.all([recargar(), cargarGastosFijos()]);
      cerrarForm();
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (gasto) => {
    if (!confirm(`¿Eliminar el gasto "${gasto.titulo}"?`)) return;
    setError(null);
    try {
      await api.eliminarGasto(gasto.id);
      // Recarga también los gastos fijos: si el gasto provenía de un gasto fijo,
      // este vuelve a aparecer como pendiente en la lista superior.
      await Promise.all([recargar(), cargarGastosFijos()]);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <section>
      <div className="toolbar">
        <div className="toolbar-left">
          <button className="btn primary" onClick={abrirNuevo}>
            + Agregar nuevo
          </button>
        </div>
        <div className="total">
          Total: <strong>{formatMoney(total)}</strong>
        </div>
      </div>

      <PeriodoIndicador />

      {error && <div className="alert error">{error}</div>}

      {pendientes.length > 0 && (
        <div className="pendientes">
          <h3 className="pendientes-titulo">Gastos fijos pendientes</h3>
          <div className="pendientes-lista">
            {pendientes.map((gf) => (
              <button
                key={gf.id}
                type="button"
                className="pendiente-chip"
                onClick={() => setPagando(gf)}
                title="Registrar pago"
              >
                <span className="pendiente-nombre">{gf.titulo}</span>
                <span className="pendiente-cat">{gf.categoria_nombre}</span>
                <span className="pendiente-monto">{formatMoney(gf.monto_esperado)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="tabla-wrap">
        {barraFiltros}

        {gastosFiltrados.length === 0 ? (
          <p className="lista-vacia muted">
            {gastos.length === 0
              ? 'No hay gastos registrados todavía.'
              : busqueda.trim() || filtroCategoria
                ? 'No hay gastos que coincidan con los filtros.'
                : 'No hay gastos en el período seleccionado.'}
          </p>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>
                  <button type="button" className="th-sort" onClick={() => alternarOrden('fecha')}>
                    Fecha <span className="th-sort-icon">{iconoOrden('fecha')}</span>
                  </button>
                </th>
                <th>
                  <button type="button" className="th-sort" onClick={() => alternarOrden('titulo')}>
                    Título <span className="th-sort-icon">{iconoOrden('titulo')}</span>
                  </button>
                </th>
                <th>Categoría</th>
                <th>Tipo</th>
                <th className="right">Monto</th>
                <th>Creado por</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {gastosPaginados.map((g) => (
                <tr key={g.id}>
                  <td>{formatFecha(g.fecha)}</td>
                  <td>{g.titulo}</td>
                  <td>{g.categoria_nombre}</td>
                  <td>
                    <span className={`badge ${g.tipo}`}>{g.tipo}</span>
                  </td>
                  <td className="right">{formatMoney(g.monto)}</td>
                  <td>{g.usuario_nombre || <span className="muted">—</span>}</td>
                  <td className="acciones">
                    <Acciones
                      onVer={() => setViendo(g)}
                      onEditar={() => abrirEditar(g)}
                      onEliminar={() => eliminar(g)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={mostrarForm}
        title={editando ? 'Editar gasto' : 'Nuevo gasto'}
        onClose={cerrarForm}
      >
        <GastoForm
          categorias={categorias}
          inicial={editando}
          onGuardar={guardar}
          onCancelar={cerrarForm}
          guardando={guardando}
        />
      </Modal>

      <PagoGastoFijoModal
        gastoFijo={pagando}
        onClose={() => setPagando(null)}
        onPagado={trasPagar}
      />

      <DetalleModal
        open={!!viendo}
        title="Detalle del gasto"
        onClose={() => setViendo(null)}
        campos={
          viendo
            ? [
                { label: 'Fecha', value: formatFecha(viendo.fecha) },
                { label: 'Título', value: viendo.titulo },
                { label: 'Categoría', value: viendo.categoria_nombre },
                {
                  label: 'Tipo',
                  value: <span className={`badge ${viendo.tipo}`}>{viendo.tipo}</span>,
                },
                { label: 'Monto', value: formatMoney(viendo.monto) },
                { label: 'Creado por', value: viendo.usuario_nombre },
                { label: 'Detalle', value: viendo.detalle },
              ]
            : []
        }
      />

    </section>
  );
}
