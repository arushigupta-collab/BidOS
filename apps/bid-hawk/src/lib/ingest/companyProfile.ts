/**
 * The organisation we are bidding as, in the form the eligibility stage reads.
 *
 * Mirrors the company_profile row in supabase/seed.sql and the ORGANISATION
 * constant in src/data/seed/workspace.ts. All of it is fictional.
 *
 * Written as prose rather than as fields because the stage's job is to judge
 * open-ended criteria against it -- "experience of implementing minimum two
 * projects in delivery of citizen services" is not a lookup, and a model given a
 * flat record starts answering "the profile does not state" to anything not
 * literally named. The earlier version of this omitted project credentials
 * entirely and produced exactly that: two criteria marked fail on the grounds
 * that nothing could be verified either way.
 *
 * The credentials are deliberately NOT tuned to produce a wanted set of
 * statuses. They describe a plausible mid-size Indian SI, and the stage judges
 * what it finds. A profile reverse-engineered to yield a predetermined snapshot
 * survives exactly until someone in the room asks a follow-up question.
 */
export const COMPANY_PROFILE = `
Legal name: Meridian Infratech Limited
Incorporated: 14 March 2016 under the Companies Act 2013. CIN U72900MH2016PLC287341.
Registered office: 7th Floor, Trident Tech Park, Plot 21, MIDC, Andheri East, Mumbai 400093,
  Maharashtra. Second delivery centre in Pune (Hinjawadi).
Seat capacity: 340 seats Mumbai, 210 seats Pune.

FINANCIALS
  Average annual turnover: INR 268.4 Cr standalone, FY 2022-23 to FY 2024-25.
    (FY 2022-23 INR 241.7 Cr, FY 2023-24 INR 268.9 Cr, FY 2024-25 INR 294.6 Cr.)
    Standalone only. The group holds two subsidiaries whose turnover is not included.
  Net worth: positive in each of the last three financial years.
  Audited statements available for all three years, signed by a practising Chartered Accountant.

REGISTRATIONS
  GST: 27AABCM4521Q1ZP. PAN: AABCM4521Q.
  Provident Fund and ESIC registered. Labour law compliant.

CERTIFICATIONS
  ISO 9001:2015          in force, valid to 31 March 2027
  ISO/IEC 20000-1:2018   in force, valid to 15 January 2027
  ISO/IEC 27001:2022     in force, valid to 30 November 2026
  CMMI-DEV Level 5       LAPSED AND UNDER RENEWAL. The previous appraisal expired and the
                         re-appraisal is scheduled but not complete. The company is NOT currently
                         listed on the CMMI Institute PARS directory. The renewal date is set by
                         the appraising body, not by the company.

MANPOWER
  1,240 IT/ITeS resources on payroll, continuously above 1,000 since April 2021.
  Includes 180 certified cloud engineers and 64 security specialists.

GOVERNMENT AND PSU PROJECT CREDENTIALS, last 7 years
  1. Statewide grievance redressal and service-delivery portal for a state IT department.
     Awarded Sep 2021. Value INR 34.6 Cr. Completed, completion certificate held.
     Citizen-facing service delivery.
  2. Integrated revenue and land-records digitisation for a state revenue department.
     Awarded Mar 2023. Value INR 28.2 Cr. In O&M, phase completion certificates held.
     Citizen-facing service delivery.
  3. Network and data-centre modernisation for a central PSU.
     Awarded Jul 2022. Value INR 21.4 Cr. Completed.
  4. Municipal property tax and permits platform for an urban local body.
     Awarded Jan 2024. Value INR 12.8 Cr. In O&M. Citizen-facing service delivery.

STANDING
  Not blacklisted, debarred or declared ineligible by any Central or State government body or
  government institution in India. No conviction for an economic offence. No pending litigation
  that would impair performance.

GOVERNANCE
  Board resolution and power of attorney for the authorised signatory are issued per tender and
  are not standing documents.
  Authorised signatory: Rajeev Menon, Whole-time Director.
`.trim()
