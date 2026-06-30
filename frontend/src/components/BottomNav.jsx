// Barra de navegación inferior (solo visible en móvil).
// Accesos rápidos + botón "Menú" que abre el sidebar con el resto de opciones.
const ITEMS = [
  { id: 'inicio', label: 'Inicio', icon: '🏠' },
  { id: 'ingresos', label: 'Ingresos', icon: '💵' },
  { id: 'gastos', label: 'Gastos', icon: '🧾' },
];

export default function BottomNav({ activo, onSelect, onAbrirMenu }) {
  const menuActivo = !ITEMS.some((i) => i.id === activo);

  return (
    <nav className="bottom-nav">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          className={activo === item.id ? 'bottom-item active' : 'bottom-item'}
          onClick={() => onSelect(item.id)}
        >
          <span className="bottom-icon">{item.icon}</span>
          <span className="bottom-label">{item.label}</span>
        </button>
      ))}
      <button
        className={menuActivo ? 'bottom-item active' : 'bottom-item'}
        onClick={onAbrirMenu}
      >
        <span className="bottom-icon">☰</span>
        <span className="bottom-label">Menú</span>
      </button>
    </nav>
  );
}
