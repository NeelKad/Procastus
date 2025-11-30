import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, '../shared'),
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),

        options: resolve(__dirname, 'options.html'),
        focus: resolve(__dirname, 'content_block_page.html'),
        background: resolve(__dirname, 'src/background/background.ts'),
        widget: resolve(__dirname, 'src/widget/main.tsx'),
        fab: resolve(__dirname, 'src/content/fab.ts'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'background') return 'background.js';
          if (chunk.name === 'fab') return 'fab.js';
          if (chunk.name === 'widget') return 'widget.js';
          return 'assets/[name].js';
        },
        chunkFileNames: 'assets/[name].js',
        manualChunks: undefined,
      },
      // Prevent code splitting for fab to bundle everything
    },
  },
});
