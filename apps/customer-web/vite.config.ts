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
      port: 5173,
      strictPort: true,
      // Disable proxy when MSW is enabled — MSW intercepts in the browser
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
            '/api/v1/stores': {
              target: 'http://localhost:3003',
              changeOrigin: true,
              rewrite: (path) => path.replace('/api/v1/stores', '/api/v1/vendors/stores'),
            },
            '/api/v1/products': {
              target: 'http://localhost:3004',
              changeOrigin: true,
              rewrite: (path) => path.replace('/api/v1/products', '/api/v1/catalog/products'),
            },
            '/api/v1/categories': {
              target: 'http://localhost:3004',
              changeOrigin: true,
              rewrite: (path) => path.replace('/api/v1/categories', '/api/v1/catalog/categories'),
            },
            '/api/v1/recommendations': {
              target: 'http://localhost:3004',
              changeOrigin: true,
              rewrite: (path) =>
                path.replace('/api/v1/recommendations', '/api/v1/catalog/recommendations'),
            },
            '/api/v1/search': {
              target: 'http://localhost:3004',
              changeOrigin: true,
              rewrite: (path) => path.replace('/api/v1/search', '/api/v1/catalog/search'),
            },
            '/api/v1/reviews': {
              target: 'http://localhost:3004',
              changeOrigin: true,
              rewrite: (path) => path.replace('/api/v1/reviews', '/api/v1/catalog/reviews'),
            },
            '/api/v1/orders': {
              target: 'http://localhost:3006',
              changeOrigin: true,
            },
            '/api/v1/payments': {
              target: 'http://localhost:3008',
              changeOrigin: true,
            },
            '/api/v1/loyalty': {
              target: 'http://localhost:3017',
              changeOrigin: true,
            },
            '/api/v1/zones': {
              target: 'http://localhost:3014',
              changeOrigin: true,
            },
            '/socket.io': {
              target: 'http://localhost:3010',
              changeOrigin: true,
              ws: true,
            },
          },
    },
  };
});
