import { EyeIcon, PencilIcon, TrashIcon } from './icons.jsx';

export default function Acciones({
  onVer,
  onEditar,
  onEliminar,
  eliminarDeshabilitado = false,
  alinearDerecha = false,
}) {
  return (
    <div className={alinearDerecha ? 'acciones-iconos right' : 'acciones-iconos'}>
      {onVer && (
        <button type="button" className="icon-btn view" onClick={onVer} title="Ver" aria-label="Ver">
          <EyeIcon />
        </button>
      )}
      {onEditar && (
        <button
          type="button"
          className="icon-btn edit"
          onClick={onEditar}
          title="Editar"
          aria-label="Editar"
        >
          <PencilIcon />
        </button>
      )}
      {onEliminar && (
        <button
          type="button"
          className="icon-btn danger"
          onClick={onEliminar}
          disabled={eliminarDeshabilitado}
          title="Eliminar"
          aria-label="Eliminar"
        >
          <TrashIcon />
        </button>
      )}
    </div>
  );
}
