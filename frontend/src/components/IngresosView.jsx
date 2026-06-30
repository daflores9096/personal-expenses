import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { formatFecha, formatMoney, hoyISO } from '../utils.js';
import Modal from './Modal.jsx';
import Acciones from './Acciones.jsx';
import DetalleModal from './DetalleModal.jsx';

const VACIO = { fecha: hoyISO(), titulo: '', detalle: '', monto: '' };

export default function IngresosView() {
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

  const total = useMemo(
    () => ingresos.reduce((acc, i) => acc + Number(i.monto), 0),
    [ingresos]
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
      ) : ingresos.length === 0 ? (
        <p className="muted">No hay ingresos registrados todavía.</p>
      ) : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Título</th>
                <th className="right">Monto</th>
                <th>Detalle</th>
                <th>Creado por</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ingresos.map((i) => (
                <tr key={i.id}>
                  <td>{formatFecha(i.fecha)}</td>
                  <td>{i.titulo}</td>
                  <td className="right">{formatMoney(i.monto)}</td>
                  <td className="detalle">{i.detalle}</td>
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
        </div>
      )}
    </section>
  );
}
