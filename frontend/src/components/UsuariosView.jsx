import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { formatFecha } from '../utils.js';
import Modal from './Modal.jsx';
import Acciones from './Acciones.jsx';
import DetalleModal from './DetalleModal.jsx';

const VACIO = { username: '', password: '', rol: 'appuser', nombre_completo: '', email: '' };

export default function UsuariosView() {
  const { usuario: actual } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState(null);
  const [errorForm, setErrorForm] = useState(null);
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [viendo, setViendo] = useState(null);

  const cargar = async () => {
    setCargando(true);
    try {
      setUsuarios(await api.listarUsuarios());
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

  const abrirEditar = (u) => {
    setEditId(u.id);
    setForm({
      username: u.username,
      password: '',
      rol: u.rol,
      nombre_completo: u.nombre_completo || '',
      email: u.email || '',
    });
    setErrores({});
    setErrorForm(null);
    setModalAbierto(true);
  };

  const cerrar = () => {
    setModalAbierto(false);
    setForm(VACIO);
    setEditId(null);
    setErrores({});
  };

  const guardar = async (e) => {
    e.preventDefault();
    setErrorForm(null);
    setErrores({});
    setOcupado(true);
    try {
      if (editId) {
        const payload = {
          username: form.username.trim(),
          rol: form.rol,
          nombre_completo: form.nombre_completo.trim(),
          email: form.email.trim(),
        };
        if (form.password) payload.password = form.password;
        await api.actualizarUsuario(editId, payload);
      } else {
        await api.crearUsuario({
          username: form.username.trim(),
          password: form.password,
          rol: form.rol,
          nombre_completo: form.nombre_completo.trim(),
          email: form.email.trim(),
        });
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

  const eliminar = async (u) => {
    if (!confirm(`¿Eliminar al usuario "${u.username}"?`)) return;
    setError(null);
    try {
      await api.eliminarUsuario(u.id);
      await cargar();
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
        title={editId ? 'Editar usuario' : 'Nuevo usuario'}
        onClose={cerrar}
      >
        <form className="card form" onSubmit={guardar}>
          {errorForm && <div className="alert error">{errorForm}</div>}
          <div className="grid">
            <label>
              Usuario
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoFocus
                required
              />
              {errores.username && <span className="campo-error">{errores.username}</span>}
            </label>
            <label>
              Nombre completo
              <input
                type="text"
                value={form.nombre_completo}
                onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
                placeholder="Ej. Ingrid Reyes"
              />
              {errores.nombre_completo && (
                <span className="campo-error">{errores.nombre_completo}</span>
              )}
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="usuario@ejemplo.com"
              />
              {errores.email && <span className="campo-error">{errores.email}</span>}
            </label>
            <label>
              Contraseña {editId && <span className="muted">(vacío = no cambiar)</span>}
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!editId}
              />
              {errores.password && <span className="campo-error">{errores.password}</span>}
            </label>
            <label>
              Rol
              <select
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value })}
              >
                <option value="appuser">appuser</option>
                <option value="admin">admin</option>
              </select>
              {errores.rol && <span className="campo-error">{errores.rol}</span>}
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn primary" disabled={ocupado}>
              {ocupado ? 'Guardando…' : editId ? 'Actualizar' : 'Crear usuario'}
            </button>
            <button type="button" className="btn" onClick={cerrar} disabled={ocupado}>
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <DetalleModal
        open={!!viendo}
        title="Detalle del usuario"
        onClose={() => setViendo(null)}
        campos={
          viendo
            ? [
                { label: 'Usuario', value: viendo.username },
                { label: 'Nombre completo', value: viendo.nombre_completo },
                { label: 'Email', value: viendo.email },
                {
                  label: 'Rol',
                  value: <span className={`badge rol ${viendo.rol}`}>{viendo.rol}</span>,
                },
                {
                  label: 'Creado',
                  value: viendo.created_at ? formatFecha(viendo.created_at.slice(0, 10)) : null,
                },
              ]
            : []
        }
      />

      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre completo</th>
                <th>Email</th>
                <th>Rol</th>
                <th className="right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.username}
                    {u.id === actual?.id && <span className="muted"> (tú)</span>}
                  </td>
                  <td>{u.nombre_completo || <span className="muted">—</span>}</td>
                  <td>{u.email || <span className="muted">—</span>}</td>
                  <td>
                    <span className={`badge rol ${u.rol}`}>{u.rol}</span>
                  </td>
                  <td className="acciones right">
                    <Acciones
                      alinearDerecha
                      onVer={() => setViendo(u)}
                      onEditar={() => abrirEditar(u)}
                      onEliminar={() => eliminar(u)}
                      eliminarDeshabilitado={u.id === actual?.id}
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
