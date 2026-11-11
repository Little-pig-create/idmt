import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  // 默认根路径；挂到站点 /admin 子路径时用 ADMIN_BASE=/admin/ 构建
  base: process.env.ADMIN_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:4322' },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
