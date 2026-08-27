-- The passages a risk flag rests on.
--
-- Separated from `detail` because the two are different kinds of claim and only
-- one of them is checkable. `detail` is the reading: what the document says and
-- why it is a problem, in the model's own words. `evidence` is the support:
-- passages copied from the page, contiguous, each naming where it came from.
--
-- They were one field, and the model wrote paraphrases inside quotation marks --
-- "API response time ... <= 0.30 ms per API call" -- which reads as evidence
-- while being its own words. Instructing it otherwise did not work; splitting the
-- fields did, because only the second one claims to be verbatim and can be
-- verified against the page automatically.
--
-- src/lib/ingest/riskEvidence.test.ts asserts every entry is on the page it names.
alter table risk_flags
  add column evidence jsonb not null default '[]'::jsonb;
