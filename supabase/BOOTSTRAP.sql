-- BidOS schema + seed, generated 2026-08-25 20:20
-- Paste into Supabase → SQL Editor → New query → Run.
-- Safe to run once on an empty project. Re-running will error on existing types.

-- ============ supabase/migrations/0001_core.sql ============
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

-- ============ supabase/migrations/0002_rfp.sql ============
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

-- ============ supabase/migrations/0003_work.sql ============
-- Work distribution. Bid Hawk derives one work package per role at ingest;
-- Bid Orchestrator assigns them; Bid Author fills and submits them.

create type work_status  as enum ('unassigned', 'assigned', 'in-progress', 'submitted');
create type form_kind    as enum ('fields', 'checklist');
create type fill_source  as enum ('rfp', 'profile', 'ai', 'human');

-- Exactly six per RFP, one per role_id. The bid manager's own package is created
-- alongside the five specialist ones and pre-assigned to the routed manager,
-- which is why it is a work_package like any other rather than a special case.
create table work_packages (
  id              uuid primary key default gen_random_uuid(),
  rfp_id          uuid not null references rfps (id) on delete cascade,
  role_id         role_id not null,
  brief           text,
  source_sections text[] not null default '{}',
  status          work_status not null default 'unassigned',
  assignee_id     text references users (id),
  assigned_at     timestamptz,
  submitted_at    timestamptz,
  unique (rfp_id, role_id)
);

create index work_packages_assignee_idx on work_packages (assignee_id);

create table action_items (
  id              uuid primary key default gen_random_uuid(),
  work_package_id uuid not null references work_packages (id) on delete cascade,
  ord             int not null,
  text            text not null,
  ref             text,
  page_no         int,
  done            boolean not null default false,
  unique (work_package_id, ord)
);

create table forms (
  id              uuid primary key default gen_random_uuid(),
  work_package_id uuid not null references work_packages (id) on delete cascade,
  ord             int not null,
  annexure        text not null,
  title           text not null,
  kind            form_kind not null,
  schema          jsonb not null default '{}'::jsonb,
  status          text not null default 'empty',
  unique (work_package_id, ord)
);

-- `filled_by` is what the three-way provenance badge renders from: a value
-- lifted verbatim from the RFP, taken from the company profile, or drafted.
-- source_page/source_quote are populated only when filled_by = 'rfp'.
create table form_values (
  id           uuid primary key default gen_random_uuid(),
  form_id      uuid not null references forms (id) on delete cascade,
  field_key    text not null,
  value        text,
  filled_by    fill_source not null default 'human',
  source_page  int,
  source_quote text,
  updated_at   timestamptz not null default now(),
  unique (form_id, field_key)
);

-- Prose written by a specialist role in Bid Author. `body` is an array of
-- paragraphs each carrying its own ai flag, matching the Paragraph type the
-- existing compiler screens already render.
create table responses (
  id              uuid primary key default gen_random_uuid(),
  work_package_id uuid not null references work_packages (id) on delete cascade,
  section_id      text not null,
  title           text not null,
  body            jsonb not null default '[]'::jsonb,
  status          text not null default 'Not Started',
  updated_at      timestamptz not null default now(),
  unique (work_package_id, section_id)
);

-- The bid manager's own four authored sections plus the compiled result.
create table bid_documents (
  id         uuid primary key default gen_random_uuid(),
  rfp_id     uuid not null references rfps (id) on delete cascade,
  section_id text not null,
  title      text not null,
  kind       text not null,
  body       jsonb not null default '[]'::jsonb,
  ord        int not null,
  status     text not null default 'Not Started',
  updated_at timestamptz not null default now(),
  unique (rfp_id, section_id)
);

-- Realtime on exactly these two. A submit in Bid Author has to land on the
-- Orchestrator's Team Overview without a refresh; nothing else needs pushing.
alter publication supabase_realtime add table work_packages;
alter publication supabase_realtime add table responses;

-- ============ supabase/migrations/0004_company.sql ============
-- The bidding organisation. Single row by construction: `id` is pinned to 1 by a
-- check constraint so there is exactly one identity to swap, matching the single
-- swap point the Hawk seed already established in src/data/seed/workspace.ts.
--
-- This is what `eligibility` scores the RFP's criteria against, and what the
-- 'profile' branch of Fill with AI reads. Every value here is fictional.
create table company_profile (
  id                    int primary key default 1 check (id = 1),
  legal_name            text not null,
  cin                   text,
  pan                   text,
  gstin                 text,
  incorporation         text,
  regd_office           text,
  turnover              text,
  net_worth             text,
  manpower              text,
  certifications        jsonb not null default '[]'::jsonb,
  signatory             text,
  signatory_designation text,
  email                 text,
  phone                 text
);

-- ============ supabase/seed.sql ============
-- Static seed. Everything here is fictional and is the same on every environment.
-- Extracted RFP rows are NOT seeded: they arrive from the ingest pipeline.

-- ---------------------------------------------------------------------------
-- The bidding organisation
-- ---------------------------------------------------------------------------
-- Name follows Bid Hawk's canonical ORGANISATION; the registration detail is
-- carried over from the Orchestrator profile, which had the fields the
-- eligibility pass and the annexure auto-fill actually need.
insert into company_profile (
  id, legal_name, cin, pan, gstin, incorporation, regd_office,
  turnover, net_worth, manpower, certifications,
  signatory, signatory_designation, email, phone
) values (
  1,
  'Meridian Infratech Limited',
  'U72900MH2016PLC287341',
  'AABCM4521Q',
  '27AABCM4521Q1ZP',
  '14 March 2016',
  '7th Floor, Trident Tech Park, Plot 21, MIDC, Andheri East, Mumbai 400093, Maharashtra',
  'INR 268.4 Cr (standalone, average FY 2022-23 to FY 2024-25)',
  'Positive in each of the last three financial years',
  '1,240 IT/ITeS resources on payroll',
  -- CMMI is deliberately mid-renewal. It is what turns the CMMI eligibility row
  -- into a fail, which is the sharpest moment in the demo.
  '[{"name":"ISO 9001:2015","status":"valid","validTo":"2027-03-31"},
    {"name":"ISO/IEC 20000-1:2018","status":"valid","validTo":"2027-01-15"},
    {"name":"ISO/IEC 27001:2022","status":"valid","validTo":"2026-11-30"},
    {"name":"CMMI-DEV Level 5","status":"under-renewal","validTo":null}]'::jsonb,
  'Rajeev Menon',
  'Whole-time Director',
  'bids@meridianinfratech.in',
  '+91 22 6812 4400'
);

-- ---------------------------------------------------------------------------
-- Bid managers. `domains` and `regions` are the routing dimensions that
-- routeTender() scores an incoming RFP against; `industry` is the label the
-- login screen shows. Two are deliberately lopsided (domain but no region,
-- regions but no domain) so the routing rule is visible in the data.
-- ---------------------------------------------------------------------------
insert into users (id, email, passcode, full_name, initials, title, role_id, industry, domains, regions, active_bids) values
('p-anand','anand.raghunathan@meridianinfratech.in','bidos2026','Anand Raghunathan','AR','General Manager, Bid Management','bid-manager','Telecom and Networks',
  '{Telecom,"Optical Fibre",Networking}','{North,Pan-India}',2),
('p-meera','meera.krishnan@meridianinfratech.in','bidos2026','Meera Krishnan','MK','Senior Manager, Bid Management','bid-manager','e-Governance and Citizen Services',
  '{e-Governance,"Citizen Services","IT Services","AI - Document Intelligence"}','{Maharashtra,Gujarat,West}',3),
('p-vikram','vikram.iyer@meridianinfratech.in','bidos2026','Vikram Iyer','VI','Manager, Bid Management','bid-manager','Cloud, Infrastructure and Security',
  '{"Cloud and Infrastructure",Cybersecurity,"AI - Agentic AI"}','{}',1),
('p-sudeshna','sudeshna.roy@meridianinfratech.in','bidos2026','Sudeshna Roy','SR','Manager, Bid Management','bid-manager','Eastern Region',
  '{}','{East,"West Bengal",Odisha,Bihar}',1),
('p-nafisa','nafisa.qureshi@meridianinfratech.in','bidos2026','Nafisa Qureshi','NQ','Manager, Bid Management','bid-manager','AI and Data',
  '{"AI - Computer Vision","AI - NLP","Data and Analytics"}','{South,Karnataka,Telangana}',2);

-- ---------------------------------------------------------------------------
-- The specialist pool Build Team assigns from. `capabilities` is what makes a
-- person eligible for a role; `role_id` is the seat they log into Bid Author as.
-- Two candidates per role, so every assignment step is a genuine choice.
-- ---------------------------------------------------------------------------
insert into users (id, email, passcode, full_name, initials, title, role_id, capabilities, active_bids) values
('rohan-mehta','rohan.mehta@meridianinfratech.in','bidos2026','Rohan Mehta','RM','Principal Solution Architect','solution-architect','{solution-architect}',1),
('kavya-iyer','kavya.iyer@meridianinfratech.in','bidos2026','Kavya Iyer','KI','Enterprise Architect','solution-architect','{solution-architect}',3),
('sanjay-rao','sanjay.rao@meridianinfratech.in','bidos2026','Sanjay Rao','SR','Senior Counsel, Contracts','legal-1','{legal-1,legal-2}',1),
('neha-bhatt','neha.bhatt@meridianinfratech.in','bidos2026','Neha Bhatt','NB','Counsel, Regulatory and Compliance','legal-2','{legal-1,legal-2}',0),
('vikram-desai','vikram.desai@meridianinfratech.in','bidos2026','Vikram Desai','VD','Head of Commercial Finance','finance','{finance}',2),
('priya-nair','priya.nair@meridianinfratech.in','bidos2026','Priya Nair','PN','Manager, Bid Finance','finance','{finance}',1),
('arjun-kulkarni','arjun.kulkarni@meridianinfratech.in','bidos2026','Arjun Kulkarni','AK','Delivery Director, Public Sector','delivery','{delivery}',2),
('meera-joshi','meera.joshi@meridianinfratech.in','bidos2026','Meera Joshi','MJ','Programme Manager','delivery','{delivery}',0);
