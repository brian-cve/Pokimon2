import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas: el build funciona en cualquier subcarpeta (p. ej. GitHub Pages).
  base: './',
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 2000 },
});
