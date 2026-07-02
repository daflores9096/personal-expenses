import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { usePeriodo } from '../periodo.jsx';
import { enRango, formatFecha, formatMoney, hoyISO } from '../utils.js';
import Modal from './Modal.jsx';
import Acciones from './Acciones.jsx';
import DetalleModal from './DetalleModal.jsx';
import PeriodoIndicador from './PeriodoIndicador.jsx';
import Paginacion from './Paginacion.jsx';

const VACIO = { fecha: hoyISO(), titulo: '', detalle: '', monto: '' };

export default function IngresosView() {
  const { desde, hasta } = usePeriodo();
  const [ingresos, setIngresos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [errorForm, setErrorForm] = useState(null);
  const [errores, setErrores] = useState({});
  const [ocupado, setOcupado] = useState(false);
  const [viendo, setViendo] = useState(null);
  const [ordenCampo, setOrdenCampo] = useState('fecha');
  const [ordenDir, setOrdenDir] = useState('desc');
  const [filasPorPagina, setFilasPorPagina] = useState(10);
  const [pagina, setPagina] = useState(1);

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

  const cargar = async () => {
    setCargando(true);
    try {
      setIngresos(await api.listarIngresos());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    setPagina(1);
  }, [filasPorPagina, desde, hasta, ordenCampo, ordenDir]);

  const ingresosPeriodo = useMemo(
    () => ingresos.filter((i) => enRango(i.fecha, desde, hasta)),
    [ingresos, desde, hasta]
  );

  const ingresosOrdenados = useMemo(() => {
    const lista = [...ingresosPeriodo];
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
  }, [ingresosPeriodo, ordenCampo, ordenDir]);

  const totalPaginas = Math.max(1, Math.ceil(ingresosOrdenados.length / filasPorPagina));
  const paginaActual = Math.min(pagina, totalPaginas);

  const ingresosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * filasPorPagina;
    return ingresosOrdenados.slice(inicio, inicio + filasPorPagina);
  }, [ingresosOrdenados, paginaActual, filasPorPagina]);

  const total = useMemo(
    () => ingresosPeriodo.reduce((acc, i) => acc + Number(i.monto), 0),
    [ingresosPeriodo]
  );

  const abrirNuevo = () => {
    setForm({ ...VACIO, fecha: hoyISO() });
    setEditId(null);
    setErrores({});
    setErrorForm(null);
    setModalAbierto(true);
  };

  const abrirEditar = (ingreso) => {
    setForm({
      fecha: ingreso.fecha,
      titulo: ingreso.titulo,
      detalle: ingreso.detalle || '',
      monto: ingreso.monto,
    });
    setEditId(ingreso.id);
    setErrores({});
    setErrorForm(null);
    setModalAbierto(true);
  };

  const cerrar = () => {
    setModalAbierto(false);
    setEditId(null);
    setForm(VACIO);
    setErrores({});
  };

  const guardar = async (e) => {
    e.preventDefault();
    setErrorForm(null);
    setErrores({});
    setOcupado(true);
    try {
      const payload = {
        fecha: form.fecha,
        titulo: form.titulo.trim(),
        detalle: form.detalle.trim(),
        monto: form.monto,
      };
      if (editId) {
        await api.actualizarIngreso(editId, payload);
      } else {
        await api.crearIngreso(payload);
      }
      cerrar();
      await cargar();
    } catch (err) {
      if (err.campos) setErrores(err.campos);
      else setErrorForm(err.message);
    } finally {
      setOcupado(false);
    }
  };

  const eliminar = async (ingreso) => {
    if (!confirm(`¿Eliminar el ingreso "${ingreso.titulo}"?`)) return;
    setError(null);
    try {
      await api.eliminarIngreso(ingreso.id);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

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

      <Modal
        open={modalAbierto}
        title={editId ? 'Editar ingreso' : 'Nuevo ingreso'}
        onClose={cerrar}
      >
        <form className="card form" onSubmit={guardar}>
          {errorForm && <div className="alert error">{errorForm}</div>}
          <div className="grid">
            <label>
              Fecha
              <input type="date" value={form.fecha} onChange={set('fecha')} required />
              {errores.fecha && <span className="campo-error">{errores.fecha}</span>}
            </label>
            <label>
              Título
              <input
                type="text"
                value={form.titulo}
                onChange={set('titulo')}
                placeholder="Ej. Salario"
                required
              />
              {errores.titulo && <span className="campo-error">{errores.titulo}</span>}
            </label>
            <label>
              Monto
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.monto}
                onChange={set('monto')}
                placeholder="0.00"
                required
              />
              {errores.monto && <span className="campo-error">{errores.monto}</span>}
            </label>
            <label className="full">
              Detalle
              <textarea
                value={form.detalle}
                onChange={set('detalle')}
                placeholder="Notas opcionales"
                rows={2}
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn primary" disabled={ocupado}>
              {ocupado ? 'Guardando…' : editId ? 'Actualizar' : 'Guardar'}
            </button>
            <button type="button" className="btn" onClick={cerrar} disabled={ocupado}>
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <DetalleModal
        open={!!viendo}
        title="Detalle del ingreso"
        onClose={() => setViendo(null)}
        campos={
          viendo
            ? [
                { label: 'Fecha', value: formatFecha(viendo.fecha) },
                { label: 'Título', value: viendo.titulo },
                { label: 'Monto', value: formatMoney(viendo.monto) },
                { label: 'Detalle', value: viendo.detalle },
                { label: 'Creado por', value: viendo.usuario_nombre },
              ]
            : []
        }
      />

      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : ingresosPeriodo.length === 0 ? (
        <p className="muted">
          {ingresos.length === 0
            ? 'No hay ingresos registrados todavía.'
            : 'No hay ingresos en el período seleccionado.'}
        </p>
      ) : (
        <div className="tabla-wrap">
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
                <th className="right">Monto</th>
                <th>Creado por</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ingresosPaginados.map((i) => (
                <tr key={i.id}>
                  <td>{formatFecha(i.fecha)}</td>
                  <td>{i.titulo}</td>
                  <td className="right">{formatMoney(i.monto)}</td>
                  <td>{i.usuario_nombre || <span className="muted">—</span>}</td>
                  <td className="acciones">
                    <Acciones
                      onVer={() => setViendo(i)}
                      onEditar={() => abrirEditar(i)}
                      onEliminar={() => eliminar(i)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Paginacion
            pagina={paginaActual}
            totalItems={ingresosOrdenados.length}
            filasPorPagina={filasPorPagina}
            onPaginaChange={setPagina}
            onFilasPorPaginaChange={setFilasPorPagina}
          />
        </div>
      )}
    </section>
  );
}
