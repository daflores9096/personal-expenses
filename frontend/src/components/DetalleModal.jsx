import Modal from './Modal.jsx';

export default function DetalleModal({ open, title, onClose, campos }) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <dl className="detalle-lista">
        {campos.map((c) => (
          <div className="detalle-fila" key={c.label}>
            <dt className="detalle-label">{c.label}</dt>
            <dd className="detalle-valor">
              {c.value === null || c.value === undefined || c.value === '' ? (
                <span className="muted">—</span>
              ) : (
                c.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
