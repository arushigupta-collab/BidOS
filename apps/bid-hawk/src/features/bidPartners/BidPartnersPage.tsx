import { ClipboardList, Scale, Users } from 'lucide-react'
import { ModuleIntroPage } from '@/components/shared/ModuleIntroPage'
import type { Stage } from '@/components/shared/FlowBand'
import { BidPartnersMark } from '@/components/shell/BidPartnersMark'
import { PartnerSetupPath } from './PartnerSetupPath'

/** Bid Partners' three stages: what it does, in the order it does it. */
const STAGES: Stage[] = [
  {
    id: 'registry',
    icon: Users,
    title: 'Partner Registry',
    detail:
      "Holds each partner's capabilities, regions, team size, turnover and certifications, and sends them an RFP with the documents you need back.",
  },
  {
    id: 'responses',
    icon: ClipboardList,
    title: 'Response Tracker',
    detail:
      'Shows what each partner has submitted against each RFP, and what is still outstanding.',
  },
  {
    id: 'evaluation',
    icon: Scale,
    title: 'Partner Evaluation',
    detail:
      'Ranks partners on capability fit, commercials and delivery history, with an AI recommendation and the reasoning behind it.',
  },
]

/**
 * The Bid Partners module at `/bid-partners`. Same shape as Bid Hawk's landing by
 * construction rather than by resemblance: both call `ModuleIntroPage`, so a user who
 * has seen one recognises the other immediately and neither can drift from the other.
 */
export function BidPartnersPage() {
  return (
    <ModuleIntroPage
      mark={<BidPartnersMark />}
      microLabel="Module"
      name="Bid Partners"
      lede="Registers your delivery partners, invites them to respond to an RFP, tracks every document they submit, and evaluates them on capability, commercials and past performance."
      stages={STAGES}
      stepCount={3}
      renderSetup={(onBack) => <PartnerSetupPath onBack={onBack} />}
    />
  )
}
