-- Extracted RFP truth. Every module reads these tables and none of them
-- re-extracts: Bid Hawk writes here once, Orchestrator and Author only read.

create type eligibility_status as enum ('pass', 'warn', 'fail');
create type risk_severity      as enum ('high', 'medium', 'low');
create type rfp_status         as enum ('new', 'reviewing', 'assigned', 'accepted', 'declined');

create table rfps (
  id                    uuid primary key default gen_random_uuid(),
  document_id           uuid unique references rfp_documents (id) on delete cascade,

  title                 text not null,
  tender_ref            text,
  source                text,
  source_url            text,
  issuing_authority     text,

  -- The eight facts the Orchestrator's RFP detail page is specified to carry.
  selection_method      text,
  tender_fee            text,
  emd                   text,
  bid_due_at            timestamptz,
  bid_validity          text,
  contract_term         text,
  pbg                   text,

  -- Value is frequently absent from Indian government tenders and is then
  -- inferred from scope. The UI must say so out loud when this flag is set,
  -- so it is a column rather than a convention.
  est_value             text,
  est_value_is_inferred boolean not null default false,

  envelopes             jsonb,
  prebid_due_at         timestamptz,
  prebid_conference     text,
  consortium_allowed    boolean,

  -- Routing dimensions, matched against users.domains / users.regions.
  industry              text,
  region                text,
  category              text,

  status                rfp_status not null default 'new',
  assigned_manager_id   text references users (id),
  routing_rationale     jsonb,

  is_seeded             boolean not null default false,
  created_at            timestamptz not null default now()
);

create index rfps_manager_idx on rfps (assigned_manager_id);
create index rfps_due_idx     on rfps (bid_due_at);

-- Citations. Every extracted fact lands here with the page it came from and the
-- verbatim sentence that supports it, so the UI can open the PDF at that page
-- and the reader can check the model rather than trust it.
create table rfp_fields (
  id          uuid primary key default gen_random_uuid(),
  rfp_id      uuid not null references rfps (id) on delete cascade,
  key         text not null,
  value       text,
  confidence  numeric(3,2),
  page_no     int,
  quote       text,
  unique (rfp_id, key)
);

create table rfp_summary (
  rfp_id       uuid primary key references rfps (id) on delete cascade,
  bullets      jsonb not null default '[]'::jsonb,
  condensed    jsonb not null default '[]'::jsonb,
  model        text,
  generated_at timestamptz not null default now()
);

create table eligibility_rows (
  id        uuid primary key default gen_random_uuid(),
  rfp_id    uuid not null references rfps (id) on delete cascade,
  ord       int not null,
  status    eligibility_status not null,
  criterion text not null,
  note      text,
  page_no   int,
  unique (rfp_id, ord)
);

create table risk_flags (
  id             uuid primary key default gen_random_uuid(),
  rfp_id         uuid not null references rfps (id) on delete cascade,
  ord            int not null,
  severity       risk_severity not null,
  title          text not null,
  detail         text not null,
  recommendation text,
  deadline_at    timestamptz,
  page_no        int,
  unique (rfp_id, ord)
);
