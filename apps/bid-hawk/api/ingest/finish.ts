/**
 * Routes the tender and writes the completed reading.
 *
 * The last step, and the first one that puts anything in front of a reader. Until
 * this succeeds the upload has cost money but changed nothing anyone can see,
 * which is the correct failure mode for a pipeline with five fallible stages.
 */
import { handler, type Req } from '../_shared.js'
import { persistRun } from '../../src/lib/ingest/persist.js'
import type { CommercialTerms, EligibilityRow, RiskFlag, WorkPackage } from '../../src/lib/ingest/stages.js'

export default handler(async (req: Req) => {
  const { documentId, fileName, pageCount, results } = req.body as {
    documentId: string
    fileName: string
    pageCount: number
    results: {
      extract: CommercialTerms
      eligibility: { rows: EligibilityRow[] }
      risks: { flags: RiskFlag[] }
      summarise: { bullets: string[]; condensed: string[] }
      workpackages: { packages: WorkPackage[] }
    }
  }

  const { rfpId, managerId, shift } = await persistRun({
    documentId,
    storagePath: `rfp-source/${documentId}`,
    originalName: fileName,
    mime: 'application/pdf',
    pageCount,
    // `api/ingest/start` stored the file and computed its real fingerprint before
    // any model ran. Passing anything here would overwrite it.
    sha256: null,
    terms: results.extract,
    eligibility: results.eligibility.rows,
    risks: results.risks.flags,
    summary: results.summarise,
    packages: results.workpackages.packages,
  })

  return { rfpId, managerId, shift }
})
