-- Unit head approval, before the work is distributed.
--
-- A bid manager can read a tender and see what it demands without anyone having
-- committed to bidding. Distributing it across six people IS that commitment, so
-- the decision sits between the two rather than being implied by the first
-- assignment.
--
-- Held on the RFP because it is a fact about the bid, not about one person's
-- session: a rejected tender is rejected for whoever opens it next.
create type approval_state as enum ('pending', 'accepted', 'rejected');

alter table rfps
  add column approval approval_state not null default 'pending',
  add column approval_note text,
  add column approval_at timestamptz;
