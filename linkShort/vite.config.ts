import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      name: 'dev-csp-fix',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          res.removeHeader('Content-Security-Policy');
          next();
        });
      }
    },
    react(),
  ],
  base: process.env.VITE_BASE_PATH || "/Tiny_Links",
  // Proxy /api requests to the local Express server during development
  server: {
    proxy: {
      // Redirects (/api/r/:code) -> forward to /:code on the Express server
      '/api/r': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/r/, '/'),
        // Remove Content-Security-Policy coming from proxied responses (dev convenience)
        configure(proxy) {
          proxy.on('proxyRes', (proxyRes) => {
            if (proxyRes && proxyRes.headers) {
              delete proxyRes.headers['content-security-policy'];
              delete proxyRes.headers['Content-Security-Policy'];
            }
          });
        },
      },
      // Other API endpoints (/api/links, /api/ready, etc.) -> strip /api prefix
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure(proxy) {
          proxy.on('proxyRes', (proxyRes) => {
            if (proxyRes && proxyRes.headers) {
              delete proxyRes.headers['content-security-policy'];
              delete proxyRes.headers['Content-Security-Policy'];
            }
          });
        },
      },
      // also proxy base-prefixed paths
      
      '/Tiny_Links/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/Tiny_Links\/api/, ''),
        configure(proxy) { proxy.on('proxyRes', pr => delete pr.headers?.['content-security-policy']); },
      },
    },
  },
});
