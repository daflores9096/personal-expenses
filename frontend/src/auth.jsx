import { createContext, useContext, useEffect, useState } from 'react';
import { api, tokenStore, setOnUnauthorized } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  const logout = () => {
    tokenStore.clear();
    setUsuario(null);
  };

  useEffect(() => {
    setOnUnauthorized(() => {
      tokenStore.clear();
      setUsuario(null);
    });
  }, []);

  // Al cargar, si hay token guardado intentamos recuperar el usuario.
  useEffect(() => {
    (async () => {
      if (!tokenStore.get()) {
        setCargando(false);
        return;
      }
      try {
        const me = await api.me();
        setUsuario(me);
      } catch {
        tokenStore.clear();
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const login = async (username, password) => {
    const { token, usuario: u } = await api.login(username, password);
    tokenStore.set(token);
    setUsuario(u);
    return u;
  };

  const esAdmin = usuario?.rol === 'admin';

  return (
    <AuthContext.Provider value={{ usuario, esAdmin, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
