import { useAuth } from '../auth.jsx';

// Cada opción indica si es exclusiva de admin.
const MENU = [
  { id: 'inicio', label: 'Inicio', icon: '🏠', adminOnly: false },
  { id: 'gastos', label: 'Gastos', icon: '🧾', adminOnly: false },
  { id: 'ingresos', label: 'Ingresos', icon: '💵', adminOnly: false },
  { id: 'gastos-fijos', label: 'Gastos Fijos', icon: '📌', adminOnly: true },
  { id: 'categorias', label: 'Categorías', icon: '🏷️', adminOnly: true },
  { id: 'usuarios', label: 'Usuarios', icon: '👥', adminOnly: true },
];

export default function Sidebar({ activo, onSelect, abierto, onCerrar }) {
  const { usuario, esAdmin } = useAuth();

  const items = MENU.filter((m) => !m.adminOnly || esAdmin);

  return (
    <>
      {abierto && <div className="sidebar-backdrop" onClick={onCerrar} />}
      <aside className={abierto ? 'sidebar open' : 'sidebar'}>
        <div className="sidebar-user-top">
          <span className="sidebar-user-label">Conectado como</span>
          <div className="sidebar-user-row">
            <span className="sidebar-user-name">{usuario?.username}</span>
            <span className={`badge rol ${usuario?.rol}`}>{usuario?.rol}</span>
          </div>
        </div>

        <div className="sidebar-seccion-label">Menú</div>
        <nav className="sidebar-nav">
          {items.map((item) => (
            <button
              key={item.id}
              className={activo === item.id ? 'sidebar-link active' : 'sidebar-link'}
              onClick={() => {
                onSelect(item.id);
                onCerrar?.();
              }}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
