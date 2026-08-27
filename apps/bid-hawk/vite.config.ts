import { defineConfig, mergeConfig } from 'vitest/config'
import { BASE_CONFIG } from './vite.config.base'

/**
 * The hosted web target. `npm run build` → dist/.
 *
 * Standard ES module output served from the site root, so URLs read /feed and
 * /bid-hawk/team rather than #/feed. That needs vercel.json's SPA rewrite, because
 * /feed is not a file on disk and would otherwise 404 on a direct request or a
 * hard refresh.
 *
 * This is also the config vitest reads, so `__OFFLINE__` is false under test and
 * the offline branches are covered by passing the flag explicitly instead. See
 * src/routes/router.test.ts.
 */
export default mergeConfig(
  BASE_CONFIG,
  defineConfig({
    base: '/',
    define: { __OFFLINE__: 'false' },
    build: { outDir: 'dist' },
  }),
)
