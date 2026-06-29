import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8')) as {
  build?: {
    productName?: string;
  };
};
const buildProductName = packageJson.build?.productName?.trim() || 'StartLink';
const devServerPort = Number(process.env.VITE_PORT || 5173);

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: './',
  define: {
    __LPP_PC_PRODUCT_NAME__: JSON.stringify(buildProductName),
  },
  server: {
    port: Number.isFinite(devServerPort) ? devServerPort : 5173,
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
