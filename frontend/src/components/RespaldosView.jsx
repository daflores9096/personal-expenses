import { useState } from 'react';
import { api } from '../api.js';

export default function RespaldosView() {
  const [descargando, setDescargando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  const crearRespaldo = async () => {
    setError(null);
    setExito(null);
    setDescargando(true);
    try {
      await api.descargarRespaldo();
      setExito('Respaldo descargado correctamente.');
    } catch (err) {
      setError(err.detalle ? `${err.message} (${err.detalle})` : err.message);
    } finally {
      setDescargando(false);
    }
  };

  const restaurar = async (e) => {
    e.preventDefault();
    setError(null);
    setExito(null);

    if (!archivo) {
      setError('Selecciona un archivo .sql');
      return;
    }
    if (confirmacion !== 'RESTAURAR') {
      setError('Debes escribir RESTAURAR para confirmar');
      return;
    }

    setRestaurando(true);
    try {
      await api.restaurarRespaldo(archivo, confirmacion);
      setExito('Base de datos restaurada correctamente.');
      setArchivo(null);
      setConfirmacion('');
      e.target.reset();
    } catch (err) {
      setError(err.detalle ? `${err.message} (${err.detalle})` : err.message);
    } finally {
      setRestaurando(false);
    }
  };

  const puedeRestaurar = archivo && confirmacion === 'RESTAURAR' && !restaurando;

  return (
    <section className="respaldos">
      {error && <div className="alert error">{error}</div>}
      {exito && <div className="alert success">{exito}</div>}

      <div className="card respaldo-card">
        <h2 className="respaldo-titulo">Respaldos</h2>
        <p className="muted">Crea y restaura copias completas de la base de datos.</p>
      </div>

      <div className="card respaldo-card respaldo-accion">
        <div className="respaldo-accion-texto">
          <h3 className="respaldo-subtitulo">Crear respaldo</h3>
          <p className="muted">
            Descarga un archivo .sql con la estructura y todos los datos actuales.
          </p>
        </div>
        <button
          type="button"
          className="btn primary respaldo-btn-crear"
          onClick={crearRespaldo}
          disabled={descargando}
        >
          ⬇ {descargando ? 'Generando…' : 'Crear respaldo'}
        </button>
      </div>

      <form className="card respaldo-card respaldo-restore" onSubmit={restaurar}>
        <h3 className="respaldo-subtitulo">Restaurar respaldo</h3>
        <p className="muted">
          Sube un .sql generado por esta app. La base actual se limpiará antes de restaurar
          tablas y contenido.
        </p>

        <label className="respaldo-campo">
          Archivo SQL
          <input
            type="file"
            accept=".sql,text/sql"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          />
        </label>

        <label className="respaldo-campo">
          Confirmación
          <input
            type="text"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            placeholder="Escribe RESTAURAR"
            autoComplete="off"
          />
        </label>

        <div className="respaldo-restore-actions">
          <button type="submit" className="btn danger-outline" disabled={!puedeRestaurar}>
            ☁ {restaurando ? 'Restaurando…' : 'Restaurar respaldo'}
          </button>
        </div>
      </form>
    </section>
  );
}
