// Cliente HTTP ligero para la API de gastos.
// Todas las rutas son relativas a /api (nginx o el proxy de Vite las redirigen al backend).

const BASE = '/api';
const TOKEN_KEY = 'gastos_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// Callback que se dispara cuando la API responde 401 (sesión inválida/expirada).
let onUnauthorized = null;
export function setOnUnauthorized(cb) {
  onUnauthorized = cb;
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = tokenStore.get();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401 && onUnauthorized) {
    onUnauthorized();
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    const mensaje = data?.error || `Error ${res.status}`;
    const error = new Error(mensaje);
    error.campos = data?.campos;
    error.status = res.status;
    throw error;
  }

  return data;
}

export const api = {
  // Autenticación
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request('/auth/me'),

  // Usuarios (solo admin)
  listarUsuarios: () => request('/usuarios'),
  crearUsuario: (usuario) =>
    request('/usuarios', { method: 'POST', body: JSON.stringify(usuario) }),
  actualizarUsuario: (id, usuario) =>
    request(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(usuario) }),
  eliminarUsuario: (id) => request(`/usuarios/${id}`, { method: 'DELETE' }),

  // Categorías
  listarCategorias: () => request('/categorias'),
  crearCategoria: (nombre) =>
    request('/categorias', { method: 'POST', body: JSON.stringify({ nombre }) }),
  actualizarCategoria: (id, nombre) =>
    request(`/categorias/${id}`, { method: 'PUT', body: JSON.stringify({ nombre }) }),
  eliminarCategoria: (id) => request(`/categorias/${id}`, { method: 'DELETE' }),

  // Gastos
  listarGastos: () => request('/gastos'),
  crearGasto: (gasto) =>
    request('/gastos', { method: 'POST', body: JSON.stringify(gasto) }),
  actualizarGasto: (id, gasto) =>
    request(`/gastos/${id}`, { method: 'PUT', body: JSON.stringify(gasto) }),
  eliminarGasto: (id) => request(`/gastos/${id}`, { method: 'DELETE' }),

  // Gastos fijos
  listarGastosFijos: () => request('/gastos-fijos'),
  crearGastoFijo: (gastoFijo) =>
    request('/gastos-fijos', { method: 'POST', body: JSON.stringify(gastoFijo) }),
  actualizarGastoFijo: (id, gastoFijo) =>
    request(`/gastos-fijos/${id}`, { method: 'PUT', body: JSON.stringify(gastoFijo) }),
  eliminarGastoFijo: (id) => request(`/gastos-fijos/${id}`, { method: 'DELETE' }),
  pagarGastoFijo: (id, pago) =>
    request(`/gastos-fijos/${id}/pagar`, { method: 'POST', body: JSON.stringify(pago) }),

  // Ingresos
  listarIngresos: () => request('/ingresos'),
  crearIngreso: (ingreso) =>
    request('/ingresos', { method: 'POST', body: JSON.stringify(ingreso) }),
  actualizarIngreso: (id, ingreso) =>
    request(`/ingresos/${id}`, { method: 'PUT', body: JSON.stringify(ingreso) }),
  eliminarIngreso: (id) => request(`/ingresos/${id}`, { method: 'DELETE' }),
};
