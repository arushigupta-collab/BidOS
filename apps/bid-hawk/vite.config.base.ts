import { defineConfig, type UserConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { apiPlugin } from './vite.plugin.api'
import { fileURLToPath, URL } from 'node:url'

/**
 * Everything both build targets share.
 *
 * There are two targets: a hosted web build and an offline build that opens from
 * file:// with no network. They differ in four things and no more — `base`, the
 * output format, the output directory, and the router mode — so every other option
 * lives here rather than being written twice. Plugins, the path alias, the token
 * pipeline and the font inlining cannot drift between them, because there is only
 * one copy of each.
 *
 * `assetsInlineLimit` in particular is deliberately NOT overridden by either
 * target. See src/styles/fonts.test.ts, which asserts that.
 */
export const BASE_CONFIG: UserConfig = defineConfig({
  plugins: [react(), apiPlugin()],
  server: {
    watch: {
      /**
       * The dev server must not watch the build output.
       *
       * Both targets write into the project, so running a build while the dev
       * server is up triggered a full page reload -- which, during an upload,
       * discards the in-flight request and everything the stage trail had
       * collected. A reading that takes four minutes cannot survive the page
       * being reloaded underneath it.
       */
      ignored: ['**/dist/**', '**/dist-offline/**', '**/.ingest/**'],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2019',
    cssCodeSplit: false,
    /**
     * Fonts and the brand logo are inlined as data URIs on BOTH targets,
     * regardless of size.
     *
     * On the offline target this is correctness: a file:// document is an opaque
     * origin, so a sibling file can be refused as cross-origin — a woff2 falls
     * back silently to a system face and an image renders as a broken alt. On the
     * web target it is two fewer render-blocking requests. The behaviour is shared
     * rather than split, so neither target can lose it.
     */
    assetsInlineLimit: (filePath: string) =>
      filePath.endsWith('.woff2') || filePath.endsWith('.png') ? true : undefined,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
