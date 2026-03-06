import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const useMSW = env.VITE_ENABLE_MSW === 'true';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5174,
      strictPort: true,
      proxy: useMSW
        ? undefined
        : {
            '/api/v1/auth': {
              target: 'http://localhost:3001',
              changeOrigin: true,
            },
            '/api/v1/stores': {
              target: 'http://localhost:3003',
              changeOrigin: true,
              rewrite: (path) => path.replace('/api/v1/stores', '/api/v1/vendors/stores'),
            },
            '/api/v1/catalog': {
              target: 'http://localhost:3004',
              changeOrigin: true,
            },
            '/api/v1/inventory': {
              target: 'http://localhost:3005',
              changeOrigin: true,
            },
            '/api/v1/orders': {
              target: 'http://localhost:3006',
              changeOrigin: true,
            },
            '/api/v1/payments': {
              target: 'http://localhost:3008',
              changeOrigin: true,
            },
          },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            query: ['@tanstack/react-query'],
            charts: ['recharts'],
          },
        },
      },
    },
  };
});
