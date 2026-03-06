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
      port: 5175,
      strictPort: true,
      proxy: useMSW
        ? undefined
        : {
            '/api/v1/auth': {
              target: 'http://localhost:3001',
              changeOrigin: true,
            },
            '/api/v1/users': {
              target: 'http://localhost:3002',
              changeOrigin: true,
            },
            '/api/v1/vendors': {
              target: 'http://localhost:3003',
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
            '/api/v1/notifications': {
              target: 'http://localhost:3010',
              changeOrigin: true,
            },
            '/api/v1/zones': {
              target: 'http://localhost:3014',
              changeOrigin: true,
            },
            '/api/v1/loyalty': {
              target: 'http://localhost:3017',
              changeOrigin: true,
            },
            '/api/v1/delivery': {
              target: 'http://localhost:3007',
              changeOrigin: true,
            },
            '/api/v1/admin/riders': {
              target: 'http://localhost:3007',
              changeOrigin: true,
              rewrite: (path) =>
                path.replace('/api/v1/admin/riders', '/api/v1/delivery/admin/riders'),
            },
          },
    },
  };
});
