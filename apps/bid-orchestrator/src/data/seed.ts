import type {
  Rfp,
  Role,
  Person,
  Section,
  ContextFolder,
  RoleId,
  BidForm,
  SourceRow,
} from "../types";

// The signed-in user (from Appendix B). Pre-assigned as Bid Manager.
export const CURRENT_USER_ID = "arushi-sharma";

// Fixed ordering of the six wizard roles.
export const ROLE_ORDER: RoleId[] = [
  "bid-manager",
  "solution-architect",
  "legal-1",
  "legal-2",
  "finance",
  "delivery",
];

// ---------------------------------------------------------------------------
// RFP inbox (Appendix A)
// ---------------------------------------------------------------------------

const primaryRfp: Rfp = {
  id: "RFP-001",
  title:
    "Selection of System Integrator for Implementation of Maharashtra RTS Aaple Sarkar 2.0",
  source: "MahaTenders",
  authority:
    "Maharashtra Information Technology Corporation Limited (MahaIT), a Government of Maharashtra Enterprise",
  due: "28 Aug 2025",
  value: "Not disclosed",
  status: "Pending Review",
  detailed: true,
  tenderRef: "MAHAIT/RTS2.0/001/2025/080",
  sourceUrl: "https://www.mahatenders.gov.in",
  documentUrl: "/RTS2-RFP-AapleSarkar-2.0.pdf",
  documentName: "RTS2-RFP-Volume-I.pdf",
  keyFacts: [
    {
      label: "Issuing Authority",
      value:
        "Maharashtra Information Technology Corporation Limited (MahaIT), a Government of Maharashtra Enterprise",
    },
    {
      label: "Selection Method",
      value:
        "Quality and Cost Based Selection (QCBS), Bn = 0.70·Tn + 0.30·Fn, prices inclusive of GST",
    },
    { label: "Tender Fee", value: "INR 25,000 (non-refundable, paid on portal)" },
    {
      label: "EMD",
      value: "INR 1,00,00,000 (One Crore) as Bank Guarantee, original submitted physically",
    },
    { label: "Bid Due Date", value: "28 Aug 2025, 17:00 (online)" },
    { label: "Bid Validity", value: "180 days from bid submission date" },
    {
      label: "Contract Term",
      value: "45 months (9 implementation + 36 O&M)",
    },
    {
      label: "PBG",
      value:
        "10% of contract value, unconditional, within 30 days of LOI, valid 180 days beyond O&M",
    },
  ],
  aiSummary: [
    "MahaIT is procuring a single System Integrator to rebuild the Aaple Sarkar citizen services portal. Of the 511 services notified under the Maharashtra Right to Public Services Act 2015, 387 are currently available online and 124 remain to be onboarded. The existing 1.0 platform is cited as having a cluttered interface, incomplete digitisation of notified services, no seamless API integration with Gateway Departments, browser compatibility issues, redundant document storage on the Maharashtra State Data Centre, and a limited set of delivery channels.",
    "Aaple Sarkar 2.0 must deliver a unified citizen portal on the MahaSamnavay single sign-on, with onboarding of both Standard and Gateway Departments through a configurable no-code workflow engine, end to end service enablement, and third party integrations including UIDAI, DigiLocker, MahaDBT and a payment gateway. Scope also covers a chatbot, IVR and call centre stack, a Central Project Management Unit function, migration of roughly 1,25,00,000 existing user profiles, and expanded delivery channels including doorstep delivery through the VLE network. Performance targets are demanding: 99.5% portal uptime per calendar month, a minimum of 1,00,000 concurrent users, and API response within 0.30 ms.",
    "Selection is QCBS with a 70:30 technical to commercial weighting, scored as Bn = 0.70·Tn + 0.30·Fn, and a technical bid must reach 70% to qualify for commercial opening. Pre-qualification is heavy: INR 250 Cr average annual turnover on a standalone basis over the three financial years to 31 March 2025, positive net worth across those years, CMMI Level 5 plus ISO 9001, 20000 and 27001, at least 100 IT resources on payroll since 1 April 2022, a 100 seat office in India, and a 20 seat office within the Mumbai Metropolitan Region or an undertaking to open one within 15 days of award. The term is 45 months, nine of implementation and thirty-six of operations, consortiums are not permitted, and the bid is submitted through a four envelope system on MahaTenders.",
  ],
  aiSummaryCondensed: [
    "Single System Integrator to rebuild the Aaple Sarkar portal: 511 notified RTS services, 387 online today, 124 still to be onboarded.",
    "Scope covers MahaSamnavay SSO, Standard and Gateway department onboarding, UIDAI, DigiLocker, MahaDBT and payment gateway, chatbot, IVR and call centre, and migration of ~1.25 Cr user profiles.",
    "Performance targets: 99.5% monthly uptime, 1,00,000 concurrent users, 0.30 ms API response, over a 45 month term (9 + 36).",
    "QCBS 70:30 with a 70% technical cut-off, heavy pre-qualification, consortiums not permitted, four envelope submission on MahaTenders.",
  ],
  eligibility: [
    {
      status: "pass",
      criterion: "Registered under Companies Act 1956/2013",
      note: "Certificate of Incorporation on file",
    },
    {
      status: "pass",
      criterion: "7 years in IT/ITeS software development in India",
      note: "Latest work order available",
    },
    {
      status: "warn",
      criterion:
        "Average annual turnover ≥ INR 250 Cr (last 3 FY to 31 Mar 2025)",
      note: "Standalone entity turnover only, parent and subsidiary turnover excluded. Confirm standalone figure with Finance.",
    },
    {
      status: "pass",
      criterion: "Positive net worth for each of last 3 FY",
      note: "Statutory auditor certificate needed",
    },
    {
      status: "warn",
      criterion:
        "IT turnkey projects for Govt/PSU: 1 project > INR 50 Cr, or 2 > INR 30 Cr, or 3 > INR 20 Cr",
      note: "Two candidate projects identified, completion certificates to be retrieved",
    },
    {
      status: "pass",
      criterion: "Two citizen service or scheme delivery projects in last 7 years",
      note: "Case studies available",
    },
    {
      status: "pass",
      criterion: "Not blacklisted or convicted of economic offence",
      note: "Affidavit format in Annexures",
    },
    {
      status: "fail",
      criterion: "CMMI Level 5 (development), ISO 9001, ISO 20000, ISO 27001",
      note: "CMMI certificate under renewal. Must be verifiable at cmmiinstitute.com/pars before commercial bid opening or bid is disqualified.",
    },
    {
      status: "pass",
      criterion: "GST registration",
      note: "Valid certificate on file",
    },
    {
      status: "pass",
      criterion:
        "100 IT/ITeS resources on payroll since 1 Apr 2022, 100 seat office in India",
      note: "HR and PF statement required",
    },
    {
      status: "warn",
      criterion: "20 seat office within Mumbai Metropolitan Region",
      note: "No existing MMR office. Undertaking route available: set up within 15 days of award.",
    },
  ],
};

const syntheticRfps: Rfp[] = [
  {
    id: "RFP-002",
    title: "Supply and Implementation of Integrated Command and Control Centre",
    source: "GeM",
    authority: "Municipal Corporation of Greater Mumbai",
    due: "12 Aug 2026",
    value: "INR 68 Cr",
    status: "Pending Review",
    detailed: false,
  },
  {
    id: "RFP-003",
    title: "AI Based Document Digitisation and Records Management Platform",
    source: "CPPP",
    authority: "Ministry of Coal",
    due: "04 Aug 2026",
    value: "INR 22 Cr",
    status: "Pending Review",
    detailed: false,
  },
  {
    id: "RFP-004",
    title: "Enterprise Data Lake and Analytics Modernisation",
    source: "Direct",
    authority: "National Housing Bank",
    due: "19 Aug 2026",
    value: "INR 31 Cr",
    status: "Accepted",
    detailed: false,
  },
  {
    id: "RFP-005",
    title: "Managed Network Services for 400 Branch Locations",
    source: "GeM",
    authority: "Regional Rural Bank Consortium",
    due: "30 Jul 2026",
    value: "INR 45 Cr",
    status: "Rejected",
    detailed: false,
  },
  {
    id: "RFP-006",
    title: "Statewide GIS and Land Records Digitisation",
    source: "MahaTenders",
    authority: "Department of Land Records, Maharashtra",
    due: "22 Aug 2026",
    value: "INR 54 Cr",
    status: "Pending Review",
    detailed: false,
  },
  {
    id: "RFP-007",
    title: "Unified Payments and Reconciliation Platform",
    source: "CPPP",
    authority: "Ministry of Finance",
    due: "09 Sep 2026",
    value: "INR 38 Cr",
    status: "Pending Review",
    detailed: false,
  },
  {
    id: "RFP-008",
    title: "Railway Station Wi-Fi and Passenger Analytics",
    source: "Direct",
    authority: "RailTel Corporation of India",
    due: "16 Aug 2026",
    value: "INR 29 Cr",
    status: "Accepted",
    detailed: false,
  },
  {
    id: "RFP-009",
    title: "Cloud Migration for State Treasury Applications",
    source: "GeM",
    authority: "Directorate of Treasuries and Accounts",
    due: "27 Sep 2026",
    value: "INR 41 Cr",
    status: "Pending Review",
    detailed: false,
  },
  {
    id: "RFP-010",
    title: "Smart Metering and Utility Billing System",
    source: "CPPP",
    authority: "State Electricity Distribution Company",
    due: "05 Sep 2026",
    value: "INR 62 Cr",
    status: "Rejected",
    detailed: false,
  },
];

// ---------------------------------------------------------------------------
// Sources (connected e-procurement platforms)
// ---------------------------------------------------------------------------

export const SOURCES: SourceRow[] = [
  {
    id: "src-1",
    name: "Government e-Marketplace",
    platform: "GeM",
    listingUrl: "https://gem.gov.in/bidlists",
    registeredId: "GEM-BUY-25-0087",
    loginNote: "Vault-encrypted portal login",
    keywords: ["citizen services"],
    status: "Active",
    added: "21 min ago",
  },
  {
    id: "src-2",
    name: "Systems integration and managed services",
    platform: "GeM",
    listingUrl: "https://gem.gov.in/bidlists",
    registeredId: "GEM-SLR-4471902",
    loginNote: "Vault-encrypted seller login",
    keywords: ["system integrator", "managed services", "e-governance", "PSU"],
    status: "Active",
    added: "7 months ago",
  },
  {
    id: "src-3",
    name: "Turnkey and e-governance",
    platform: "CPPP",
    listingUrl: "https://eprocure.gov.in/eprocure/app",
    registeredId: "CPPP-BR-2019-88134",
    loginNote: "Vault-encrypted portal login",
    keywords: ["turnkey", "optical fibre", "data centre", "networking", "e-governance"],
    status: "Active",
    added: "6 months ago",
  },
  {
    id: "src-4",
    name: "Railway signalling and telecom",
    platform: "IREPS",
    listingUrl: "https://www.ireps.gov.in/epsn/anonymSearch",
    registeredId: "IREPS-VC-30281-MIL",
    loginNote: "Vault-encrypted vendor login",
    keywords: ["signalling", "telecom works", "OFC", "SCADA"],
    status: "Active",
    added: "5 months ago",
  },
  {
    id: "src-5",
    name: "Maharashtra citizen services",
    platform: "MahaTenders",
    listingUrl: "https://www.mahatenders.gov.in/nicgep/app",
    registeredId: "MAHA-BR-114509",
    loginNote: "Vault-encrypted portal login",
    keywords: ["Aaple Sarkar", "RTS", "citizen services", "portal", "e-governance"],
    status: "Active",
    added: "3 months ago",
  },
  {
    id: "src-6",
    name: "Karnataka smart city and data centre",
    platform: "State portal",
    listingUrl: "https://etenders.karnataka.gov.in/eprocure",
    registeredId: "KA-ETP-59120",
    loginNote: "Vault-encrypted portal login",
    keywords: ["smart city", "data centre", "IoT", "surveillance"],
    status: "Paused",
    added: "1 month ago",
  },
];

export const RFPS: Rfp[] = [primaryRfp, ...syntheticRfps];

// ---------------------------------------------------------------------------
// Roles + action items (Appendix A)
// ---------------------------------------------------------------------------

export const ROLES: Record<RoleId, Role> = {
  "bid-manager": {
    id: "bid-manager",
    name: "Bid Manager",
    mandate: "Submission ownership, envelopes and coordination",
    brief:
      "The bid management team owns the end to end submission on MahaTenders. They must file the bid in the four envelope structure, ensure it is digitally signed by the authorised signatory, and lodge the EMD, Power of Attorney and NDA originals physically. Missing any pre-qualification declaration, or the 28 Aug submission deadline, leads to outright rejection of the bid.",
    sourceSections: [
      "Instruction to Bidders",
      "Structure of Proposal",
      "Fact Sheet",
    ],
    forms: [
      "Annexure 1 - Tender Offer Form",
      "Annexure 2 - Details of Bidder",
      "Annexure 19 - Pre-Qualification Bid Covering Letter",
      "Annexure 21 - Technical Bid Covering Letter",
      "Annexure 25 - Pre-Qualification Checklist",
      "Annexure 26 - Technical Bid Checklist",
    ],
    avatarClasses: "bg-navy text-white",
    submittedAt: "27 Aug, 16:10",
    submission:
      "All four envelopes staged on the portal with digital signature by the authorised signatory. Pre-bid queries filed to tender@mahait.org ahead of the 13 Aug deadline, pre-bid conference attended, and two corrigenda logged. Pre-qualification checklist and annexure declarations assembled. Physical submission of the EMD Bank Guarantee, Power of Attorney and NDA originals arranged and tracked with the courier.",
    actionItems: [
      {
        text: "Own the four envelope submission on mahatenders.gov.in (E1 Tender Fee and EMD, E2 Pre-Qualification, E3 Technical, E4 Commercial BOQ), digitally signed by the authorised signatory, with pages sequentially numbered, initialled and stamped",
        ref: "§4.10, §4.22",
      },
      {
        text: "File pre-bid queries by 13 Aug 12:00 to tender@mahait.org only, no other channel accepted",
        ref: "§4.5.1, Fact Sheet",
      },
      {
        text: "Attend the pre-bid conference on 18 Aug 12:00 at the Board Room, Apeejay House, and track corrigenda published on the portal",
        ref: "§4.5.2, §4.5.3",
      },
      {
        text: "Assemble the Pre-Qualification Checklist and all Annexure declarations",
        ref: "§5.4, Annexure 25",
      },
      {
        text: "Arrange physical submission of the EMD Bank Guarantee original, Power of Attorney original and NDA original",
        ref: "§4.10",
      },
      {
        text: "Author the Cover Letter, Executive Summary, Company Profile and Table of Contents",
        ref: "",
      },
    ],
  },
  "solution-architect": {
    id: "solution-architect",
    name: "Solution Architect",
    mandate: "Technical solution, sizing and estimation",
    brief:
      "The technical team must propose a solution that answers every Functional Requirement Specification and meets a demanding performance envelope of 99.5 percent uptime, 1,00,000 concurrent users and a 0.30 ms API response. The design has to run on the MahaSamnavay single sign-on with a configurable no-code workflow engine, integrate UIDAI, DigiLocker, MahaDBT and the payment gateway, and price the cloud services bouquet separately. Securing at least 70 percent in the technical evaluation is essential to reach commercial opening.",
    sourceSections: [
      "Scope of Work",
      "Technical Specifications",
      "Evaluation and Selection",
    ],
    forms: [
      "Annexure 22 - Compliance Certificate",
      "Annexure 16 - Manufacturer's Authorization Form",
      "Annexure 17 - OEM Undertaking for Product Usage",
      "Annexure 29 - Declaration from OEM",
      "Annexure 23 - Project Plan",
    ],
    avatarClasses: "bg-emerald-600 text-white",
    submittedAt: "26 Aug, 21:35",
    submission:
      "Functional Requirement Specifications answered across sections A to L with compliance positions recorded. Aaple Sarkar 2.0 architecture designed on MahaSamnavay SSO across the Citizen, Department and CRTS portals, with a configurable no-code workflow engine for Standard department onboarding and API integration for Gateway departments. Integrations specified for UIDAI, DigiLocker, MahaDBT, payment gateway and e-Sign. Platform sized for 99.5% uptime, 1,00,000 concurrent users and 0.30 ms API response, with the cloud bouquet priced separately and migration of 1,25,00,000 user profiles planned. Chatbot, IVR and call centre stack designed, technical presentation drafted and lead resource CVs compiled.",
    actionItems: [
      {
        text: "Respond to every Functional Requirement Specification in the Technical Specifications (Available or Not available) across sections A to L; each Available scores 1 mark, normalised to 10",
        ref: "§13, TQ §2.2",
      },
      {
        text: "Design the Aaple Sarkar 2.0 architecture on MahaSamnavay SSO: Citizen, Department and CRTS portals, with a configurable no-code workflow engine for Standard department onboarding and API integration for Gateway departments",
        ref: "§7.1, §7.2",
      },
      {
        text: "Specify integrations with UIDAI, DigiLocker, MahaDBT, payment gateway, MahaSamnavay SSO, SMS, Email, Push and e-Sign, plus bidirectional Gateway Department APIs",
        ref: "§7.1.5, §13 K",
      },
      {
        text: "Size the platform for 99.5% monthly uptime, a minimum of 1,00,000 concurrent users and 0.30 ms API response, with DC-DR and autoscaling, and price the cloud services bouquet separately",
        ref: "§14 Performance SLA",
      },
      {
        text: "Plan migration of 1,25,00,000 existing user profiles and the phased rollout of notified and digitised services",
        ref: "§7.1.4, §7.6",
      },
      {
        text: "Design the chatbot with AI and machine learning, the IVR on Bhashini regional language NLU, and the call centre stack",
        ref: "§7.4, §7.1.1",
      },
      {
        text: "Prepare the technical presentation (15 marks): understanding, technology, methodology, capacity building, project plan, resource deployment, live demo (5), case study (3) and POC (5)",
        ref: "TQ §4.1",
      },
      {
        text: "Submit lead resource CVs: Project Manager, Technical Project Manager, Solution Architect and Data Architect",
        ref: "TQ §3",
      },
    ],
  },
  "legal-1": {
    id: "legal-1",
    name: "Legal Counsel 1: General Purpose",
    mandate: "Instruction to Bidders, integrity and declarations",
    brief:
      "Legal counsel must review the Instruction to Bidders in full and confirm the bid carries no clause requiring deviation beyond what is formally declared. They need to prepare the integrity, conflict of interest and non-blacklisting declarations, execute the NDA in original, and ensure no commercial detail leaks into the technical bid. A conflict of interest or an undeclared deviation can forfeit the EMD or disqualify the bid.",
    sourceSections: [
      "Instruction to Bidders",
      "Terms and Conditions",
      "Annexures and Formats",
    ],
    forms: [
      "Annexure 5 - Statement of Blacklisting and Debarment",
      "Annexure 6 - Deviations",
      "Annexure 14 - Non-Disclosure Agreement",
      "Annexure 20 - Total Responsibility Certificate",
    ],
    avatarClasses: "bg-violet-600 text-white",
    submittedAt: "26 Aug, 12:05",
    submission:
      "Instruction to Bidders reviewed clause by clause with deviations flagged. Code of Integrity and Conflict of Interest declarations confirmed. Affidavit of non-blacklisting and non-conviction, and the board resolution or Power of Attorney, prepared. NDA executed in original. Confirmed that no conditional offer, counteroffer or discount appears outside the commercial envelope, and the 180 day bid validity exposure validated.",
    actionItems: [
      {
        text: "Review the Instruction to Bidders in full and flag any clause requiring deviation in the prescribed format",
        ref: "§4.1 to §4.30, Annexure 6",
      },
      {
        text: "Confirm compliance with the Code of Integrity and the Conflict of Interest declarations, noting that a conflict leads to EMD forfeiture",
        ref: "§4.4, §4.26",
      },
      {
        text: "Prepare the affidavit of non-blacklisting and non-conviction and the board resolution or Power of Attorney authorising the signatory",
        ref: "§5.4 (1.7, 1.10), Annexure 5",
      },
      {
        text: "Execute the Non-Disclosure Agreement in original for physical submission",
        ref: "§4.24, Annexure 14",
      },
      {
        text: "Ensure no prices, discounts, financial counteroffers or commercial hints appear in the Technical Bid, since this carries a disqualification risk",
        ref: "§4.10, §4.17, §4.28, §4.30",
      },
      {
        text: "Validate the 180 day bid validity and the requirement for unconditional validity of the bid",
        ref: "Fact Sheet §17, §4.30",
      },
    ],
  },
  "legal-2": {
    id: "legal-2",
    name: "Legal Counsel 2: Functional Purpose",
    mandate: "SLA, penalty exposure and contractual risk",
    brief:
      "The contracts team must quantify the risk carried in the Service Level Agreement and the draft contract before the bid is priced. They need to model penalty exposure across the timeline, performance and cloud availability service levels, assess the conditions under which the Performance Bank Guarantee can be encashed, and review key personnel, exit management and intellectual property obligations. Deviations must be logged in the prescribed format rather than silently accepted.",
    sourceSections: [
      "Service Level Agreements",
      "Terms and Conditions",
      "Exit Management",
    ],
    forms: [
      "Annexure 6 - Deviations",
      "Annexure 12 - Draft Contract Form",
      "Annexure 27 - Change Control Note",
    ],
    avatarClasses: "bg-fuchsia-600 text-white",
    submittedAt: "26 Aug, 15:50",
    submission:
      "SLA schedule reviewed and penalty exposure quantified: 0.5% to 1% of milestone per week on the timeline gates, 1% per 0.1% uptime drop on performance, and up to 30% of quarterly payment on cloud availability. PBG encashment triggers and the INR 5 to 15 Lakh per-incident security breach penalties assessed and mitigations logged. Key Personnel obligations reviewed, including the 50% payroll requirement at bid, one-week replacement notice with a 4-week overlap, and the 10% rolling attrition trigger. IP ownership, source code handover, escrow and data ownership positions reviewed and deviations recorded.",
    actionItems: [
      {
        text: "Quantify SLA penalty exposure across Project Timeline SLAs (0.5% to 1% of milestone per week), Performance SLAs (1% per 0.1% uptime drop, per concurrent-load failure and per API breach) and Cloud Availability SLAs (up to 30% of quarterly payment, 100% if unavailable for 8 continuous business hours)",
        ref: "§14",
      },
      {
        text: "Assess the PBG encashment triggers: material breach, failure to meet the overall penalty condition, and misrepresentation of facts",
        ref: "§6.5",
      },
      {
        text: "Review Key Personnel obligations: full time commitment, no change without consent, at least 50% of resources on payroll at bid, replacement within one week with a 4 week overlap, and the 10% rolling attrition trigger",
        ref: "§4.14.1 to §4.14.4",
      },
      {
        text: "Review Exit Management obligations and their interaction with the payment schedule and the transition phase",
        ref: "§16.20, §15",
      },
      {
        text: "Review IP ownership, source code handover with knowledge transfer at contract end, escrow and data ownership",
        ref: "§16.11 to §16.13, §16.19",
      },
      {
        text: "Assess the security breach penalties (INR 5, 10 and 15 Lakh per incident by severity, outside the SLA cap, with termination on serious breach) and log deviations",
        ref: "§14, §4.20",
      },
    ],
  },
  finance: {
    id: "finance",
    name: "Finance Owner",
    mandate: "EMD, PBG, ABG and payment terms validation",
    brief:
      "The finance team must ensure the bid meets the financial criteria to qualify for evaluation. They need to demonstrate a standalone average annual turnover of at least INR 250 Cr and positive net worth, arrange the tender fee, EMD and Performance Bank Guarantee, and build a GST-compliant BOQ. Adherence to the payment milestone schedule is crucial, since failure to complete acceptance testing can result in forfeiture of payments and encashment of the performance guarantee.",
    sourceSections: [
      "Pre-Qualification Criteria",
      "Payment Terms",
      "Commercial Bid",
    ],
    forms: [
      "Annexure 3 - Commercial Bid and BOQ Formats",
      "Annexure 4 - Bank Guarantee Format for EMD",
      "Annexure 8 - Annual Turnover and Net Worth Certificate",
      "Annexure 13 - Performance Bank Guarantee Format",
    ],
    avatarClasses: "bg-amber-600 text-white",
    submittedAt: "27 Aug, 10:20",
    submission:
      "Tender fee of INR 25,000 and the EMD Bank Guarantee of INR 1,00,00,000 arranged in the prescribed formats. PBG modelled at 10% of Total Contract Value, valid 180 days beyond the O&M period. ABG confirmed as not specified, to be raised at pre-bid. Implementation milestone curve modelled (10% at PBG and Detailed Project Plan, 5% per portal for SRS and design, 15% for RTS 1.0 data migration, 15% for service onboarding, 10% transition), with CSP, OEM licences and the State API Development Team billed quarterly against invoices. O&M modelled at 7.5% per quarter across twelve quarters. Standalone turnover of INR 250 Cr certified and the BOQ built with GST shown separately.",
    actionItems: [
      {
        text: "Arrange the tender fee of INR 25,000, non-refundable, on the portal",
        ref: "§4.7, Fact Sheet",
      },
      {
        text: "Arrange the EMD Bank Guarantee of INR 1,00,00,000 in the prescribed format and plan physical submission of the original",
        ref: "§4.8, Annexure 4",
      },
      {
        text: "Model the PBG at 10% of Total Contract Value, unconditional and within 30 days of LOI from a Nationalised or Scheduled Commercial Bank, valid 180 days beyond the 36 month O&M, and carry the cost of the instrument",
        ref: "§6.5, Annexure 13",
      },
      {
        text: "Confirm whether an Advance Bank Guarantee applies. The RFP does not specify an ABG, so raise it at pre-bid before pricing one in.",
        ref: "",
      },
      {
        text: "Model the implementation milestone curve: 10% against PBG, team onboarding and the Detailed Project Plan; 5% each for SRS and design of the Citizen, Department and VLE/CRTS portals; further milestones for UAT and go-live; 15% for RTS 1.0 data migration; 15% for notified-service onboarding; and 10% for transition",
        ref: "§15.1",
      },
      {
        text: "Price the CSP, OEM licences and State API Development Team as separate lines billed quarterly against invoices at the lower of the quoted and open-market rate",
        ref: "§15.1",
      },
      {
        text: "Model O&M billing at 7.5% of the maintenance amount per quarter across the twelve quarters against the SLA report, and the cash flow impact of quarterly availability penalties",
        ref: "§15.2",
      },
      {
        text: "Certify standalone average annual turnover of at least INR 250 Cr for the three FY ending 31 March 2025 and positive net worth, excluding parent and subsidiary figures",
        ref: "§5.4 (1.3, 1.4), Annexure 8",
      },
      {
        text: "Build the BOQ so all taxes except GST are borne by the SI, GST is shown separately and paid by the Purchaser, GST-inclusive prices are used for the composite score, and the price is fixed for the term",
        ref: "§4.15, §4.16, Annexure 3",
      },
    ],
  },
  delivery: {
    id: "delivery",
    name: "Delivery Lead",
    mandate: "Delivery feasibility and resourcing sign-off",
    brief:
      "The delivery team must sign off that the 45 month engagement is feasible against the committed timeline. They need to stress test the five delivery gates, quantify the delay penalties of 0.5 to 1 percent per week, prepare the manpower and resource deployment plans, and confirm resourcing and office readiness. The named key personnel must be on company rolls on the bid submission date, and the VA and PT audit must be planned through a CERT-IN empanelled agency.",
    sourceSections: [
      "Project Plan and Deliverables",
      "Work Completion Timelines",
      "Manpower Plan",
    ],
    forms: [
      "Annexure 24 - Manpower Plan",
      "Annexure 23 - Project Plan",
      "Annexure 10 - Work Experience Summary",
      "Annexure 11 - Credential Summary",
    ],
    avatarClasses: "bg-sky-600 text-white",
    submittedAt: "26 Aug, 18:45",
    submission:
      "Feasibility of the 45 month engagement signed off. Delivery calendar stress tested across the five gates and delay penalty exposure of 0.5 to 1% per week quantified. Manpower plan prepared per Annexure 24 and resource deployment plan drafted. Named lead resources confirmed on company rolls. MMR office undertaking confirmed and the CMMI Level 5 renewal scheduled to be verifiable before commercial bid opening.",
    actionItems: [
      {
        text: "Sign off the feasibility of the 45 month engagement, nine of implementation and thirty-six of O&M, against the M1 to M9 project plan",
        ref: "§12, §15",
      },
      {
        text: "Stress test the delivery calendar against the SLA gates: SRS within 15 working days of project start, design within 10 working days of SRS approval, development within 60 working days of design approval, UAT fixes within 5 working days, and go-live within 10 working days of UAT sign-off",
        ref: "§14 Project Timelines",
      },
      {
        text: "Quantify delay penalty exposure: 0.5% of milestone payment per week for SRS, design and UAT, and 1% per week for development and for go-live (1% of project cost)",
        ref: "§14",
      },
      {
        text: "Prepare the manpower plan and the resource deployment plan for the technical presentation",
        ref: "Annexure 24, TQ §4",
      },
      {
        text: "Confirm at least 50% of proposed resources are on company rolls on the bid submission date and that named Key Personnel are committed full time",
        ref: "§4.14.1",
      },
      {
        text: "Plan the VA and PT audit from a CERT-IN empanelled agency (M7 to M8) and periodic user training every six months",
        ref: "§12",
      },
      {
        text: "Confirm the 20 seat MMR office within 15 days of award, or an existing facility, and that the CMMI Level 5 renewal is verifiable at cmmiinstitute.com/pars before commercial bid opening",
        ref: "§5.4 (1.12, 1.8)",
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// People pool (Appendix B)
// ---------------------------------------------------------------------------

export const PEOPLE: Person[] = [
  {
    id: "arushi-sharma",
    name: "Arushi Sharma",
    title: "Presales and Solutions Lead",
    capabilities: ["bid-manager"],
    activeBids: 2,
    initials: "AS",
  },
  {
    id: "rohan-mehta",
    name: "Rohan Mehta",
    title: "Principal Solution Architect",
    capabilities: ["solution-architect"],
    activeBids: 1,
    initials: "RM",
  },
  {
    id: "kavya-iyer",
    name: "Kavya Iyer",
    title: "Enterprise Architect",
    capabilities: ["solution-architect"],
    activeBids: 3,
    initials: "KI",
  },
  {
    id: "sanjay-rao",
    name: "Sanjay Rao",
    title: "Senior Counsel, Contracts",
    capabilities: ["legal-1", "legal-2"],
    activeBids: 1,
    initials: "SR",
  },
  {
    id: "neha-bhatt",
    name: "Neha Bhatt",
    title: "Counsel, Regulatory and Compliance",
    capabilities: ["legal-1", "legal-2"],
    activeBids: 0,
    initials: "NB",
  },
  {
    id: "vikram-desai",
    name: "Vikram Desai",
    title: "Head of Commercial Finance",
    capabilities: ["finance"],
    activeBids: 2,
    initials: "VD",
  },
  {
    id: "priya-nair",
    name: "Priya Nair",
    title: "Manager, Bid Finance",
    capabilities: ["finance"],
    activeBids: 1,
    initials: "PN",
  },
  {
    id: "arjun-kulkarni",
    name: "Arjun Kulkarni",
    title: "Delivery Director, Public Sector",
    capabilities: ["delivery"],
    activeBids: 2,
    initials: "AK",
  },
  {
    id: "meera-joshi",
    name: "Meera Joshi",
    title: "Programme Manager",
    capabilities: ["delivery"],
    activeBids: 0,
    initials: "MJ",
  },
];

export function peopleForRole(roleId: RoleId): Person[] {
  return PEOPLE.filter((p) => p.capabilities.includes(roleId));
}

export function personById(id: string | null): Person | undefined {
  if (!id) return undefined;
  return PEOPLE.find((p) => p.id === id);
}

/** Default assignee per role, used as a fallback for provenance avatars. */
export const DEFAULT_ASSIGNEE: Record<RoleId, string> = {
  "bid-manager": "arushi-sharma",
  "solution-architect": "rohan-mehta",
  "legal-1": "sanjay-rao",
  "legal-2": "neha-bhatt",
  finance: "vikram-desai",
  delivery: "arjun-kulkarni",
};

// ---------------------------------------------------------------------------
// Response Compiler sections (Appendix A: compiled + author-owned prose)
// ---------------------------------------------------------------------------

const ai = (text: string) => ({ text, ai: true });
const plain = (text: string) => ({ text, ai: false });

export const SECTIONS: Section[] = [
  // Author-owned. Empty until Generate with AI runs. authorContent holds the
  // seed prose that streams in.
  {
    id: "cover-letter",
    title: "Cover Letter",
    kind: "author",
    status: "Not Started",
    content: [],
  },
  {
    id: "executive-summary",
    title: "Executive Summary",
    kind: "author",
    status: "Not Started",
    content: [],
  },
  {
    id: "company-profile",
    title: "Company Profile",
    kind: "author",
    status: "Not Started",
    content: [],
  },
  {
    id: "table-of-content",
    title: "Table of Content",
    kind: "author",
    status: "Not Started",
    content: [],
  },
  // Compiled from role submissions. Populated from the start.
  {
    id: "project-understanding",
    title: "Project Understanding",
    kind: "compiled",
    status: "In Progress",
    contributor: "solution-architect",
    content: [
      plain(
        "MahaIT intends to replace the current Aaple Sarkar 1.0 platform with a rebuilt citizen services portal for the services notified under the Maharashtra Right to Public Services Act 2015. Of the 511 notified services, 387 are available online today and 124 remain to be onboarded. The present platform suffers from a cluttered interface, incomplete digitisation, the absence of seamless integration with Gateway Departments, and redundant document storage on the Maharashtra State Data Centre.",
      ),
      plain(
        "We understand the scope to cover a unified citizen portal on the MahaSamnavay single sign-on, onboarding of both Standard and Gateway Departments through a configurable no-code workflow engine, end to end service enablement, and third party integrations with UIDAI, DigiLocker, MahaDBT and the payment gateway. The engagement also requires a chatbot, IVR and call centre stack, a Central Project Management Unit function, migration of roughly 1,25,00,000 existing user profiles, and additional delivery channels including doorstep delivery through the VLE network.",
      ),
      plain(
        "The performance envelope is demanding and has been noted as a primary design driver. The platform must sustain 99.5 percent uptime per calendar month, support a minimum of 1,00,000 concurrent users, and meet an API response target of 0.30 milliseconds. These figures shape the sizing, the cloud services bouquet, and the resilience strategy set out later in this proposal.",
      ),
      plain(
        "Selection follows Quality and Cost Based Selection with a 70 to 30 weighting between technical and commercial scores. We have mapped every pre-qualification and technical evaluation criterion to a named owner within the bid team so that no requirement is left unaddressed at submission.",
      ),
    ],
  },
  {
    id: "technical-approach",
    title: "Technical Approach",
    kind: "compiled",
    status: "Completed",
    contributor: "solution-architect",
    content: [
      plain(
        "Our technical approach responds line by line to the Functional Requirement Specifications set out in the Technical Specifications section. Each functional requirement has been logged, assigned a compliance position, and cross referenced to the component of the proposed solution that satisfies it. Where a requirement admits more than one interpretation, we have recorded the assumption and will confirm it during the pre-bid conference.",
      ),
      plain(
        "The solution is organised around a unified citizen portal, a department onboarding workbench, and a service enablement engine that allows notified services to be configured rather than custom built. This configuration led model shortens the time to digitise the remaining notified services and reduces the maintenance burden across the operations and maintenance period.",
      ),
      plain(
        "Integrations with DigiLocker, UIDAI and the payment gateway are delivered through a managed integration layer that isolates external dependencies from the core application. Gateway Department APIs are onboarded through the same layer, which provides consistent logging, retry handling, and version control across every external interface.",
      ),
      plain(
        "Citizen support is delivered through a combined chatbot, IVR and call centre stack, with a shared knowledge base so that a query raised on one channel can be resolved on another without loss of context. The technical presentation will demonstrate this end to end, covering understanding, technology, methodology, project plan, resource deployment, a live functionality demonstration, a case study, and the proof of concept.",
      ),
    ],
  },
  {
    id: "solution-architecture",
    title: "Solution Architecture and Sizing",
    kind: "compiled",
    status: "Completed",
    contributor: "solution-architect",
    content: [
      plain(
        "The target architecture is a multi tier, horizontally scalable design built on the MahaSamnavay single sign-on and deployed on the cloud services bouquet, which is priced separately from implementation as required by the tender. The Citizen, Department and CRTS portals share a common access and security layer, and the presentation, application and data tiers are decoupled so that each can be scaled independently in response to load.",
      ),
      plain(
        "Sizing is driven by the stated performance targets of 99.5 percent monthly uptime, a minimum of 1,00,000 concurrent users, and an API response target of 0.30 milliseconds. We have modelled peak concurrency against the notified service catalogue and provisioned autoscaling groups, a content delivery network, and an in memory caching tier to meet the response target under load.",
      ),
      plain(
        "Resilience is provided through multi zone deployment, automated failover, and continuous backup, with the redundant document storage of the current platform replaced by a single, deduplicated document repository. This removes the duplication observed on the State Data Centre today and simplifies records management.",
      ),
      plain(
        "The lead resources named for this workstream, comprising the Project Manager, Technical Project Manager, Solution Architect and Data Architect, are set out with their curricula vitae in the pre-qualification response. Their deployment across the implementation and operations phases is reflected in the resource plan.",
      ),
    ],
  },
  {
    id: "commercial-terms",
    title: "Commercial and Payment Terms",
    kind: "compiled",
    status: "Completed",
    contributor: "finance",
    content: [
      plain(
        "The commercial response is built as a Bill of Quantities inclusive of GST, in line with the tender instruction that all prices carry GST. Cloud services provider cost, original equipment manufacturer licences, and the State API development team are ring fenced as separately quoted lines so that the evaluation committee can see each cost driver distinctly.",
      ),
      plain(
        "Instrument costs have been modelled in full. The tender fee of INR 25,000 is non-refundable and paid on the portal. The Earnest Money Deposit of INR 1,00,00,000 is arranged as a Bank Guarantee in the prescribed format, with the original planned for physical submission. The Performance Bank Guarantee is modelled at 10 percent of total contract value, issued within 30 days of the Letter of Intent and valid for 180 days beyond the 36 month operations period, and we have carried the cost of that instrument across the full 51 month exposure.",
      ),
      plain(
        "The implementation milestone curve has been validated against the payment schedule: 10 percent against Performance Bank Guarantee submission, team onboarding and the Detailed Project Plan, 5 percent for the System Requirements Specification and design of each of the Citizen, Department and VLE and CRTS portals, 15 percent for migration of the RTS 1.0 data, 15 percent for onboarding of the notified services, and 10 percent for transition. The cloud services provider, original equipment manufacturer licences and the State API Development Team are billed quarterly against invoices. Operations billing has been modelled at 7.5 percent of the maintenance amount per quarter across the twelve quarters, together with the cash flow impact of quarterly availability penalties.",
      ),
      plain(
        "We note that the tender does not specify an Advance Bank Guarantee. We have not priced one in and will confirm the position with MahaIT during the pre-bid conference before finalising the commercial envelope. Standalone average annual turnover for the three financial years ending 31 March 2025 has been certified at or above INR 250 Cr on a standalone basis, excluding parent and subsidiary figures.",
      ),
    ],
  },
  {
    id: "legal-position",
    title: "Legal and Contractual Position",
    kind: "compiled",
    status: "Completed",
    contributor: "legal-2",
    content: [
      plain(
        "We have reviewed the Instruction to Bidders in full and the Service Level Agreement schedule in detail. Penalty exposure has been quantified across the three categories of project timeline service levels, performance service levels, and cloud availability service levels, and the aggregate exposure has been mapped against the payment schedule.",
      ),
      plain(
        "Particular attention has been given to the clause permitting encashment of the Performance Bank Guarantee where unpaid cumulative penalties reach the value of the guarantee. We have modelled the penalty accrual scenarios that could trigger this clause and have set out mitigations in the deviation log, together with the residual risk that remains after mitigation.",
      ),
      plain(
        "Key Personnel obligations have been assessed, including the requirement for full time commitment, the approval process for replacement, and the attrition trigger set at 10 percent. Exit Management obligations have been reviewed for their interaction with the payment schedule, and intellectual property ownership, the source code position, and data privacy and confidentiality obligations have all been examined and are reflected in our compliance position.",
      ),
      plain(
        "Where a clause requires deviation, it has been logged rather than silently accepted. Scope elasticity on department onboarding and service enablement has been assessed, and the associated deviations recorded so that the commercial and delivery positions remain internally consistent with the legal position.",
      ),
    ],
  },
  {
    id: "delivery-plan",
    title: "Delivery Plan and Resourcing",
    kind: "compiled",
    status: "Completed",
    contributor: "delivery",
    content: [
      plain(
        "We confirm the feasibility of the 45 month engagement, comprising nine months of implementation and 36 months of operations, support and maintenance. The delivery calendar has been stress tested against the stated gates, namely System Requirements Specification within 15 working days of project start, design within 10 working days of specification approval, development within 60 working days of design approval, user acceptance test fixes within 5 working days, and go live within 10 working days of user acceptance sign off.",
      ),
      plain(
        "Delay penalty exposure across those five gates, assessed at between 0.5 percent and 1 percent of the relevant milestone payment per week, has been quantified and shared with the commercial workstream so that the risk is reflected in pricing. The critical path has been identified and buffered where the calendar is tightest.",
      ),
      plain(
        "The manpower plan has been prepared in line with Annexure 24, and the resource deployment plan has been drawn up for inclusion in the technical presentation. Named lead resources have been confirmed as being on company rolls on the bid submission date, and their allocation across the implementation and operations phases is set out in the plan.",
      ),
      plain(
        "Two operational readiness items have been flagged and owned. The 20 seat office within the Mumbai Metropolitan Region will be stood up within 15 days of award under the undertaking route, and the CMMI Level 5 renewal has been scheduled so that it is verifiable before commercial bid opening, since a lapse at that point would disqualify the bid.",
      ),
    ],
  },
  {
    id: "compliance-matrix",
    title: "Compliance Matrix",
    kind: "compiled",
    status: "Completed",
    contributor: "legal-1",
    content: [
      plain(
        "The compliance matrix consolidates every pre-qualification, technical and commercial requirement into a single traceable register. Each row records the clause reference, the requirement, our compliance position, and the supporting document or annexure that evidences it.",
      ),
      plain(
        "Pre-qualification items are marked against the documentary evidence held on file, including the Certificate of Incorporation, the statutory auditor certificates for net worth, the completion certificates for qualifying government and public sector projects, and the affidavits of non-blacklisting and non-conviction in the prescribed annexure formats.",
      ),
      plain(
        "Three items carry a watch status and are tracked to closure before submission. Standalone turnover is to be confirmed with Finance on a standalone basis, the completion certificates for the two candidate turnkey projects are to be retrieved, and the Mumbai Metropolitan Region office is to be addressed through the undertaking route. One item, the CMMI Level 5 certification, is under renewal and must be verifiable at the CMMI Institute registry before commercial bid opening.",
      ),
      plain(
        "All declarations required under the Code of Integrity and the Conflict of Interest provisions have been prepared for signature by the authorised signatory, and the board resolution or Power of Attorney evidencing that authority is included in the pre-qualification response.",
      ),
    ],
  },
];

/** Seed prose for the four author-owned sections, streamed in on generation. */
export const AUTHOR_CONTENT: Record<string, ReturnType<typeof ai>[]> = {
  "cover-letter": [
    ai(
      "To the Managing Director, Maharashtra Information Technology Corporation Limited. We are pleased to submit our proposal for the Selection of System Integrator for the Implementation of Maharashtra RTS Aaple Sarkar 2.0, against tender reference MAHAIT/RTS2.0/001/2025/080.",
    ),
    ai(
      "We confirm that we have read and understood the Instruction to Bidders, the Technical Specifications, the Service Level Agreement schedule and all annexures, and that our bid is compliant with the four envelope submission process. Our bid is valid for 180 days from the bid submission date, and the Earnest Money Deposit of INR 1,00,00,000 is furnished in the prescribed form.",
    ),
    ai(
      "We submit this bid as a single entity and confirm that no consortium arrangement applies. We further confirm that all prices in the commercial envelope are inclusive of GST and that no conditional offer, counteroffer or discount appears outside the commercial envelope.",
    ),
    ai(
      "We remain committed to delivering Aaple Sarkar 2.0 to the performance, quality and governance standards set out in the tender, and we look forward to the opportunity to present our solution at the technical presentation.",
    ),
  ],
  "executive-summary": [
    ai(
      "This proposal sets out our approach to rebuilding the Aaple Sarkar citizen services portal as a unified, high availability platform for the services notified under the Maharashtra Right to Public Services Act 2015, of which 387 of the 511 notified services are online today. It addresses the functional scope, the technical architecture, the commercial position and the delivery plan in a single, internally consistent response.",
    ),
    ai(
      "Our solution replaces the limitations of the current platform, namely the cluttered interface, incomplete digitisation, and the absence of seamless Gateway Department integration, with a configuration led service enablement model, a managed integration layer for DigiLocker, UIDAI and the payment gateway, and a multi channel citizen support stack.",
    ),
    ai(
      "The platform is sized to meet the stated targets of 99.5 percent monthly uptime, a minimum of 1,00,000 concurrent users, and a 0.30 millisecond API response, with the cloud services bouquet priced separately from implementation. The commercial response is a Bill of Quantities inclusive of GST, with instrument and cloud costs modelled in full across the 45 month engagement.",
    ),
    ai(
      "A named bid team owns every requirement, from the technical solution and legal position through to commercial modelling and delivery feasibility. We are confident that the proposal is responsive, compliant, and deliverable within the stated timelines.",
    ),
  ],
  "company-profile": [
    ai(
      "We are an information technology and information technology enabled services company incorporated under the Companies Act, with more than seven years of continuous software development experience delivered in India. Our registration, statutory filings and tax records are current and available for verification.",
    ),
    ai(
      "Our delivery credentials include multiple turnkey information technology projects executed for government and public sector clients, together with citizen service and scheme delivery programmes completed within the last seven years. Completion certificates and case studies evidencing this experience are included in the pre-qualification response.",
    ),
    ai(
      "We maintain the certifications and scale relevant to this engagement, including quality and information security management certifications, more than 100 information technology resources on our payroll, and a delivery footprint that meets the office requirements set out in the tender. Our CMMI Level 5 certification is under renewal and will be verifiable before commercial bid opening.",
    ),
    ai(
      "Our governance model places a single accountable Bid Manager over a specialist team covering solution architecture, legal, finance and delivery, which is the same model we bring to the execution of this engagement.",
    ),
  ],
  "table-of-content": [
    ai("Cover Letter"),
    ai("Executive Summary"),
    ai("Company Profile"),
    ai("Project Understanding"),
    ai("Technical Approach"),
    ai("Solution Architecture and Sizing"),
    ai("Commercial and Payment Terms"),
    ai("Legal and Contractual Position"),
    ai("Delivery Plan and Resourcing"),
    ai("Compliance Matrix"),
  ],
};

// ---------------------------------------------------------------------------
// Context Sources file tree (Screen 5)
// ---------------------------------------------------------------------------

export const CONTEXT_TREE: ContextFolder[] = [
  {
    id: "project-files",
    name: "Project Files",
    files: [],
    folders: [
      {
        id: "past-projects",
        name: "Past Projects",
        files: [
          {
            id: "f-aaple-ref",
            name: "Aaple-Sarkar-1.0-Reference.pdf",
            kind: "pdf",
          },
          {
            id: "f-citizen-case",
            name: "Citizen-Services-Case-Study.pdf",
            kind: "pdf",
          },
        ],
      },
      {
        id: "tender-docs",
        name: "Tender Documents",
        files: [
          { id: "f-rts2-vol1", name: "RTS2-RFP-Volume-I.pdf", kind: "pdf" },
          {
            id: "f-annex24",
            name: "Annexure-24-Manpower-Plan.pdf",
            kind: "pdf",
          },
        ],
      },
    ],
  },
  {
    id: "role-submissions",
    name: "Role Submissions",
    files: [
      { id: "f-sa-tech", name: "SA-Technical-Solution.docx", kind: "docx" },
      {
        id: "f-fin-emd",
        name: "Finance-EMD-PBG-Validation.xlsx",
        kind: "xlsx",
      },
      { id: "f-legal-dev", name: "Legal-Deviation-Log.docx", kind: "docx" },
      {
        id: "f-del-signoff",
        name: "Delivery-Resourcing-Signoff.docx",
        kind: "docx",
      },
    ],
  },
  {
    id: "templates",
    name: "Templates",
    files: [
      { id: "f-tech-tpl", name: "Tech-Approach-Tpl.docx", kind: "docx" },
      { id: "f-compliance", name: "Compliance-matrix.xlsx", kind: "xlsx" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Bidding entity profile + Bid Manager forms (Team Overview auto-fill)
// ---------------------------------------------------------------------------

export const COMPANY = {
  legalName: "Meridian GovTech Solutions Private Limited",
  cin: "U72900MH2016PTC287341",
  pan: "AABCM4521Q",
  gstin: "27AABCM4521Q1ZP",
  incorporation: "14 March 2016",
  regdOffice:
    "7th Floor, Trident Tech Park, Plot 21, MIDC, Andheri East, Mumbai 400093, Maharashtra",
  turnover: "INR 268.4 Cr (standalone, avg. FY 2022-23 to 2024-25)",
  netWorth: "Positive in each of the last three financial years",
  manpower: "1,240 IT/ITeS resources on payroll",
  signatory: "Rajeev Menon",
  signatoryDesignation: "Whole-time Director",
  email: "bids@meridiangovtech.com",
  phone: "+91 22 6812 4400",
  bidValue:
    "INR 4,38,20,00,000 (Rupees Four Hundred Thirty Eight Crore Twenty Lakh only), inclusive of GST",
};

export const BID_MANAGER_FORMS: BidForm[] = [
  {
    id: "annex-1",
    annexure: "Annexure 1",
    title: "Tender Offer Form",
    kind: "fields",
    fields: [
      { label: "Name of Bidder", value: COMPANY.legalName },
      { label: "Tender Reference", value: "MAHAIT/RTS2.0/001/2025/080" },
      {
        label: "Tender Name",
        value:
          "Selection of System Integrator for Maharashtra RTS Aaple Sarkar 2.0",
      },
      { label: "Date of Submission", value: "28 Aug 2025" },
      { label: "Bid Validity", value: "180 days from bid submission date" },
      {
        label: "EMD",
        value: "INR 1,00,00,000 as Bank Guarantee (per Annexure 4)",
      },
      { label: "Total Bid Value", value: COMPANY.bidValue },
      {
        label: "Authorised Signatory",
        value: `${COMPANY.signatory}, ${COMPANY.signatoryDesignation}`,
      },
    ],
  },
  {
    id: "annex-2",
    annexure: "Annexure 2",
    title: "Details of Bidder",
    kind: "fields",
    fields: [
      { label: "Legal Name", value: COMPANY.legalName },
      { label: "CIN", value: COMPANY.cin },
      { label: "PAN", value: COMPANY.pan },
      { label: "GSTIN", value: COMPANY.gstin },
      { label: "Date of Incorporation", value: COMPANY.incorporation },
      { label: "Registered Office", value: COMPANY.regdOffice },
      { label: "Average Annual Turnover", value: COMPANY.turnover },
      { label: "Net Worth", value: COMPANY.netWorth },
      { label: "Manpower", value: COMPANY.manpower },
      { label: "Contact Email", value: COMPANY.email },
      { label: "Contact Phone", value: COMPANY.phone },
    ],
  },
  {
    id: "annex-19",
    annexure: "Annexure 19",
    title: "Pre-Qualification Bid Covering Letter",
    kind: "fields",
    fields: [
      {
        label: "To",
        value: "The Managing Director, Maharashtra IT Corporation Ltd (MahaIT)",
      },
      {
        label: "Subject",
        value: "Pre-Qualification Bid for Aaple Sarkar 2.0 System Integrator",
      },
      { label: "Reference", value: "MAHAIT/RTS2.0/001/2025/080" },
      { label: "Bidder", value: COMPANY.legalName },
      {
        label: "Declaration",
        value:
          "We confirm that we meet every pre-qualification criterion and that supporting evidence is enclosed in the respective annexures.",
      },
      {
        label: "Authorised Signatory",
        value: `${COMPANY.signatory}, ${COMPANY.signatoryDesignation}`,
      },
    ],
  },
  {
    id: "annex-21",
    annexure: "Annexure 21",
    title: "Technical Bid Covering Letter",
    kind: "fields",
    fields: [
      {
        label: "To",
        value: "The Managing Director, Maharashtra IT Corporation Ltd (MahaIT)",
      },
      {
        label: "Subject",
        value: "Technical Bid for Aaple Sarkar 2.0 System Integrator",
      },
      { label: "Reference", value: "MAHAIT/RTS2.0/001/2025/080" },
      { label: "Bidder", value: COMPANY.legalName },
      {
        label: "Declaration",
        value:
          "We confirm that no commercial or pricing information is disclosed anywhere in this technical bid.",
      },
      {
        label: "Authorised Signatory",
        value: `${COMPANY.signatory}, ${COMPANY.signatoryDesignation}`,
      },
    ],
  },
  {
    id: "annex-25",
    annexure: "Annexure 25",
    title: "Pre-Qualification Checklist",
    kind: "checklist",
    rows: [
      { item: "Tender fee of INR 25,000 paid on portal", status: "Yes", ref: "Envelope E1" },
      { item: "EMD Bank Guarantee of INR 1,00,00,000 enclosed", status: "Yes", ref: "Annexure 4" },
      { item: "Certificate of Incorporation", status: "Yes", ref: "Annexure 2" },
      { item: "Average annual turnover >= INR 250 Cr (3 FY)", status: "Yes", ref: "Annexure 8" },
      { item: "Positive net worth (3 FY)", status: "Yes", ref: "Annexure 8" },
      { item: "CMMI Level 5 and ISO 9001/20000/27001 certificates", status: "In progress", ref: "Annexure 11" },
      { item: "Affidavit of non-blacklisting and non-conviction", status: "Yes", ref: "Annexure 5" },
      { item: "Power of Attorney / Board Resolution", status: "Yes", ref: "Annexure 20" },
    ],
  },
  {
    id: "annex-26",
    annexure: "Annexure 26",
    title: "Technical Bid Checklist",
    kind: "checklist",
    rows: [
      { item: "Technical Bid Covering Letter", status: "Yes", ref: "Annexure 21" },
      { item: "Functional Requirement Specification compliance", status: "Yes", ref: "Annexure 22" },
      { item: "Solution architecture and sizing", status: "Yes", ref: "Technical Bid" },
      { item: "Project Plan", status: "Yes", ref: "Annexure 23" },
      { item: "Manpower Plan", status: "Yes", ref: "Annexure 24" },
      { item: "Lead resource CVs", status: "Yes", ref: "Technical Bid" },
      { item: "Manufacturer Authorization Forms", status: "Yes", ref: "Annexure 16" },
    ],
  },
];

// Forms filled by the specialist roles (mock data), shown in the compiler.
export const TEAM_FORMS: BidForm[] = [
  // ---- Solution Architect ----
  {
    id: "sa-annex-22",
    annexure: "Annexure 22",
    title: "Compliance Certificate",
    kind: "fields",
    contributor: "solution-architect",
    fields: [
      { label: "Bidder", value: COMPANY.legalName },
      {
        label: "Requirement Set",
        value: "Functional Requirement Specifications (§5.5)",
      },
      { label: "Total Requirements", value: "214" },
      { label: "Fully Compliant", value: "206" },
      { label: "Compliant with Deviation", value: "8 (logged in Annexure 6)" },
      { label: "Not Compliant", value: "0" },
    ],
  },
  {
    id: "sa-annex-16",
    annexure: "Annexure 16",
    title: "Manufacturer's Authorization Form",
    kind: "fields",
    contributor: "solution-architect",
    fields: [
      { label: "OEM", value: "Vertex Data Systems" },
      { label: "Products", value: "Enterprise Database, App Server, API Gateway" },
      { label: "Authorised Bidder", value: COMPANY.legalName },
      { label: "Tender Reference", value: "MAHAIT/RTS2.0/001/2025/080" },
      { label: "Validity", value: "Full contract term including 36 month O&M" },
    ],
  },
  {
    id: "sa-annex-17",
    annexure: "Annexure 17",
    title: "OEM Undertaking for Product Usage",
    kind: "checklist",
    contributor: "solution-architect",
    rows: [
      { item: "Product not end-of-life during contract term", status: "Yes", ref: "OEM letter" },
      { item: "Patches and security updates for full term", status: "Yes", ref: "OEM letter" },
      { item: "No additional licence cost within quoted scope", status: "Yes", ref: "BOQ" },
      { item: "Support escalation matrix provided", status: "Yes", ref: "Annexure 29" },
    ],
  },
  // ---- Legal Counsel 1 ----
  {
    id: "l1-annex-5",
    annexure: "Annexure 5",
    title: "Statement of Blacklisting and Debarment",
    kind: "fields",
    contributor: "legal-1",
    fields: [
      { label: "Bidder", value: COMPANY.legalName },
      {
        label: "Declaration",
        value:
          "Not blacklisted or debarred by any Government or PSU as on the bid submission date.",
      },
      {
        label: "Authorised Signatory",
        value: `${COMPANY.signatory}, ${COMPANY.signatoryDesignation}`,
      },
      { label: "Attested", value: "Notary Public, Mumbai" },
    ],
  },
  {
    id: "l1-annex-20",
    annexure: "Annexure 20",
    title: "Total Responsibility Certificate",
    kind: "fields",
    contributor: "legal-1",
    fields: [
      { label: "Bidder", value: COMPANY.legalName },
      {
        label: "Undertaking",
        value:
          "We take total responsibility for the design, development, deployment and O&M of Aaple Sarkar 2.0.",
      },
      {
        label: "Authorised Signatory",
        value: `${COMPANY.signatory}, ${COMPANY.signatoryDesignation}`,
      },
    ],
  },
  {
    id: "l1-annex-14",
    annexure: "Annexure 14",
    title: "Non-Disclosure Agreement",
    kind: "fields",
    contributor: "legal-1",
    fields: [
      { label: "Parties", value: `${COMPANY.legalName} and MahaIT` },
      { label: "Scope", value: "All project data and citizen personal information" },
      { label: "Term", value: "Contract term plus 3 years" },
      { label: "Execution", value: "Original signed, submitted physically" },
    ],
  },
  // ---- Legal Counsel 2 ----
  {
    id: "l2-annex-6",
    annexure: "Annexure 6",
    title: "Deviations",
    kind: "fields",
    contributor: "legal-2",
    fields: [
      { label: "Total Deviations Logged", value: "6" },
      { label: "SLA and Penalty Deviations", value: "3 (§14)" },
      { label: "Commercial Impact Deviations", value: "2" },
      { label: "IP and Data Deviations", value: "1 (§4.24)" },
    ],
  },
  {
    id: "l2-annex-12",
    annexure: "Annexure 12",
    title: "Draft Contract Form",
    kind: "checklist",
    contributor: "legal-2",
    rows: [
      { item: "Master Services Agreement reviewed", status: "Yes", ref: "§4" },
      { item: "SLA schedule reviewed", status: "Yes", ref: "§14" },
      { item: "Exit management clause reviewed", status: "Yes", ref: "§4.20" },
      { item: "IP and source code clause reviewed", status: "Yes", ref: "§4.24" },
      { item: "Data privacy clause reviewed", status: "Yes", ref: "§4.24" },
    ],
  },
  {
    id: "l2-annex-27",
    annexure: "Annexure 27",
    title: "Change Control Note",
    kind: "fields",
    contributor: "legal-2",
    fields: [
      { label: "Mechanism", value: "Documented change control per §4.20" },
      { label: "Approval Authority", value: "Project Steering Committee" },
      { label: "Cost Basis", value: "Agreed man-month rate card" },
    ],
  },
  // ---- Finance Owner ----
  {
    id: "f-annex-3",
    annexure: "Annexure 3",
    title: "Commercial Bid and BOQ",
    kind: "fields",
    contributor: "finance",
    fields: [
      { label: "Total Bid Value", value: COMPANY.bidValue },
      { label: "Implementation (9 months)", value: "INR 1,62,00,00,000" },
      { label: "O&M (36 months)", value: "INR 2,34,00,00,000" },
      { label: "CSP and OEM (ring-fenced)", value: "INR 42,20,00,000" },
      { label: "Taxes", value: "GST included in composite price" },
    ],
  },
  {
    id: "f-annex-4",
    annexure: "Annexure 4",
    title: "Bank Guarantee Format for EMD",
    kind: "fields",
    contributor: "finance",
    fields: [
      { label: "Instrument", value: "Bank Guarantee" },
      { label: "Amount", value: "INR 1,00,00,000" },
      { label: "Issuing Bank", value: "State Bank of India" },
      { label: "Validity", value: "180 days plus claim period" },
    ],
  },
  {
    id: "f-annex-8",
    annexure: "Annexure 8",
    title: "Annual Turnover and Net Worth Certificate",
    kind: "fields",
    contributor: "finance",
    fields: [
      { label: "FY 2022-23 Turnover", value: "INR 251.6 Cr" },
      { label: "FY 2023-24 Turnover", value: "INR 268.9 Cr" },
      { label: "FY 2024-25 Turnover", value: "INR 284.7 Cr" },
      { label: "Average (3 FY)", value: "INR 268.4 Cr" },
      { label: "Net Worth", value: "Positive in each of the last 3 FY" },
      { label: "Certified By", value: "Statutory Auditor" },
    ],
  },
  {
    id: "f-annex-13",
    annexure: "Annexure 13",
    title: "Performance Bank Guarantee Format",
    kind: "fields",
    contributor: "finance",
    fields: [
      { label: "Value", value: "10% of total contract value" },
      { label: "Issued Within", value: "30 days of Letter of Intent" },
      { label: "Validity", value: "180 days beyond the 36 month O&M period" },
      { label: "Issuing Bank", value: "Nationalised or Scheduled Commercial Bank" },
    ],
  },
  // ---- Delivery Lead ----
  {
    id: "d-annex-24",
    annexure: "Annexure 24",
    title: "Manpower Plan",
    kind: "fields",
    contributor: "delivery",
    fields: [
      { label: "Total Resources", value: "68" },
      { label: "Implementation Phase", value: "52" },
      { label: "O&M Phase", value: "24" },
      { label: "Named Key Personnel", value: "6" },
      { label: "MMR Office", value: "20 seat, within 15 days of award" },
    ],
  },
  {
    id: "d-annex-23",
    annexure: "Annexure 23",
    title: "Project Plan",
    kind: "checklist",
    contributor: "delivery",
    rows: [
      { item: "SRS within 15 working days of start", status: "Yes", ref: "Gate 1" },
      { item: "Design within 10 working days of SRS", status: "Yes", ref: "Gate 2" },
      { item: "Development within 60 working days", status: "Yes", ref: "Gate 3" },
      { item: "UAT fixes within 5 working days", status: "Yes", ref: "Gate 4" },
      { item: "Go-live within 10 working days of UAT", status: "Yes", ref: "Gate 5" },
    ],
  },
  {
    id: "d-annex-10",
    annexure: "Annexure 10",
    title: "Work Experience Summary",
    kind: "fields",
    contributor: "delivery",
    fields: [
      { label: "Qualifying Govt/PSU Projects", value: "3" },
      { label: "Largest Project Value", value: "INR 74 Cr" },
      { label: "Citizen-service Projects (7 yrs)", value: "4" },
      { label: "Completion Certificates", value: "Enclosed" },
    ],
  },
];

/** All filled forms across the team, for the compiler's compiled section. */
export const COMPILED_FORMS: BidForm[] = [
  ...BID_MANAGER_FORMS.map((f) => ({ ...f, contributor: "bid-manager" as RoleId })),
  ...TEAM_FORMS,
];
