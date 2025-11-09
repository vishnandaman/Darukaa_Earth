import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['leaflet', 'react-leaflet'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  // Ensure leaflet-draw is properly handled as a CommonJS module
  resolve: {
    dedupe: ['leaflet'],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
});

