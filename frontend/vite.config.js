import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, las peticiones a /api se redirigen al backend PHP.
// El destino se puede cambiar con la variable de entorno VITE_API_PROXY.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
