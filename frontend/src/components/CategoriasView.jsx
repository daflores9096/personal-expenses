import { useState } from 'react';
import { api } from '../api.js';
import Modal from './Modal.jsx';
import Acciones from './Acciones.jsx';
import DetalleModal from './DetalleModal.jsx';

export default function CategoriasView({ categorias, recargar, recargarGastos }) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState(null);
  const [errorForm, setErrorForm] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [viendo, setViendo] = useState(null);

  const abrirNuevo = () => {
    setEditando(null);
    setNombre('');
    setErrorForm(null);
    setModalAbierto(true);
  };

  const abrirEditar = (cat) => {
    setEditando(cat);
    setNombre(cat.nombre);
    setErrorForm(null);
    setModalAbierto(true);
  };

  const cerrar = () => {
    setModalAbierto(false);
    setEditando(null);
    setNombre('');
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setErrorForm(null);
    setOcupado(true);
    try {
      if (editando) {
        await api.actualizarCategoria(editando.id, nombre.trim());
        await Promise.all([recargar(), recargarGastos()]);
      } else {
        await api.crearCategoria(nombre.trim());
        await recargar();
      }
      cerrar();
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setOcupado(false);
    }
  };

  const eliminar = async (cat) => {
    if (!confirm(`¿Eliminar la categoría "${cat.nombre}"?`)) return;
    setError(null);
    try {
      await api.eliminarCategoria(cat.id);
      await recargar();
    } catch (err) {
      setError(err.message);
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
      </div>

      {error && <div className="alert error">{error}</div>}

      <Modal
        open={modalAbierto}
        title={editando ? 'Editar categoría' : 'Nueva categoría'}
        onClose={cerrar}
      >
        <form className="card form" onSubmit={guardar}>
          {errorForm && <div className="alert error">{errorForm}</div>}
          <div className="grid">
            <label className="full">
              Nombre
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Educación"
                autoFocus
                required
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn primary" disabled={ocupado}>
              {ocupado ? 'Guardando…' : editando ? 'Actualizar' : 'Guardar'}
            </button>
            <button type="button" className="btn" onClick={cerrar} disabled={ocupado}>
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <DetalleModal
        open={!!viendo}
        title="Detalle de la categoría"
        onClose={() => setViendo(null)}
        campos={viendo ? [{ label: 'Nombre', value: viendo.nombre }] : []}
      />

      <div className="tabla-wrap">
        <table className="tabla">
          <thead>
            <tr>
              <th>Categoría</th>
              <th className="right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((c) => (
              <tr key={c.id}>
                <td>{c.nombre}</td>
                <td className="acciones right">
                  <Acciones
                    alinearDerecha
                    onVer={() => setViendo(c)}
                    onEditar={() => abrirEditar(c)}
                    onEliminar={() => eliminar(c)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
