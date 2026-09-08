-- Pre-bid queries.
--
-- "Raise as pre-bid query" resolved after a delay, turned a button green and
-- persisted nothing: the state was gone on reload. A pre-bid query is the one
-- output of reading a tender that goes back to the buyer under a deadline, so
-- losing it is worse than not offering the control.
--
-- Recorded against the reading AND with the flag's own text copied in, because
-- the queries are exported and read weeks later by somebody assembling a
-- submission. A row that needs a join to a mutable table to be legible is not a
-- record of what was asked.
create table prebid_queries (
  id          uuid primary key default gen_random_uuid(),
  rfp_id      uuid not null references rfps (id) on delete cascade,
  tender_ref  text,
  flag_title  text not null,
  question    text not null,
  severity    risk_severity,
  -- Where in the document the defect was found. The whole point of a pre-bid
  -- query is that the buyer can look it up.
  page_no     int,
  raised_at   timestamptz not null default now(),
  -- One query per defect per tender. Raising the same flag twice is the same
  -- question, not a second one.
  unique (rfp_id, flag_title)
);

create index prebid_queries_rfp_idx on prebid_queries (rfp_id, raised_at);
