import path from 'path';
import { defineConfig } from 'vite';

/**
 * Build the standalone Storefront SDK (no React) for theme iframe.
 * Output: public/sdk/storefront-sdk.js — copied to dist/ by main build.
 */
export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'lib/sdk-standalone.ts'),
      name: 'StorifySDK',
      formats: ['iife'],
      fileName: () => 'storefront-sdk.js',
    },
    outDir: 'public/sdk',
    emptyOutDir: true,
    minify: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
