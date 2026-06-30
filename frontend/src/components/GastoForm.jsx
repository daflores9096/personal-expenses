import { useEffect, useState } from 'react';
import { hoyISO } from '../utils.js';

const VACIO = {
  fecha: hoyISO(),
  titulo: '',
  monto: '',
  tipo: 'variable',
  detalle: '',
  categoria_id: '',
};

export default function GastoForm({ categorias, inicial, onGuardar, onCancelar, guardando }) {
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});

  useEffect(() => {
    if (inicial) {
      setForm({
        fecha: inicial.fecha,
        titulo: inicial.titulo,
        monto: inicial.monto,
        tipo: inicial.tipo,
        detalle: inicial.detalle || '',
        categoria_id: String(inicial.categoria_id),
      });
    } else {
      setForm({ ...VACIO, fecha: hoyISO() });
    }
    setErrores({});
  }, [inicial]);

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErrores({});
    try {
      await onGuardar({
        fecha: form.fecha,
        titulo: form.titulo.trim(),
        monto: form.monto,
        tipo: form.tipo,
        detalle: form.detalle.trim(),
        categoria_id: Number(form.categoria_id),
      });
    } catch (err) {
      if (err.campos) {
        setErrores(err.campos);
      } else {
        setErrores({ general: err.message });
      }
    }
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h3>{inicial ? 'Editar gasto' : 'Nuevo gasto'}</h3>

      {errores.general && <div className="alert error">{errores.general}</div>}

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
            placeholder="Ej. Supermercado"
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

        <label>
          Tipo
          <select value={form.tipo} onChange={set('tipo')}>
            <option value="variable">Variable</option>
            <option value="fijo">Fijo</option>
          </select>
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
          {errores.categoria_id && <span className="campo-error">{errores.categoria_id}</span>}
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
        <button type="submit" className="btn primary" disabled={guardando}>
          {guardando ? 'Guardando…' : inicial ? 'Actualizar' : 'Guardar'}
        </button>
        {onCancelar && (
          <button type="button" className="btn" onClick={onCancelar} disabled={guardando}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
