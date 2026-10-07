import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    // Mismo enrutado que hace nginx en producción, para que en desarrollo la
    // interfaz también llame a /api y no dependa de ninguna dirección fija.
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API ?? 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (ruta) => ruta.replace(/^\/api/, ''),
      },
    },
  },
});
