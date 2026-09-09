import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { PresenceLayer } from '@/components/motion/PresenceLayer'
import { ConfirmDialog } from '@/components/ui'
import { ImportDialog } from '@/components/shared/ImportDialog'
import { SegmentedNav } from '@/components/shared/SegmentedNav'
import { savePeople, savePerson, updatePerson, type SavePersonInput } from '@/data/api'
import type { ImportReport } from '@/lib/importReport'
import { toast } from '@/lib/toast'
import { MOTION } from '@/lib/tokens'
import { useWorkspace } from '@/store/useWorkspace'
import { EMPTY_PERSON, draftFromPerson, type PersonDraft } from '../personDraft'
import { PersonChoice } from './PersonChoice'
import { PersonForm } from './PersonForm'
import { PREVIEW_HEADERS, TEMPLATE_CSV, readImport } from './importPeople'

type Phase = 'choice' | 'form'

export function AddPeoplePage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const reduce = useReducedMotion()

  const total = useWorkspace((state) => state.people.length)
  const addedThisSession = useWorkspace((state) => state.sessionPeople)
  const editing = useWorkspace((state) => state.people.find((person) => person.id === id))

  // Editing arrives straight on the form with the row's values in it.
  const [phase, setPhase] = useState<Phase>(id ? 'form' : 'choice')
  const [draft, setDraft] = useState<PersonDraft>(
    editing ? draftFromPerson(editing) : EMPTY_PERSON,
  )
  const [saving, setSaving] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [pendingExit, setPendingExit] = useState(false)

  const choiceButton = useRef<HTMLButtonElement>(null)
  const isChoice = phase === 'choice'

  /** Anything typed. A pristine draft has nothing worth guarding. */
  const touched =
    phase === 'form' &&
    JSON.stringify(draft) !== JSON.stringify(editing ? draftFromPerson(editing) : EMPTY_PERSON)

  useEffect(() => {
    if (isChoice) choiceButton.current?.focus()
  }, [isChoice])

  const patch = (next: Partial<PersonDraft>) => setDraft((current) => ({ ...current, ...next }))

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
      const input: SavePersonInput = {
        name: draft.name,
        email: draft.email,
        domains: draft.domains,
        regions: draft.regions,
      }
      const saved = editing ? await updatePerson(editing.id, input) : await savePerson(input)

      toast.success(editing ? `${saved.name} updated` : `${saved.name} added`, {
        description: `Covering ${saved.domains.length + saved.regions.length} ${
          saved.domains.length + saved.regions.length === 1 ? 'area' : 'areas'
        } of expertise.`,
      })
      navigate('/team', { state: { highlightIds: [saved.id] } })
    } catch {
      toast.error(editing ? 'The changes could not be saved' : 'The person could not be added', {
        description: 'Nothing was written. Check the email address and try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  const onConfirmImport = async (report: ImportReport<SavePersonInput>) => {
    setImporting(true)
    try {
      const created = await savePeople(report.accepted.map((row) => row.input))
      setImportOpen(false)
      toast.success(`${created.length} ${created.length === 1 ? 'person' : 'people'} imported`, {
        description:
          report.rejected.length > 0
            ? `${report.rejected.length} rejected rows were left out and nothing about them was saved.`
            : 'Every row in the file was accepted.',
      })
      // Every imported row is new, so every one of them is highlighted.
      navigate('/team', { state: { highlightIds: created.map((person) => person.id) } })
    } catch {
      toast.error('The import did not complete', {
        description: 'Nobody was added. Try the file again.',
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
          label="People"
          items={[
            { to: '/team/new', label: 'Add people' },
            { to: '/team', label: 'People', count: total, end: true },
          ]}
          onNavigate={(event) => {
            if (!touched) return
            event.preventDefault()
            setPendingExit(true)
          }}
        />

        <h1 className="text-page-title text-fg">{editing ? 'Edit person' : 'Add people'}</h1>

        <div className={isChoice ? 'max-w-editorial' : 'max-w-form'}>
          <AnimatePresence mode="popLayout" initial={false}>
            {isChoice ? (
              <motion.div key="choice" {...fade}>
                <PresenceLayer>
                  <PersonChoice
                    ref={choiceButton}
                    total={total}
                    addedThisSession={addedThisSession}
                    onAddNew={() => {
                      setPhase('form')
                      setAnnouncement('Add person form opened. Name, email and expertise.')
                    }}
                  />
                </PresenceLayer>
              </motion.div>
            ) : (
              <motion.div key="form" {...fade}>
                <PresenceLayer>
                  <PersonForm
                    draft={draft}
                    patch={patch}
                    editingName={editing?.name}
                    onOpenImport={() => setImportOpen(true)}
                    onBack={() => {
                      /*
                       * "Back" means the platform landing, on instruction. The
                       * guard is unchanged: leaving an edited record or a
                       * half-filled form discards it, and doing that silently
                       * is a different thing from being asked to.
                       */
                      if (touched) {
                        setPendingExit(true)
                        return
                      }
                      navigate('/')
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
        title="Import people"
        description="Add many Account Executives at once from a spreadsheet export. Every row is checked before anything is added."
        read={readImport}
        template={TEMPLATE_CSV}
        templateFileName="bidos-people-template.csv"
        previewHeaders={PREVIEW_HEADERS}
        noun="person"
        pluralNoun="people"
      />

      <ConfirmDialog
        open={pendingExit}
        onOpenChange={setPendingExit}
        destructive
        title={editing ? 'Leave without saving these changes?' : 'Leave without saving this person?'}
        description={
          editing
            ? `${editing.name} keeps their saved record. The edits made here are discarded.`
            : 'Nothing has been written to the workspace yet. The name, email and expertise entered here are discarded.'
        }
        confirmLabel="Discard and leave"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setPendingExit(false)
          navigate('/')
        }}
      />
    </div>
  )
}
