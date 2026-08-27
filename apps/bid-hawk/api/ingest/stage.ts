/**
 * Runs ONE model stage and returns its result.
 *
 * One stage per request so no invocation approaches a serverless time limit: the
 * slowest stage on a 262-page document is a little over two minutes, while the
 * whole pipeline is over four.
 *
 * Results accumulate on the CLIENT and come back in `prior`. That is deliberate.
 * The alternative -- writing each stage into the database as it completes -- means
 * a run that fails at stage four leaves a half-read tender behind, and the feed
 * has to learn the difference between a tender and a fragment of one. Nothing is
 * written until every stage has succeeded.
 */
import { handler, pagesFor, type Req } from '../_shared'
import { COMPANY_PROFILE } from '../../src/lib/ingest/companyProfile'
import {
  deriveWorkPackages, extractCommercialTerms, extractEligibility, extractRisks, writeSummary,
  type CommercialTerms, type EligibilityRow, type RiskFlag,
} from '../../src/lib/ingest/stages'

export type StageName = 'extract' | 'eligibility' | 'risks' | 'workpackages' | 'summarise'

export default handler(async (req: Req) => {
  const { documentId, stage, prior } = req.body as {
    documentId: string
    stage: StageName
    prior?: {
      extract?: CommercialTerms
      eligibility?: { rows: EligibilityRow[] }
      risks?: { flags: RiskFlag[] }
    }
  }

  const pages = await pagesFor(documentId)

  switch (stage) {
    case 'extract':
      return extractCommercialTerms(pages)

    case 'eligibility':
      return extractEligibility(pages, COMPANY_PROFILE)

    case 'risks':
      // Passed the terms so it can tell an omission from a page it was not given.
      return extractRisks(pages, prior?.extract)

    case 'workpackages': {
      if (!prior?.extract) throw new Error('workpackages needs the extracted terms')
      return deriveWorkPackages(pages, prior.extract)
    }

    case 'summarise': {
      if (!prior?.extract || !prior.eligibility || !prior.risks) {
        throw new Error('summarise needs the terms, eligibility and risks')
      }
      return writeSummary(prior.extract, prior.eligibility.rows, prior.risks.flags)
    }

    default:
      throw new Error(`unknown stage "${stage}"`)
  }
})
