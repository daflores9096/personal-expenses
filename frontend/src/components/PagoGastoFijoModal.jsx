import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatMoney, hoyISO } from '../utils.js';
import Modal from './Modal.jsx';

export default function PagoGastoFijoModal({ gastoFijo, onClose, onPagado }) {
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(hoyISO());
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (gastoFijo) {
      setMonto(gastoFijo.monto_esperado ?? '');
      setFecha(hoyISO());
      setErrores({});
      setError(null);
    }
  }, [gastoFijo]);

  const guardar = async (e) => {
    e.preventDefault();
    setError(null);
    setErrores({});
    setGuardando(true);
    try {
      await api.pagarGastoFijo(gastoFijo.id, { monto, fecha });
      await onPagado();
      onClose();
    } catch (err) {
      if (err.campos) setErrores(err.campos);
      else setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal open={!!gastoFijo} title="Registrar pago — gasto fijo" onClose={onClose}>
      <form className="card form" onSubmit={guardar}>
        {error && <div className="alert error">{error}</div>}

        <div className="pago-info">
          <div>
            <span className="pago-label">Título</span>
            <span className="pago-valor">{gastoFijo?.titulo}</span>
          </div>
          <div>
            <span className="pago-label">Monto esperado</span>
            <span className="pago-valor monto">{formatMoney(gastoFijo?.monto_esperado)}</span>
          </div>
          <div>
            <span className="pago-label">Tipo</span>
            <span className="badge fijo">Fijo</span>
          </div>
          <div>
            <span className="pago-label">Categoría</span>
            <span className="pago-valor">{gastoFijo?.categoria_nombre}</span>
          </div>
        </div>

        <div className="grid">
          <label>
            Monto real
            <input
              type="number"
              step="0.01"
              min="0"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
              autoFocus
            />
            {errores.monto && <span className="campo-error">{errores.monto}</span>}
          </label>
          <label>
            Fecha
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
            {errores.fecha && <span className="campo-error">{errores.fecha}</span>}
          </label>
        </div>

        <div className="form-actions end">
          <button type="button" className="btn" onClick={onClose} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" className="btn success" disabled={guardando}>
            {guardando ? 'Guardando…' : '💾 Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
