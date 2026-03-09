import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
import { cpSync, mkdirSync, existsSync } from 'node:fs';

function spaFallback() {
  const routes = ['setup', 'cookbook'];
  return {
    name: 'spa-fallback',
    closeBundle() {
      const dist = resolve(__dirname, 'dist');
      const index = resolve(dist, 'index.html');
      if (!existsSync(index)) return;
      for (const route of routes) {
        const dir = resolve(dist, route);
        mkdirSync(dir, { recursive: true });
        cpSync(index, resolve(dir, 'index.html'));
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), spaFallback()],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
