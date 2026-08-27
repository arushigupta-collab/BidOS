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
