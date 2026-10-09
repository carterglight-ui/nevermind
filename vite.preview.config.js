// Builds the self-contained preview office (one HTML file, published as a Claude artifact).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  root: 'web',
  plugins: [react(), viteSingleFile()],
  define: { 'import.meta.env.VITE_PREVIEW': JSON.stringify('1') },
  build: { outDir: '../preview-dist', emptyOutDir: true, chunkSizeWarningLimit: 4000 },
});
