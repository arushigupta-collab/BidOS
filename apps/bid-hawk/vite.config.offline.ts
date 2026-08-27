import { defineConfig, mergeConfig, type Plugin } from 'vitest/config'
import { BASE_CONFIG } from './vite.config.base'

/**
 * Browsers refuse to load `type="module"` scripts over the file:// protocol
 * because the request is treated as cross-origin. The bundle is therefore
 * emitted as a classic IIFE and the module attributes are stripped from the
 * generated HTML, so dist-offline/index.html opens by double-click with no server.
 */
function offlineHtml(): Plugin {
  return {
    name: 'bidos-offline-html',
    enforce: 'post',
    transformIndexHtml(html) {
      return html
        .replace(/\s+type="module"/g, '')
        .replace(/\s+crossorigin(=("|')[^"']*\2)?/g, '')
        // A classic script in <head> would run before #root exists.
        .replace(/<script(\s+src=)/g, '<script defer$1')
    },
  }
}

/**
 * The offline demo target. `npm run build:offline` → dist-offline/.
 *
 * Unchanged in behaviour from the single config this repository had before the
 * split: relative base, one classic IIFE, hash routing. It exists because demos
 * still get run on machines with no network, where the folder is opened directly.
 *
 * `modulePreload: false` and the fixed asset names are consequences of the IIFE
 * output rather than independent choices — there is one chunk to name and nothing
 * to preload.
 */
export default mergeConfig(
  BASE_CONFIG,
  defineConfig({
    base: './',
    define: { __OFFLINE__: 'true' },
    plugins: [offlineHtml()],
    build: {
      outDir: 'dist-offline',
      modulePreload: false,
      /**
       * One IIFE is the only shape a file:// page can load, so code splitting is
       * unavailable by design and the default 500kB advisory has nothing to advise.
       */
      chunkSizeWarningLimit: 1024,
      rollupOptions: {
        output: {
          format: 'iife',
          inlineDynamicImports: true,
          entryFileNames: 'assets/bidos.js',
          assetFileNames: 'assets/bidos.[ext]',
        },
      },
    },
  }),
)
