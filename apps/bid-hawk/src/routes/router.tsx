import { createBrowserRouter, createHashRouter } from 'react-router-dom'
import { CanvasShell } from '@/components/shell/CanvasShell'
import { LandingPage } from '@/features/platform/LandingPage'
import { BidHawkPage } from '@/features/bidHawk/BidHawkPage'
import { BidPartnersPage } from '@/features/bidPartners/BidPartnersPage'
import { RegistryPage } from '@/features/bidPartners/registry/RegistryPage'
import { ResponsesPage } from '@/features/bidPartners/responses/ResponsesPage'
import { ResponseDetailPage } from '@/features/bidPartners/responses/ResponseDetailPage'
import { EvaluationPage } from '@/features/bidPartners/evaluation/EvaluationPage'
import { EvaluationDetailPage } from '@/features/bidPartners/evaluation/EvaluationDetailPage'
import { AddPartnerPage } from '@/features/bidPartners/registry/form/AddPartnerPage'
import { AddSourcePage } from '@/features/sources/new/AddSourcePage'
import { SourcesPage } from '@/features/sources/list/SourcesPage'
import { AddPeoplePage } from '@/features/team/new/AddPeoplePage'
import { PeoplePage } from '@/features/team/list/PeoplePage'
import { FeedPage } from '@/features/feed/FeedPage'
import { IntakePage } from '@/features/intake/IntakePage'
import { RfpSummaryPage } from '@/features/feed/detail/RfpSummaryPage'
import { NotFound } from './NotFound'

export const ROUTER_FUTURE = {
  v7_relativeSplatPath: true,
  v7_fetcherPersist: true,
  v7_normalizeFormMethod: true,
  v7_partialHydration: true,
  v7_skipActionErrorRevalidation: true,
} as const

/**
 * Exported so tests can mount the real tree through a memory router.
 *
 * Two branches on the same path, because the shell takes a prop and the platform
 * landing is the only screen that wants the footer. The index route is the whole of
 * the first branch, so every other address falls through to the second.
 */
export const ROUTES = [
  {
    path: '/',
    // The landing sets the wordmark at Display size inside the card, so the canvas
    // does not repeat it. The only route that passes either prop.
    element: <CanvasShell footer showWordmark={false} />,
    children: [{ index: true, element: <LandingPage /> }],
  },
  {
    path: '/',
    element: <CanvasShell />,
    children: [
      { path: 'bid-hawk', element: <BidHawkPage /> },

      /** Bid Partners: registry, response tracker and evaluation, all three built. */
      { path: 'bid-partners', element: <BidPartnersPage /> },
      { path: 'bid-partners/registry', element: <RegistryPage /> },
      { path: 'bid-partners/registry/new', element: <AddPartnerPage /> },
      // The edit route reuses the add screen, arriving on its form with the partner's
      // values in it rather than duplicating nine fields in a second component.
      { path: 'bid-partners/registry/:id/edit', element: <AddPartnerPage /> },
      { path: 'bid-partners/responses', element: <ResponsesPage /> },
      { path: 'bid-partners/responses/:rfpId', element: <ResponseDetailPage /> },
      { path: 'bid-partners/evaluation', element: <EvaluationPage /> },
      { path: 'bid-partners/evaluation/:rfpId', element: <EvaluationDetailPage /> },
      { path: 'sources', element: <SourcesPage /> },
      { path: 'sources/new', element: <AddSourcePage /> },
      { path: 'team', element: <PeoplePage /> },
      { path: 'team/new', element: <AddPeoplePage /> },
      // The edit route reuses the add screen, arriving on its form with the row's
      // values in it rather than duplicating the form in a second component.
      { path: 'team/:id/edit', element: <AddPeoplePage /> },
      /**
       * Reading a document the workspace did not already hold. Sits beside the
       * feed rather than under sources: a source is a place listings arrive from
       * on their own, and this is a document handed over by someone.
       */
      { path: 'intake', element: <IntakePage /> },
      { path: 'feed', element: <FeedPage /> },
      { path: 'feed/:id', element: <RfpSummaryPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]

/**
 * The router for the active target, chosen once at build time.
 *
 * The web build uses browser history, so addresses read /feed and /bid-hawk/team.
 * The offline build uses hash history, because the History API cannot resolve a
 * deep link from a file:// origin — the browser would look for a file at that path
 * and find nothing.
 *
 * Which one is decided by `__OFFLINE__`, a constant each Vite config replaces with
 * a literal, so the losing branch is eliminated from the bundle. Nothing else in
 * the app knows or can know which mode it is in: every `<Link to="/feed">` and
 * every `navigate('/feed')` is written the same way for both, and react-router
 * adds the `#` itself where it is needed.
 *
 * Written as a direct ternary on the constant, with no parameter to override it.
 * A parameter would make this a runtime branch and both factories would ship — the
 * first version of this did exactly that, and `createHashRouter` was still in the
 * web bundle. Folding `false ? … : …` at build time is what drops the losing
 * factory and its history implementation entirely.
 *
 * Which means the choice cannot be asserted by calling this from a test. It is
 * asserted against the built output instead, in src/routes/target.test.ts.
 */
export const router = __OFFLINE__
  ? createHashRouter(ROUTES, { future: ROUTER_FUTURE })
  : createBrowserRouter(ROUTES, { future: ROUTER_FUTURE })
