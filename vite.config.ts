import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/main.ts',
      name: 'image-importer',
      formats: ['cjs'],
      fileName: () => 'main.js'
    },
    outDir: '.',
    assetsDir: '.',
    emptyOutDir: false, // keep root files (manifest, styles) untouched
    rollupOptions: {
      output: { exports: 'default' }
    },
    sourcemap: false,
    minify: true,
    target: 'es2019'
  }
});