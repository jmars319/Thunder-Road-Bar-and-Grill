import { defineConfig, loadEnv, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

function reactJsxInJs() {
  return {
    name: 'react-jsx-in-js',
    enforce: 'pre',
    async transform(code, id) {
      if (!id.includes('/src/') || !id.endsWith('.js')) {
        return null;
      }
      return transformWithEsbuild(code, id, {
        loader: 'jsx',
        jsx: 'automatic',
      });
    },
  };
}

function adminHistoryFallback() {
  return {
    name: 'admin-history-fallback',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const pathname = (req.url || '').split('?')[0];
        const looksLikeAsset = /\.[a-zA-Z0-9]+$/.test(pathname);
        if ((pathname === '/admin' || pathname.startsWith('/admin/')) && !looksLikeAsset) {
          req.url = `/admin/index.html${(req.url || '').includes('?') ? `?${(req.url || '').split('?').slice(1).join('?')}` : ''}`;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const defaultApiBase = mode === 'test' ? 'http://localhost:3304/api' : '/api';

  return {
    plugins: [adminHistoryFallback(), reactJsxInJs(), react()],
    define: {
      'process.env.REACT_APP_API_BASE': JSON.stringify(env.REACT_APP_API_BASE || env.VITE_API_BASE || defaultApiBase),
      'process.env.REACT_APP_BRAND_KEY': JSON.stringify(env.REACT_APP_BRAND_KEY || env.VITE_BRAND_KEY || 'trbg'),
      'process.env.REACT_APP_SERVICE_NAME': JSON.stringify(env.REACT_APP_SERVICE_NAME || env.VITE_SERVICE_NAME || ''),
      'process.env.REACT_APP_SUPPORT_EMAIL': JSON.stringify(env.REACT_APP_SUPPORT_EMAIL || env.VITE_SUPPORT_EMAIL || ''),
      'process.env.REACT_APP_ENABLE_TEST_EMAIL': JSON.stringify(env.REACT_APP_ENABLE_TEST_EMAIL || env.VITE_ENABLE_TEST_EMAIL || ''),
      'process.env.REACT_APP_NEWSLETTER_ENABLED': JSON.stringify(env.REACT_APP_NEWSLETTER_ENABLED || env.VITE_NEWSLETTER_ENABLED || ''),
      'process.env.REACT_APP_GA_MEASUREMENT_ID': JSON.stringify(env.REACT_APP_GA_MEASUREMENT_ID || env.VITE_GA_MEASUREMENT_ID || ''),
      'process.env.REACT_APP_PLAUSIBLE_DOMAIN': JSON.stringify(env.REACT_APP_PLAUSIBLE_DOMAIN || env.VITE_PLAUSIBLE_DOMAIN || ''),
      'process.env.REACT_APP_GOOGLE_STATIC_MAPS_KEY': JSON.stringify(env.REACT_APP_GOOGLE_STATIC_MAPS_KEY || env.VITE_GOOGLE_STATIC_MAPS_KEY || ''),
    },
    build: {
      outDir: 'build',
      sourcemap: false,
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html'),
          admin: resolve(__dirname, 'admin/index.html'),
        },
      },
    },
    server: {
      port: 3204,
      strictPort: true,
      proxy: {
        '/api': 'http://127.0.0.1:3304',
        '/uploads': 'http://127.0.0.1:3304',
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/setupTests.js',
    },
  };
});
