-- Review, and the record of it.
--
-- A submitted package was previously terminal: the bid manager watched five
-- amber rows turn green and that was the whole of their involvement. But the
-- manager signs the bid, so their reading of each specialist's work is the point
-- at which it becomes the company's answer rather than one person's draft.

-- Deliberately not folded into work_status. A package that has been handed back
-- and not yet read is a real state, and one enum cannot hold both "where is this
-- in the work" and "what did the manager make of it" without losing that.
create type review_state as enum ('pending', 'approved', 'changes-requested');

alter table work_packages
  add column review      review_state not null default 'pending',
  add column review_note text,
  add column review_at   timestamptz,
  add column review_by   text references users (id);

-- Append-only. Every row is something that happened, and nothing rewrites one.
--
-- actor_name and role_id are copied in rather than joined. A log exists to be
-- readable later, and one that goes blank when a user row is edited or removed
-- is not a log -- it is a view over live data that happens to be ordered by time.
create table bid_events (
  id         uuid primary key default gen_random_uuid(),
  rfp_id     uuid not null references rfps (id) on delete cascade,
  role_id    role_id,
  kind       text not null,
  actor_name text not null,
  subject    text,
  note       text,
  at         timestamptz not null default now()
);

create index bid_events_rfp_idx on bid_events (rfp_id, at desc);

alter publication supabase_realtime add table bid_events;
