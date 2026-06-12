import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { getStorifyThemePackageAliases } from './storify-theme-bundler-aliases';

const _dirname = path.dirname(fileURLToPath(import.meta.url));
const themePackageAliases = getStorifyThemePackageAliases(_dirname);

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(_dirname, 'index.html'),
      output: {
        // Stable logical name for the app bundle (input is index.html, so [name] would be "index").
        entryFileNames: 'assets/main-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        format: 'es',
        manualChunks(id) {
          // React + ReactDOM in a separate vendor chunk
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          // Framer Motion is heavy — separate chunk
          if (id.includes('node_modules/framer-motion')) {
            return 'framer-motion';
          }
          // Lucide icons
          if (id.includes('node_modules/lucide-react')) {
            return 'lucide';
          }
          // Theme editor and simulator are dev-only tools — separate chunk (lazy-loaded in ThemeApp)
          if (
            id.includes('/components/ThemeEditor') ||
            id.includes('/components/StorifySimulator') ||
            id.includes('/components/SettingsSimulator')
          ) {
            return 'theme-tools';
          }
          // Page sections rarely needed together — per-section chunks
          const sectionsMatch = id.match(/\/sections\/(\w+)Section/);
          if (sectionsMatch) {
            const name = sectionsMatch[1].toLowerCase();
            // Header/Footer are always needed — keep in main
            if (name === 'header' || name === 'footer') return undefined;
            // One chunk for all template sections. Splitting shop vs pages created a
            // Rollup circular chunk (sections-shop ↔ sections-pages) and runtime errors
            // like "does not provide an export named …" when chunks/cache mismatch.
            return 'sections-runtime';
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(_dirname, '.'),
      ...themePackageAliases,
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 3004,
    host: '0.0.0.0',
    cors: true,
    hmr: process.env.DISABLE_HMR !== 'true',
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.trycloudflare.com',
      '.ngrok-free.app',
      '.ngrok.io',
      '.ngrok.app',
      '.loca.lt',
    ],
  },
});
