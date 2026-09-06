/**
 * Where a run's output goes.
 *
 * Two implementations behind one interface. `LocalStore` writes JSON under
 * .ingest/ and is what the CLI uses: it needs no database, and it makes each
 * stage's output something you can open and read rather than something you have
 * to query. `SupabaseStore` will implement the same interface for the deployed
 * pipeline, so the stage runners never learn which one they are talking to.
 *
 * Persisting after every stage is what makes a run resumable, and resumability
 * is a cost decision before it is a convenience one: when `workpackages` fails
 * on its third retry, re-running must not pay for `extract` a second time.
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ModelCall } from './openrouter.js'

export interface StageRecord<T = unknown> {
  stage: string
  data: T
  calls: ModelCall[]
  completedAt: string
}

export interface Store {
  /** Previously completed output for a stage, or null if it has not run. */
  read<T>(stage: string): Promise<StageRecord<T> | null>
  write<T>(stage: string, data: T, calls: ModelCall[]): Promise<void>
  /** Every stage completed so far, in completion order. */
  completed(): Promise<string[]>
}

export class LocalStore implements Store {
  constructor(private readonly dir: string) {}

  static async open(root: string, documentId: string): Promise<LocalStore> {
    const dir = join(root, documentId)
    await mkdir(dir, { recursive: true })
    return new LocalStore(dir)
  }

  private path(stage: string) {
    return join(this.dir, `${stage}.json`)
  }

  async read<T>(stage: string): Promise<StageRecord<T> | null> {
    try {
      return JSON.parse(await readFile(this.path(stage), 'utf8')) as StageRecord<T>
    } catch {
      return null
    }
  }

  async write<T>(stage: string, data: T, calls: ModelCall[]): Promise<void> {
    const record: StageRecord<T> = { stage, data, calls, completedAt: new Date().toISOString() }
    await writeFile(this.path(stage), JSON.stringify(record, null, 2) + '\n', 'utf8')
  }

  async completed(): Promise<string[]> {
    const files = await readdir(this.dir).catch(() => [] as string[])
    const stages = files.filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''))
    const withTime = await Promise.all(
      stages.map(async (s) => ({ s, at: (await this.read(s))?.completedAt ?? '' })),
    )
    return withTime.sort((a, b) => a.at.localeCompare(b.at)).map((x) => x.s)
  }

  get location() {
    return this.dir
  }
}
