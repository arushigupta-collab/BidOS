import { ArrowLeft, Compass } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, EmptyState } from '@/components/ui'
import { ICON } from '@/lib/tokens'

export function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="scrollable flex flex-1 flex-col justify-center">
      <EmptyState
        icon={<Compass size={ICON.lg} aria-hidden="true" />}
        title="That address does not match a BidOS surface"
        description="Nothing on this environment answers to that route. Return to the BidOS landing to pick a module."
        action={
          <Button
            variant="primary"
            iconLeft={<ArrowLeft size={ICON.md} aria-hidden="true" />}
            onClick={() => navigate('/')}
          >
            Back to BidOS
          </Button>
        }
      />
    </div>
  )
}
