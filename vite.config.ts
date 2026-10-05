import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), {
    name: 'local-review-entry',
    // Vite's SPA fallback otherwise handles public directory URLs in dev mode.
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const [path, query] = (request.url ?? '').split('?');
        if (path === '/review') {
          response.writeHead(302, { Location: `/review/${query ? `?${query}` : ''}` });
          response.end();
          return;
        }
        if (path === '/review/') request.url = `/review/index.html${query ? `?${query}` : ''}`;
        next();
      });
    }
  }],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
  build: { rollupOptions: { output: { manualChunks: (id: string) => /node_modules\/(three|@react-three)/.test(id) ? 'three' : undefined } } }
});
