import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, '../public/js/react'),  // 👈 Build into your Express public folder
    emptyOutDir: true,
    rollupOptions: {
      input: './src/main.jsx'
    }
  },
  root: './',
});
