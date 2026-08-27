import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { PresenceLayer } from '@/components/motion/PresenceLayer'
import { ConfirmDialog } from '@/components/ui'
import { ImportDialog } from '@/components/shared/ImportDialog'
import { SegmentedNav } from '@/components/shared/SegmentedNav'
import { saveSource, saveSources, type SaveSourceInput } from '@/data/api'
import { platformPlainName } from '@/data/seed/platforms'
import { useWorkspace } from '@/store/useWorkspace'
import { toast } from '@/lib/toast'
import { MOTION } from '@/lib/tokens'
import { EMPTY_DRAFT, applyPlatform, type SourceDraft } from '../sourceDraft'
import { SourceChoice } from './SourceChoice'
import { SourceForm } from './SourceForm'
import { PREVIEW_HEADERS, TEMPLATE_CSV, readImport } from './importSources'
import type { ImportReport } from '@/lib/importReport'

type Phase = 'choice' | 'form'

export function AddSourcePage() {
  const navigate = useNavigate()
  const total = useWorkspace((state) => state.sources.length)
  const addedThisSession = useWorkspace((state) => state.sessionSources)
  const reduce = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('choice')
  const [draft, setDraft] = useState<SourceDraft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [pendingExit, setPendingExit] = useState(false)

  /** Anything typed into the form. A pristine draft has nothing worth guarding. */
  const touched = phase === 'form' && JSON.stringify(draft) !== JSON.stringify(EMPTY_DRAFT)

  const choiceButton = useRef<HTMLButtonElement>(null)

  const isChoice = phase === 'choice'

  // Focus follows the state change in both directions, so the primary is always
  // where the keyboard already is.
  useEffect(() => {
    if (isChoice) choiceButton.current?.focus()
  }, [isChoice])

  const patch = (next: Partial<SourceDraft>) => setDraft((current) => ({ ...current, ...next }))

  const fade = reduce
    ? { initial: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: MOTION.offset.rise },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0 },
        transition: { duration: MOTION.duration.emphasis, ease: MOTION.ease.out },
      }

  const onSubmit = async () => {
    setSaving(true)
    try {
      const created = await saveSource({
        // Named after the platform, without its code: the row's badge carries that.
        name: platformPlainName(draft.platformId),
        platformId: draft.platformId,
        url: draft.url,
        registeredId: draft.registeredId,
        keywords: draft.keywords,
        hasPassword: draft.password !== '',
      })
      toast.success(`${created.name} added`, {
        description: `${created.keywords.length} ${created.keywords.length === 1 ? 'keyword' : 'keywords'} will qualify a listing from this platform.`,
      })
      navigate('/sources', { state: { highlightIds: [created.id] } })
    } catch {
      toast.error('The source could not be added', {
        description: 'Nothing was written. Check the listing URL and try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  const onConfirmImport = async (report: ImportReport<SaveSourceInput>) => {
    setImporting(true)
    try {
      const created = await saveSources(report.accepted.map((row) => row.input))
      setImportOpen(false)
      toast.success(`${created.length} ${created.length === 1 ? 'source' : 'sources'} imported`, {
        description:
          report.rejected.length > 0
            ? `${report.rejected.length} rejected rows were left out and nothing about them was saved.`
            : 'Every row in the file was accepted.',
      })
      // Every imported row is new, so every one of them is highlighted.
      navigate('/sources', { state: { highlightIds: created.map((source) => source.id) } })
    } catch {
      toast.error('The import did not complete', {
        description: 'No sources were added. Try the file again.',
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="scrollable flex flex-1 flex-col px-24 py-24 md:px-32">
      <VisuallyHidden.Root role="status" aria-live="polite">
        {announcement}
      </VisuallyHidden.Root>

      <div className="flex flex-col gap-24">
        <SegmentedNav
          label="Sources"
          items={[
            { to: '/sources/new', label: 'Add source' },
            { to: '/sources', label: 'Sources', count: total, end: true },
          ]}
          onNavigate={(event) => {
            // Leaving a part-filled form would discard it silently, so it asks.
            if (!touched) return
            event.preventDefault()
            setPendingExit(true)
          }}
        />

        <h1 className="text-page-title text-fg">Add source</h1>

        <div className={isChoice ? 'max-w-editorial' : 'max-w-form'}>
          <AnimatePresence mode="popLayout" initial={false}>
            {isChoice ? (
              <motion.div key="choice" {...fade}>
                <PresenceLayer>
                  <SourceChoice
                    ref={choiceButton}
                    total={total}
                    addedThisSession={addedThisSession}
                    onAddNew={() => {
                      setPhase('form')
                      setAnnouncement('Add source form opened. Five fields, all required.')
                    }}
                  />
                </PresenceLayer>
              </motion.div>
            ) : (
              <motion.div key="form" {...fade}>
                <PresenceLayer>
                  <SourceForm
                    draft={draft}
                    patch={patch}
                    onPlatformChange={(platformId) =>
                      setDraft((current) => applyPlatform(current, platformId))
                    }
                    onOpenImport={() => setImportOpen(true)}
                    onBack={() => {
                      setPhase('choice')
                      setAnnouncement('Returned to the source options.')
                    }}
                    onSubmit={onSubmit}
                    saving={saving}
                  />
                </PresenceLayer>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onConfirm={onConfirmImport}
        pending={importing}
        title="Import sources"
        description="Add many platforms at once from a spreadsheet export. Every row is checked before anything is added."
        read={readImport}
        template={TEMPLATE_CSV}
        templateFileName="bidos-sources-template.csv"
        previewHeaders={PREVIEW_HEADERS}
        noun="source"
        pluralNoun="sources"
      />

      <ConfirmDialog
        open={pendingExit}
        onOpenChange={setPendingExit}
        destructive
        title="Leave without adding this source?"
        description="Nothing has been written to the workspace yet. The platform, listing URL, identifier, password and keywords entered here are discarded."
        confirmLabel="Discard and leave"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setPendingExit(false)
          navigate('/sources')
        }}
      />
    </div>
  )
}
