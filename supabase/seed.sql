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
