import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Security headers for ZAP / OWASP (10038 CSP, 10020 X-Frame-Options, 10021 nosniff, 10063 Permissions-Policy, 90004 COOP/CORP)
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  // Needed so remote uploaded-theme assets can load directly in the page (direct rendering, no iframe).
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://cdn.storify.it.com https://*.storify.it.com https://www.googletagmanager.com https://www.google-analytics.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.storify.it.com https://*.storify.it.com",
    "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com https://cdn.storify.it.com https://*.storify.it.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https:",
    "frame-src 'self' https: https://www.googletagmanager.com",
    "frame-ancestors 'none'",
  ].join('; '),
};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/',
      server: {
        port: 3004,
        host: '0.0.0.0',
        headers: SECURITY_HEADERS,
        allowedHosts: [
          'localhost',
          '127.0.0.1',
          'demo.storify.local',
          '.storify.local',
        ],
        proxy: {
          '/api': {
            target: (env.VITE_API_URL && env.VITE_API_URL.startsWith('http')) ? new URL(env.VITE_API_URL).origin : 'http://127.0.0.1:3001',
            changeOrigin: true,
          },
        },
      },
      preview: {
        host: '0.0.0.0',
        port: 3005,
        strictPort: false,
        headers: {
          ...SECURITY_HEADERS,
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
        // Allow all subdomains for multi-store support
        // Specific hosts will be validated by the engine
      },
      plugins: [
        react(),
        // Cloudflare Rocket Loader defers scripts and breaks Vite module bundles / inline bootstraps
        {
          name: 'add-cfasync',
          transformIndexHtml(html: string) {
            return html.replace(/<script([^>]*?)>/gi, (match, attrs) => {
              if (attrs.includes('data-cfasync')) return match;
              return `<script${attrs} data-cfasync="false">`;
            });
          },
        },
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          '@apps': path.resolve(__dirname, '../../../apps'),
          'lucide-react': path.resolve(__dirname, 'node_modules/lucide-react'),
          'motion': path.resolve(__dirname, 'node_modules/motion'),
          'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom'),
        },
        dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom', 'react/jsx-runtime', 'react-router-dom'],
              'vendor-stripe': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
              'vendor-dompurify': ['dompurify'],
            },
          },
        },
      },
      optimizeDeps: {
        include: ['react', 'react-dom', 'react/jsx-runtime', 'dompurify'],
      },
    };
});
