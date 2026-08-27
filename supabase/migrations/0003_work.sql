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
