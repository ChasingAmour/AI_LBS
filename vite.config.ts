import { defineConfig } from 'vite';

export default defineConfig({
  base: '/AI_LBS/',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
});
