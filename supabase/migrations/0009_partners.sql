-- Bid Partners.
--
-- The module's screens existed before this migration and ran entirely on seed:
-- fourteen demo tenders, seven partners and a set of invitations held in browser
-- memory. Everything it showed was true of nothing. These tables give it the same
-- footing the other three modules have -- the real uploaded tender, and state that
-- survives a reload.

create table partners (
  id                         text primary key,
  name                       text not null,
  type                       text not null,
  /*
   * The routing axis, and the reason this column exists at all.
   *
   * `capabilities` says what a partner sells and is scored against the tender's
   * scope; industry is coarser and answers a different question -- who should even
   * be asked. A digitisation bureau and a citizen-services integrator both sell
   * "IT Services", and sending each the other's tender wastes both their time.
   */
  industry                   text not null,
  capabilities               text[] not null default '{}',
  regions                    text[] not null default '{}',
  team_size                  int not null default 0,
  annual_turnover_cr         numeric not null default 0,
  certifications             text[] not null default '{}',
  empanelment                text[] not null default '{}',
  contact_name               text not null,
  contact_email              text not null,
  rating                     numeric not null default 0,
  projects_delivered         int not null default 0,
  on_time_delivery_pct       int not null default 0,
  history_entries            jsonb not null default '[]'::jsonb,
  technical_stack            text[] not null default '{}',
  comparable_technical_scope boolean not null default false,
  comparable_scope_note      text not null default '',
  onboarded_at               timestamptz not null default now(),
  status                     text not null default 'active'
);

create index partners_industry_idx on partners (industry);

-- One partner asked to respond to one real tender.
create table partner_invitations (
  id                  uuid primary key default gen_random_uuid(),
  rfp_id              uuid not null references rfps (id) on delete cascade,
  partner_id          text not null references partners (id) on delete cascade,
  status              text not null default 'invited',
  invited_at          timestamptz not null default now(),
  responded_at        timestamptz,
  -- Null is a real state: a partner who has not quoted. Never defaulted to zero,
  -- because zero reads as free.
  quoted_value_cr     numeric,
  quoted_at           timestamptz,
  commercial_note     text,
  covering_note       text,
  requested_documents text[] not null default '{}',
  response_deadline   timestamptz,
  channel             text,
  folder_url          text,
  reminded_at         timestamptz,
  unique (rfp_id, partner_id)
);

create index partner_invitations_rfp_idx on partner_invitations (rfp_id);

create table partner_documents (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references partner_invitations (id) on delete cascade,
  type          text not null,
  status        text not null default 'not-submitted',
  submitted_at  timestamptz,
  note          text,
  unique (invitation_id, type)
);

-- Several files against one requested document, which the old shape could not hold.
-- A partner answering "Technical proposal" sends a proposal, an architecture note
-- and a bill of materials; recording that as one boolean loses two of the three.
create table partner_files (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references partner_documents (id) on delete cascade,
  storage_path  text not null,
  original_name text not null,
  mime          text,
  size_bytes    bigint not null default 0,
  uploaded_at   timestamptz not null default now()
);

create index partner_files_document_idx on partner_files (document_id);

-- One decision per tender, carrying the ones it replaced. An audit trail that
-- loses the previous reason is not an audit trail.
create table partner_decisions (
  rfp_id               uuid primary key references rfps (id) on delete cascade,
  chosen_partner_ids   text[] not null default '{}',
  reason               text not null,
  not_selected_note    text,
  suggested_partner_id text,
  recorded_at          timestamptz not null default now(),
  history              jsonb not null default '[]'::jsonb
);

alter publication supabase_realtime add table partner_invitations;
alter publication supabase_realtime add table partner_documents;
