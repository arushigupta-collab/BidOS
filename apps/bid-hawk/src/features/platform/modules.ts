import type { ComponentType } from 'react'
import { BidAuthorMark } from '@/components/shell/BidAuthorMark'
import { BidHawkMark } from '@/components/shell/BidHawkMark'
import { BidOrchestratorMark } from '@/components/shell/BidOrchestratorMark'
import { BidPartnersMark } from '@/components/shell/BidPartnersMark'
import { OpportunityManagementMark } from '@/components/shell/OpportunityManagementMark'
import { ProjectManagementMark } from '@/components/shell/ProjectManagementMark'

export interface Module {
  id: string
  name: string
  /**
   * The SHORT description, for the landing only.
   *
   * It deliberately differs from the full text on the module's own intro screen, and the
   * difference is a hard layout constraint rather than an editorial preference. At six
   * cards in three columns a card is roughly 346px wide at a 1190 viewport, leaving about
   * 282px of text: Bid Hawk's 240-character verbatim description runs to seven lines
   * there and breaks the grid. Capped at 150 characters, two to three lines each.
   *
   * DO NOT restore the verbatim text here. The intro screens still carry it in full, and
   * that is where a reader who wants the whole sentence goes.
   */
  description: string
  mark: ComponentType<{ className?: string }>
  href: string
  /**
   * True when the destination is another deployment, so the action must be a plain
   * anchor rather than a router `Link`. It says nothing about how the navigation
   * looks or behaves: every module navigates in the same tab, with the same trailing
   * arrow, because they are one product and the interface must not imply otherwise.
   * Browser back returns to this landing page.
   *
   * Those destinations need a network connection. On a fully offline machine they will
   * not resolve while Bid Hawk and Bid Partners, which are part of this bundle, still
   * work. There is deliberately no connectivity check and no warning: a browser already
   * reports a failed navigation, and a banner that guessed at the network would be wrong
   * more often than right.
   */
  separatelyDeployed: boolean
}

/**
 * What the landing shows, in the order the client set: Opportunity Management,
 * Bid Hawk, Bid Orchestrator, Bid Author, Bid Partners, Project Management.
 *
 * Opportunity Management leads because it is where the work starts -- the deal
 * exists before the tender does. The four BidOS modules follow in their own
 * sequence, and Project Management closes, being what happens after a win. So the
 * row reads left to right as the life of a pursuit, with the product this repo
 * builds in the middle of it.
 *
 * The landing renders straight from this array, so the grid, the count in the lede
 * and the column rule all follow it with no positions hardcoded anywhere: order
 * and membership live here and only here.
 *
 * BIDOS STILL HAS FOUR MODULES. The first and last cards are adjacent systems
 * either side of the bid -- Opportunity Management is the pipeline that feeds it,
 * Project Management the delivery of what it wins -- and neither is part of the
 * naming hierarchy. They were removed at the client's request and restored at the
 * client's request; both times the count changed and the scope did not.
 *
 * Which is why they are no longer both at the end: their position on the row is
 * chronological, not a ranking, and reading it as one would be reading six
 * modules where there are four.
 *
 * WHAT IS NOT RESTORED: the demo credentials the Opportunity Management card used
 * to print. `leadership@emb.global` and a password rendered in plain text on a
 * public, indexable page, in front of a deployment with no sign-in of its own.
 * The deployed reference still does this. `platform.test.tsx` asserts the landing
 * prints no address and no password, and that assertion stays.
 */
/**
 * Where the separately deployed modules live.
 *
 * Configurable because they are genuinely different addresses in different
 * places: the hosted deployments in production, and three dev servers on
 * localhost while any of this is being worked on. Hardcoding them meant the
 * landing page always sent a reader to the hosted build even when the module
 * they wanted was running on the machine in front of them.
 *
 * The defaults are THIS repository's deployments. They used to be
 * bid-orchestrator.vercel.app and bid-author.vercel.app -- the older standalone
 * builds these were copied from -- so an unconfigured build sent a reader to a
 * different product reading a different workspace.
 */
const ORCHESTRATOR_URL =
  import.meta.env.VITE_BID_ORCHESTRATOR_URL || 'https://bidorchestrator.vercel.app/'
const AUTHOR_URL =
  import.meta.env.VITE_BID_AUTHOR_URL || 'https://bidauthor.vercel.app/'

export const MODULES: Module[] = [
  {
    id: 'opportunity-management',
    name: 'Opportunity Management',
    description:
      'The pipeline that feeds BidOS: accounts, opportunities, stages and owners, so every tender sourced and every project won reports back to the deal.',
    mark: OpportunityManagementMark,
    // Straight to its sign-in, which is the honest destination: it has one, and
    // landing somebody on a page that immediately bounces them is a worse arrival
    // than sending them where they were always going. Verified 200.
    href: 'https://emb-global-crm.vercel.app/login?redirectTo=%2F',
    separatelyDeployed: true,
  },
  {
    id: 'bid-hawk',
    name: 'Bid Hawk',
    description:
      'Sources RFP briefs from the e-procurement platforms you connect, summarises each against your eligibility, and routes it to the right bid manager.',
    mark: BidHawkMark,
    // No leading '#'. The router adds it in the offline build and omits it in the
    // web build, so no path string in this file knows which target it is in.
    href: '/bid-hawk',
    separatelyDeployed: false,
  },
  {
    id: 'bid-orchestrator',
    name: 'Bid Orchestrator',
    description:
      'Runs the intake pipeline and Unit Head approvals, then distributes the work and assembles the final bid for submission.',
    mark: BidOrchestratorMark,
    href: ORCHESTRATOR_URL,
    separatelyDeployed: true,
  },
  {
    id: 'bid-author',
    name: 'Bid Author',
    description:
      'The specialist workspace: each role drafts its section with AI, auto-fills annexures and submits for the master proposal.',
    mark: BidAuthorMark,
    href: AUTHOR_URL,
    separatelyDeployed: true,
  },
  {
    id: 'bid-partners',
    name: 'Bid Partners',
    description:
      'Where a bid needs them: register delivery partners, invite them to an RFP, track every document and evaluate on five criteria.',
    mark: BidPartnersMark,
    /*
     * Straight to the registry, not to the module's own introduction.
     *
     * The introduction stated the three stages and then asked for a second click
     * to reach any of them, which is a page whose only content is a description
     * of the page after it. Bid Orchestrator and Bid Author have no equivalent --
     * their cards open the work -- so this was also the one module that behaved
     * differently for no reason a reader could see.
     *
     * `/bid-partners` still resolves and still shows the introduction; it is
     * simply not what the card points at.
     */
    href: '/bid-partners/registry',
    separatelyDeployed: false,
  },
  {
    id: 'project-management',
    name: 'Project Management',
    description:
      'Only won bids arrive here. Runs delivery of awarded projects: milestones, tasks, team, suppliers, SLAs and risks through to handover.',
    mark: ProjectManagementMark,
    /*
     * Hardcoded rather than configurable, unlike the three BidOS deployments.
     * Those are genuinely different addresses per environment -- a developer
     * running the platform locally wants the local Orchestrator. These two are
     * somebody else's product at somebody else's address, the same in every
     * environment, and a variable would imply a local one exists.
     *
     * Verified 200 when set. The log carries a standing instruction to load every
     * outbound href on the way in, after a pattern-derived hostname shipped once
     * and returned DEPLOYMENT_NOT_FOUND.
     */
    href: 'https://tcil-pm.vercel.app/',
    separatelyDeployed: true,
  },
]
