import { FileSearch, LayoutList, ListChecks, Radar, Route, Upload } from 'lucide-react'
import { ModuleIntroPage } from '@/components/shared/ModuleIntroPage'
import type { Stage } from '@/components/shared/FlowBand'
import { BidHawkMark } from '@/components/shell/BidHawkMark'
import { ICON } from '@/lib/tokens'
import { IntakePanel } from '@/features/intake/IntakePage'
import { SetupPath } from './SetupPath'

/** Bid Hawk's three stages: what it does, in the order it does it. */
const STAGES: Stage[] = [
  {
    id: 'sourcing',
    icon: Radar,
    title: 'RFP Sourcing',
    detail:
      'Takes the tender document you hand it, or polls the platforms you connect and keeps the listings that match your keyword profile.',
  },
  {
    id: 'summarisation',
    icon: FileSearch,
    title: 'Summarisation',
    detail:
      'Reads the full tender document set and returns scope, EMD and PBG exposure, submission dates, your eligibility position, and the clauses that carry risk.',
  },
  {
    id: 'assignation',
    icon: Route,
    title: 'Assignation',
    detail:
      "Scores each tender against your team's domain and regional coverage, assigns an owner with a stated reason and confidence, and holds weak matches for review.",
  },
]

/**
 * The Bid Hawk module at `/bid-hawk`. The composition, the motion and the two-state
 * behaviour all live in `ModuleIntroPage`, which Bid Partners uses too; this file is
 * only what is Bid Hawk's — its mark, its words, its stages and what its primary opens.
 *
 * THE PRIMARY OPENS THE UPLOAD, not a setup path.
 *
 * Reading a tender is what this module is for, and it was two clicks and a
 * two-step configuration journey away from the module's own front door. Sources
 * and People still exist and are still reachable from the canvas navigation --
 * they are how listings arrive on their own — but they are configuration, and
 * configuration is not what somebody opening Bid Hawk came to do.
 */
export function BidHawkPage() {
  return (
    <ModuleIntroPage
      mark={<BidHawkMark />}
      microLabel="Module"
      name="Bid Hawk"
      lede="Reads a tender document against your eligibility, flags what is wrong with it, splits the work across your team and assigns an owner."
      stages={STAGES}
      stepCount={1}
      action={{
        label: 'Read a tender',
        icon: <Upload size={ICON.lg} aria-hidden="true" />,
        announcement: 'Ready to read a tender. Upload a document to begin.',
      }}
      renderSetup={() => <IntakePanel />}
      /**
       * Out to the working screen, for a reader who has already read a tender and
       * has come back to see what is waiting rather than to add another.
       *
       * Called the RFP feed because that is what it is called everywhere else --
       * in the canvas navigation, in the page's own heading, and in its tests. A
       * second name for one screen is how a product starts sounding like two.
       */
      link={{
        label: 'View the RFP feed',
        icon: <LayoutList size={ICON.lg} aria-hidden="true" />,
        to: '/feed',
      }}
      secondary={{
        label: 'Set up sourcing',
        icon: <ListChecks size={ICON.lg} aria-hidden="true" />,
        announcement: 'Sourcing setup opened. Two steps, neither gated on the other.',
        render: (onBack) => <SetupPath onBack={onBack} />,
      }}
    />
  )
}
