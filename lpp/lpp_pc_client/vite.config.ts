import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/react') || id.includes('/react-dom')) return 'vendor-react';
          if (id.includes('@tanstack/react-query') || id.includes('zustand')) {
            return 'vendor-state';
          }
          if (id.includes('@microsoft/signalr')) return 'vendor-realtime';
          if (id.includes('@lexical') || id.includes('/lexical/')) return 'vendor-editor';
          if (id.includes('/qrcode/')) return 'vendor-qrcode';
          return undefined;
        },
      },
    },
  },
});
