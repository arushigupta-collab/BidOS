import { useCallback, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, StatusBanner, buttonClasses } from '@/components/ui'
import { hasDatabase } from '@/lib/supabase'
import { ICON, MOTION } from '@/lib/tokens'
import { Dropzone } from './Dropzone'
import { StageTrail } from './StageTrail'
import { runIngest, type IngestOutcome, type StageId, type StageProgress } from './ingestClient'

/**
 * Reading a tender that was not seeded.
 *
 * Bid Hawk's other route into the feed is the platforms an operator connects.
 * This one exists because a client in the room will want to see their own
 * document read, and a product that can only summarise what shipped with it is a
 * slideshow.
 *
 * Three states on one route: ready, reading, and read. They replace each other in
 * place rather than navigating, because the trail is the evidence for the result
 * and losing it on completion would leave the summary unsupported.
 */

type Phase = 'ready' | 'reading' | 'read'

export function IntakePage() {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-24 pb-40 pt-24 md:px-32">
      <header className="flex flex-col gap-8">
        <p className="text-micro-label uppercase text-fg-muted">Bid Hawk</p>
        <h1 className="text-page-title text-fg">Read a tender</h1>
        <p className="max-w-lede text-body text-fg-secondary">
          Upload a tender document and Bid Hawk reads it against your eligibility, flags
          what is wrong with it, splits the work across your team and assigns an owner.
        </p>
      </header>
      <div className="mt-32 flex max-w-prose flex-col gap-32">
        <IntakePanel />
      </div>
    </div>
  )
}

/**
 * The working half, without the page's own heading.
 *
 * Bid Hawk's introduction screen hosts this directly: reading a tender IS what
 * the module does, so the module's front door opens onto it rather than onto a
 * setup path. The `/intake` address renders the same panel under a heading of
 * its own, for anyone arriving there directly.
 */
export function IntakePanel() {
  const reduce = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('ready')
  const [fileName, setFileName] = useState<string | null>(null)
  const [progress, setProgress] = useState<Partial<Record<StageId, StageProgress>>>({})
  const [outcome, setOutcome] = useState<IngestOutcome | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  const onStage = useCallback((id: StageId, next: StageProgress) => {
    setProgress((prev) => ({ ...prev, [id]: next }))
  }, [])

  async function start(file: File) {
    setFileName(file.name)
    setProgress({})
    setFailure(null)
    setPhase('reading')
    try {
      setOutcome(await runIngest(file, { onStage }))
      setPhase('read')
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error))
    }
  }

  function reset() {
    setPhase('ready')
    setProgress({})
    setOutcome(null)
    setFailure(null)
    setFileName(null)
  }

  const enter = reduce
    ? {}
    : {
        initial: { opacity: 0, y: MOTION.offset.rise },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0 },
        transition: { duration: MOTION.duration.emphasis, ease: MOTION.ease.out },
      }

  /**
   * The offline build carries no database and no key, so there is nothing this
   * screen could do. It says so and points at the feed rather than presenting a
   * control that would fail.
   */
  if (!hasDatabase()) {
    return (
      // No heading of its own. The panel is hosted under one -- on Bid Hawk's
      // introduction and on the /intake page alike -- and repeating it here gave
      // the page two headings with the same name, which is a defect for anyone
      // navigating by them.
      <div className="mx-auto flex w-full max-w-prose flex-col gap-24">
        <StatusBanner
          tone="info"
          title="This workspace reads from its own records"
          description="Reading a new document needs a connection this build does not have. The tenders already in the feed are complete and can be worked through as normal."
        />
        <div>
          <Link to="/feed" className={buttonClasses({ variant: 'primary' })}>
            Go to the feed
            <ArrowRight width={ICON.md} height={ICON.md} aria-hidden />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-prose flex-col gap-32">
      <AnimatePresence mode="wait">
        {phase === 'ready' ? (
          <motion.div key="ready" {...enter}>
            <Dropzone onFile={start} />
          </motion.div>
        ) : (
          <motion.div key="working" {...enter} className="flex flex-col gap-24">
            <div className="flex items-baseline justify-between gap-16">
              <p className="text-panel-title text-fg">{fileName}</p>
              {phase === 'reading' && !failure ? (
                <p className="text-metadata text-fg-muted">This takes a few minutes</p>
              ) : null}
            </div>

            <StageTrail progress={progress} />

            {failure ? (
              <div className="flex flex-col gap-16">
                <StatusBanner tone="destructive" title="Reading stopped" description={failure} />
                <div>
                  <Button variant="primary" onClick={reset}>
                    Try another document
                  </Button>
                </div>
              </div>
            ) : null}

            {phase === 'read' && outcome ? <Outcome outcome={outcome} onReset={reset} /> : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** What was found, and the one place to go next. */
function Outcome({ outcome, onReset }: { outcome: IngestOutcome; onReset: () => void }) {
  const eligibility = outcome.results.eligibility?.rows ?? []
  const failed = eligibility.filter((r) => r.status === 'fail').length
  const flags = outcome.results.risks?.flags ?? []
  const high = flags.filter((f) => f.severity === 'high').length

  return (
    <div className="flex flex-col gap-24 border-t border-border pt-24">
      <dl className="flex flex-wrap gap-x-48 gap-y-16">
        <Figure label="Criteria checked" value={String(eligibility.length)}
          note={failed ? `${failed} not met` : 'all met'} />
        <Figure label="Defects found" value={String(flags.length)}
          note={high ? `${high} high severity` : 'none critical'} />
        <Figure label="Roles briefed" value={String(outcome.results.workpackages?.packages.length ?? 0)}
          note="action items assigned" />
      </dl>

      <div className="flex flex-wrap items-center gap-16">
        <Link to={`/feed/${outcome.rfpId}`} className={buttonClasses({ variant: 'primary' })}>
          Open the summary
          <ArrowRight width={ICON.md} height={ICON.md} aria-hidden />
        </Link>
        <Button variant="ghost" onClick={onReset}>
          Read another
        </Button>
      </div>

      <p className="text-metadata text-fg-muted">
        Dates in this document have been read as written and carried forward{' '}
        {outcome.shift ? `by ${outcome.shift} year${outcome.shift === 1 ? '' : 's'}` : 'unchanged'}, so
        deadlines run against today. <Link to="/feed" className="underline">All tenders</Link>
      </p>
    </div>
  )
}

function Figure({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex flex-col gap-4">
      <dt className="text-micro-label uppercase text-fg-muted">{label}</dt>
      <dd className="flex items-baseline gap-8">
        <span className="text-kpi-value tabular-nums text-fg">{value}</span>
        <span className="text-metadata text-fg-muted">{note}</span>
      </dd>
    </div>
  )
}
