-- BidOS shared schema. One Supabase project backs all three modules:
-- Bid Hawk (intake + routing), Bid Orchestrator (assembly), Bid Author (drafting).
--
-- No RLS and no Supabase Auth provider: roles are mock for the demo and the
-- login screens validate against `users` directly. Every policy decision here is
-- therefore deliberate, not an oversight -- see 0004_grants.sql.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

create type role_id as enum (
  'bid-manager',
  'solution-architect',
  'legal-1',
  'legal-2',
  'finance',
  'delivery'
);

-- One table serves both people models the repos arrived with. A bid manager is
-- routed to on `domains`/`regions`, which is what routeTender() scores; a
-- specialist is assigned from `capabilities`, which is what Build Team reads.
-- Neither column is meaningful for the other kind of user and both stay empty
-- rather than being faked.
create table users (
  id            text primary key,
  email         text not null unique,
  passcode      text not null,
  full_name     text not null,
  initials      text not null,
  title         text,
  role_id       role_id not null,
  industry      text,
  domains       text[] not null default '{}',
  regions       text[] not null default '{}',
  capabilities  role_id[] not null default '{}',
  active_bids   int not null default 0,
  added_at      timestamptz not null default now()
);

create index users_role_idx on users (role_id);

-- ---------------------------------------------------------------------------
-- Source documents and the ingest state machine
-- ---------------------------------------------------------------------------

create table rfp_documents (
  id             uuid primary key default gen_random_uuid(),
  storage_path   text not null,
  original_name  text not null,
  mime           text not null,
  page_count     int,
  sha256         text unique,
  uploaded_by    text references users (id),
  uploaded_at    timestamptz not null default now()
);

-- Stages run in this order. Each advance is one bounded HTTP call so no
-- invocation approaches the Vercel function timeout on a 262-page document.
create type ingest_stage as enum (
  'upload', 'paginate', 'vision', 'locate', 'extract',
  'eligibility', 'risks', 'summarise', 'workpackages', 'route', 'ready', 'failed'
);

create table rfp_ingest_jobs (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references rfp_documents (id) on delete cascade,
  stage         ingest_stage not null default 'upload',
  stage_detail  text,
  progress      numeric(5,4) not null default 0,
  error         text,
  model_calls   jsonb not null default '[]'::jsonb,
  cost_usd      numeric(10,4) not null default 0,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz
);

create index ingest_jobs_document_idx on rfp_ingest_jobs (document_id);

-- The page index. `text` is the embedded text layer where one exists; pages
-- without one are candidates for the VLM, but only if `locate` also picks them.
-- Reading all 262 pages with a vision model is what this table exists to avoid.
create table rfp_pages (
  document_id    uuid not null references rfp_documents (id) on delete cascade,
  page_no        int not null,
  text           text,
  has_text_layer boolean not null default false,
  image_path     text,
  ocr_model      text,
  primary key (document_id, page_no)
);
