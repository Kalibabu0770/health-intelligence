import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // In production, VITE_BACKEND_URL points to Render
  // In development, proxy routes /ollama to local Ollama
  const isDev = mode === 'development';

  return {
    server: {
      port: 3001,
      host: '0.0.0.0',
      proxy: isDev ? {
        '/ollama': {
          target: 'http://localhost:11434',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ollama/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
            });
          },
        },
      } : undefined,
    },
    plugins: [react()],
    define: {
      // Expose env vars to the browser bundle
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      '__BACKEND_URL__': JSON.stringify(env.VITE_BACKEND_URL || 'http://localhost:8000'),
      '__ML_BACKEND_URL__': JSON.stringify(env.VITE_ML_BACKEND_URL || 'https://lifeshield-backend.onrender.com/predict'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
