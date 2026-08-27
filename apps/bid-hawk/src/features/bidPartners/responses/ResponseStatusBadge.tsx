import type { ResponseStatus } from './responsesModel'
import { Badge } from '@/components/ui'
import { STATUS_COPY } from './responsesModel'

/**
 * COLOUR RULE, deliberate and load-bearing.
 *
 * CLAUDE.md reserves the three deadline urgency tokens for SUBMISSION deadlines: your
 * own bid deadlines in the RFP feed. A partner's response deadline is a different clock
 * on a different scale, and if it borrowed those tokens then a red row in the feed and
 * a red row here would mean two unrelated things and the feed's urgency reading would
 * stop meaning one thing.
 *
 * So Overdue takes `destructive`, and the other three take neutral surface steps. No new
 * colour token, and no amber accent anywhere on this screen: the accent means agent
 * activity, and every state here is a fact about what a partner did or did not send.
 */
const TONE: Record<ResponseStatus, 'destructive' | 'success' | 'neutral'> = {
  overdue: 'destructive',
  complete: 'success',
  'in-progress': 'neutral',
}

export function ResponseStatusBadge({ status }: { status: ResponseStatus }) {
  return <Badge tone={TONE[status]}>{STATUS_COPY[status]}</Badge>
}
