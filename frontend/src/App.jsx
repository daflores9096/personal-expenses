import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { useAuth } from './auth.jsx';
import Login from './components/Login.jsx';
import Sidebar from './components/Sidebar.jsx';
import BottomNav from './components/BottomNav.jsx';
import InicioView from './components/InicioView.jsx';
import GastosView from './components/GastosView.jsx';
import IngresosView from './components/IngresosView.jsx';
import GastosFijosView from './components/GastosFijosView.jsx';
import CategoriasView from './components/CategoriasView.jsx';
import UsuariosView from './components/UsuariosView.jsx';

const TITULOS = {
  inicio: 'Inicio',
  gastos: 'Gastos',
  ingresos: 'Ingresos',
  'gastos-fijos': 'Gastos Fijos',
  categorias: 'Categorías',
  usuarios: 'Usuarios',
};

export default function App() {
  const { usuario, esAdmin, cargando: cargandoAuth, logout } = useAuth();
  const [seccion, setSeccion] = useState('inicio');
  const [sidebarAbierto, setSidebarAbierto] = useState(false);

  const [categorias, setCategorias] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorGlobal, setErrorGlobal] = useState(null);

  const cargarCategorias = useCallback(async () => {
    setCategorias(await api.listarCategorias());
  }, []);

  const cargarGastos = useCallback(async () => {
    setGastos(await api.listarGastos());
  }, []);

  useEffect(() => {
    if (usuario) setSeccion('inicio');
  }, [usuario?.id]);

  useEffect(() => {
    if (!usuario) return;
    (async () => {
      try {
        setCargandoDatos(true);
        await Promise.all([cargarCategorias(), cargarGastos()]);
        setErrorGlobal(null);
      } catch (e) {
        setErrorGlobal(e.message);
      } finally {
        setCargandoDatos(false);
      }
    })();
  }, [usuario, cargarCategorias, cargarGastos]);

  if (cargandoAuth) {
    return <div className="login-screen"><p className="muted">Cargando…</p></div>;
  }

  if (!usuario) {
    return <Login />;
  }

  // Evita que un appuser vea secciones de admin (defensa adicional al menú).
  const SECCIONES_ADMIN = ['gastos-fijos', 'categorias', 'usuarios'];
  const seccionEfectiva =
    !esAdmin && SECCIONES_ADMIN.includes(seccion) ? 'inicio' : seccion;

  const renderContenido = () => {
    if (cargandoDatos && (seccionEfectiva === 'gastos' || seccionEfectiva === 'categorias')) {
      return <p className="muted">Cargando…</p>;
    }
    switch (seccionEfectiva) {
      case 'inicio':
        return <InicioView />;
      case 'categorias':
        return (
          <CategoriasView
            categorias={categorias}
            recargar={cargarCategorias}
            recargarGastos={cargarGastos}
          />
        );
      case 'ingresos':
        return <IngresosView />;
      case 'gastos-fijos':
        return <GastosFijosView categorias={categorias} />;
      case 'usuarios':
        return <UsuariosView />;
      case 'gastos':
      default:
        return (
          <GastosView gastos={gastos} categorias={categorias} recargar={cargarGastos} />
        );
    }
  };

  return (
    <div className="layout">
      <Sidebar
        activo={seccionEfectiva}
        onSelect={setSeccion}
        abierto={sidebarAbierto}
        onCerrar={() => setSidebarAbierto(false)}
      />

      <div className="content">
        <header className="topbar">
          <h1>{TITULOS[seccionEfectiva] || 'Control de Gastos'}</h1>
          <button className="topbar-logout" onClick={logout}>
            ⎋ Cerrar sesión
          </button>
        </header>

        <main className="container">
          {errorGlobal && <div className="alert error">{errorGlobal}</div>}
          {renderContenido()}
        </main>
      </div>

      <BottomNav
        activo={seccionEfectiva}
        onSelect={setSeccion}
        onAbrirMenu={() => setSidebarAbierto(true)}
      />
    </div>
  );
}
