import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/main.js',
      name: 'image-importer',
      formats: ['cjs'],
      fileName: () => 'main.js'
    },
    outDir: '.',
    assetsDir: '.',
    emptyOutDir: false, // keep root files (manifest, styles) untouched
    rollupOptions: {
      external: ['obsidian', 'electron', '@electron/remote'],
      output: { exports: 'default' }
    },
    sourcemap: false,
    minify: true,
    target: 'es2019'
  }
});