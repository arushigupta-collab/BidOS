import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { loadEnv, type Plugin, type ViteDevServer } from 'vite'

/**
 * Serves the `api/` directory during `npm run dev`.
 *
 * In production these are Vercel functions and this plugin does not run. Locally
 * nothing would serve them: Vite's dev server knows about the client bundle and
 * nothing else, so the intake screen would have no endpoint to call and could
 * only be exercised by deploying. Given the pipeline behind those endpoints costs
 * real money per run, being able to work on the screen locally matters.
 *
 * Handlers are imported through Vite's own module loader rather than by require,
 * so they are transformed like any other TypeScript in the project and edits take
 * effect without a restart.
 */
export function apiPlugin(): Plugin {
  return {
    name: 'bidos-api',
    apply: 'serve',
    /**
     * Vite exposes only VITE_-prefixed variables, and only to the client. The
     * handlers under api/ read the OpenRouter key and the Supabase service-role
     * key from `process.env`, deliberately -- an unprefixed name cannot be
     * inlined into a bundle by accident. In production Vercel populates that;
     * in development nothing does, so it is loaded here.
     *
     * The empty prefix loads every key. Safe because this only runs in `apply:
     * 'serve'` and only into the dev server's own process, never into a build.
     */
    configResolved(config) {
      Object.assign(process.env, loadEnv(config.mode, process.cwd(), ''))
    },
    configureServer(server: ViteDevServer) {
      const routes = new Set<string>()
      const walk = (dir: string, prefix: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          if (entry.name.startsWith('_')) continue
          if (entry.isDirectory()) walk(join(dir, entry.name), `${prefix}/${entry.name}`)
          else if (entry.name.endsWith('.ts')) routes.add(`${prefix}/${entry.name.replace(/\.ts$/, '')}`)
        }
      }
      walk('api', '/api')

      server.middlewares.use(async (req, res, next) => {
        const path = (req.url ?? '').split('?')[0]
        if (!routes.has(path)) return next()

        // Vercel hands the handler a parsed body; the dev server has to do the
        // same or every endpoint would need two code paths.
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)
        const raw = Buffer.concat(chunks).toString('utf8')

        const send = {
          status(code: number) {
            res.statusCode = code
            return send
          },
          json(body: unknown) {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(body))
          },
        }

        try {
          const mod = await server.ssrLoadModule(`${path.replace('/api', './api')}.ts`)
          await mod.default(
            { method: req.method, body: raw ? JSON.parse(raw) : undefined },
            send,
          )
        } catch (error) {
          send.status(500).json({ error: error instanceof Error ? error.message : String(error) })
        }
      })
    },
  }
}
