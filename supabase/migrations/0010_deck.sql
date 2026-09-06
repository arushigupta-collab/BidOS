-- The draft proposal deck.
--
-- One per tender, in the private `proposals` bucket, keyed on the tender's id so
-- a re-read replaces the draft rather than leaving one deck per attempt. The
-- path is recorded here so the deck can be fetched again later; without it the
-- artefact is only reachable in the minute after it is generated, which is not
-- long enough to be worth making.
alter table rfps add column deck_path text;
