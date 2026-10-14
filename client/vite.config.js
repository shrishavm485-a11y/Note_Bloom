import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Run from the project root: `vite --config client/vite.config.js`
export default defineConfig({
  root: 'client',
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true },
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
});
