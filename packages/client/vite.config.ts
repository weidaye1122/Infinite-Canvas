import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const excalidrawZhCNLocaleModule = path.resolve(__dirname, './src/i18n/excalidrawZhCNLocale.ts');
const excalidrawPromisePoolShimImport = '/src/shims/es6PromisePool.ts';
const EXCALIDRAW_MAX_SINGLE_IMAGE_BYTES = 30 * 1024 * 1024;
const excalidrawNestedOptimizedDeps = [
  '@excalidraw/excalidraw > png-chunks-extract',
  '@excalidraw/excalidraw > png-chunk-text',
  '@excalidraw/excalidraw > png-chunks-encode',
  '@excalidraw/excalidraw > fuzzy',
  '@excalidraw/excalidraw > lodash.debounce',
  '@excalidraw/excalidraw > lodash.throttle',
  '@excalidraw/excalidraw > roughjs/bin/rough',
  '@excalidraw/excalidraw > roughjs/bin/generator',
  '@excalidraw/excalidraw > roughjs/bin/math',
  '@excalidraw/excalidraw > points-on-curve',
  '@excalidraw/excalidraw > @braintree/sanitize-url',
  '@excalidraw/excalidraw > use-sync-external-store/shim/with-selector.js',
];

const excalidrawZhCNLocalePlugin = () => ({
  name: 'excalidraw-zh-cn-locale',
  enforce: 'pre' as const,
  resolveId(source: string) {
    if (source.includes('?excalidraw-original-locale')) {
      return null;
    }

    if (
      source === './locales/zh-CN-LNUGB5OW.js' ||
      source === '@excalidraw/excalidraw/dist/prod/locales/zh-CN-LNUGB5OW.js'
    ) {
      return excalidrawZhCNLocaleModule;
    }

    return null;
  },
});

const excalidrawImageLimitPlugin = () => ({
  name: 'excalidraw-image-limit',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (!id.includes('@excalidraw/excalidraw/dist/')) {
      return null;
    }

    const nextCode = code
      .replace(
        'import Pool from "es6-promise-pool";',
        `import Pool from "${excalidrawPromisePoolShimImport}";`
      )
      .replace(
        'var MAX_ALLOWED_FILE_BYTES = 4 * 1024 * 1024;',
        `var MAX_ALLOWED_FILE_BYTES = ${EXCALIDRAW_MAX_SINGLE_IMAGE_BYTES};`
      )
      .replace(/AE=4\*1024\*1024/g, `AE=${EXCALIDRAW_MAX_SINGLE_IMAGE_BYTES}`);

    return nextCode === code ? null : nextCode;
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [excalidrawZhCNLocalePlugin(), excalidrawImageLimitPlugin(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'es6-promise-pool': path.resolve(__dirname, './src/shims/es6PromisePool.ts'),
    },
  },
  optimizeDeps: {
    include: excalidrawNestedOptimizedDeps,
    exclude: ['@excalidraw/excalidraw'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
