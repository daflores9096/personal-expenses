import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatMoney } from '../utils.js';
import Modal from './Modal.jsx';
import Acciones from './Acciones.jsx';
import DetalleModal from './DetalleModal.jsx';

const VACIO = { titulo: '', categoria_id: '', monto_esperado: '' };

export default function GastosFijosView({ categorias }) {
  const [gastosFijos, setGastosFijos] = useState([]);
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
      setGastosFijos(await api.listarGastosFijos());
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

  const abrirNuevo = () => {
    setForm(VACIO);
    setEditId(null);
    setErrores({});
    setErrorForm(null);
    setModalAbierto(true);
  };

  const abrirEditar = (gf) => {
    setForm({
      titulo: gf.titulo,
      categoria_id: String(gf.categoria_id),
      monto_esperado: gf.monto_esperado,
    });
    setEditId(gf.id);
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
        titulo: form.titulo.trim(),
        categoria_id: Number(form.categoria_id),
        monto_esperado: form.monto_esperado,
      };
      if (editId) {
        await api.actualizarGastoFijo(editId, payload);
      } else {
        await api.crearGastoFijo(payload);
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

  const eliminar = async (gf) => {
    if (!confirm(`¿Eliminar el gasto fijo "${gf.titulo}"?`)) return;
    setError(null);
    try {
      await api.eliminarGastoFijo(gf.id);
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
      </div>

      {error && <div className="alert error">{error}</div>}

      <Modal
        open={modalAbierto}
        title={editId ? 'Editar gasto fijo' : 'Nuevo gasto fijo'}
        onClose={cerrar}
      >
        <form className="card form" onSubmit={guardar}>
          {errorForm && <div className="alert error">{errorForm}</div>}
          <div className="grid">
            <label>
              Título
              <input
                type="text"
                value={form.titulo}
                onChange={set('titulo')}
                placeholder="Ej. Consumo Agua"
                autoFocus
                required
              />
              {errores.titulo && <span className="campo-error">{errores.titulo}</span>}
            </label>
            <label>
              Categoría
              <select value={form.categoria_id} onChange={set('categoria_id')} required>
                <option value="">— Selecciona —</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              {errores.categoria_id && (
                <span className="campo-error">{errores.categoria_id}</span>
              )}
            </label>
            <label>
              Monto esperado
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.monto_esperado}
                onChange={set('monto_esperado')}
                placeholder="0.00"
                required
              />
              {errores.monto_esperado && (
                <span className="campo-error">{errores.monto_esperado}</span>
              )}
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
        title="Detalle del gasto fijo"
        onClose={() => setViendo(null)}
        campos={
          viendo
            ? [
                { label: 'Título', value: viendo.titulo },
                { label: 'Categoría', value: viendo.categoria_nombre },
                { label: 'Monto esperado', value: formatMoney(viendo.monto_esperado) },
                {
                  label: 'Estado (mes actual)',
                  value: viendo.pagado_actual ? (
                    <span className="badge fijo">Pagado</span>
                  ) : (
                    <span className="badge variable">Pendiente</span>
                  ),
                },
              ]
            : []
        }
      />

      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : gastosFijos.length === 0 ? (
        <p className="muted">No hay gastos fijos registrados todavía.</p>
      ) : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr>
                <th>Título</th>
                <th>Categoría</th>
                <th className="right">Monto esperado</th>
                <th>Estado (mes actual)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {gastosFijos.map((gf) => (
                <tr key={gf.id}>
                  <td>{gf.titulo}</td>
                  <td>{gf.categoria_nombre}</td>
                  <td className="right">{formatMoney(gf.monto_esperado)}</td>
                  <td>
                    {gf.pagado_actual ? (
                      <span className="badge fijo">Pagado</span>
                    ) : (
                      <span className="badge variable">Pendiente</span>
                    )}
                  </td>
                  <td className="acciones">
                    <Acciones
                      onVer={() => setViendo(gf)}
                      onEditar={() => abrirEditar(gf)}
                      onEliminar={() => eliminar(gf)}
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
