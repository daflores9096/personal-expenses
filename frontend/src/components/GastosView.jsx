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

  const [gastosFijos, setGastosFijos] = useState([]);
  const [pagando, setPagando] = useState(null);
  const [viendo, setViendo] = useState(null);

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
    if (!filtroCategoria) return gastosPeriodo;
    return gastosPeriodo.filter((g) => String(g.categoria_id) === filtroCategoria);
  }, [gastosPeriodo, filtroCategoria]);

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
          <select
            className="filtro"
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
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
                { label: 'Detalle', value: viendo.detalle },
              ]
            : []
        }
      />

      {gastosFiltrados.length === 0 ? (
        <p className="muted">
          {gastos.length === 0
            ? 'No hay gastos registrados todavía.'
            : 'No hay gastos en el período seleccionado.'}
        </p>
      ) : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Título</th>
                <th>Categoría</th>
                <th>Tipo</th>
                <th className="right">Monto</th>
                <th>Detalle</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {gastosFiltrados.map((g) => (
                <tr key={g.id}>
                  <td>{formatFecha(g.fecha)}</td>
                  <td>{g.titulo}</td>
                  <td>{g.categoria_nombre}</td>
                  <td>
                    <span className={`badge ${g.tipo}`}>{g.tipo}</span>
                  </td>
                  <td className="right">{formatMoney(g.monto)}</td>
                  <td className="detalle">{g.detalle}</td>
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
        </div>
      )}
    </section>
  );
}
