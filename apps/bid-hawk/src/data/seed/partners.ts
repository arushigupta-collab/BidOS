import type { Partner } from '@/types'
import { agoFromNow } from './workspace'

/**
 * The seven delivery partners this workspace already works with.
 *
 * LOADED BY DEFAULT, unlike sources and people. A partner network is something an
 * organisation already has when it opens the product; it is not built during setup.
 * Do not "fix" this to match the empty-by-default reveal the other two use — see
 * docs/decisions.md.
 *
 * The seven are deliberately unalike, because Partner Evaluation compares them and a
 * comparison of near-identical rows demonstrates nothing. Between them they cover:
 * a large System Integrator at CMMI L5, two Specialists with narrow deep capability,
 * an OEM, an MSE with modest turnover and the best ratings in the set, a Manpower
 * firm with a large bench and thin margins, and a regional player with two states.
 *
 * Two carry a certification gap — no ISO 27001 — so evaluation has a real
 * disqualifier to surface rather than a manufactured one. Fictional companies;
 * capability and region terms come from the vocabularies the people screens use.
 *
 * TECHNICAL PROFILES ARE DELIBERATELY OFF-AXIS from capabilities, because Technical
 * capability and Capability fit have to be able to disagree or the second criterion is
 * decorative. Two cases carry that weight: Suhrid sells exactly the right thing and holds
 * exactly the right stack but has never built at this scale, so it ranks high on fit and
 * low on technical depth; Vedhika sells computer vision and smart city rather than
 * e-governance, so it ranks low on fit while holding the deepest delivered stack in the
 * set after Arkavati. Verified: the two criteria order the seven differently.
 */
export const PARTNERS: Partner[] = [
  {
    id: 'pt-arkavati',
    name: 'Arkavati Systems Limited',
    type: 'System Integrator',
    industry: 'e-Governance and Citizen Services',
    capabilities: ['IT Services', 'Cloud and Infrastructure', 'e-Governance', 'Data and Analytics'],
    regions: ['Pan-India', 'Maharashtra', 'Karnataka', 'Delhi'],
    teamSize: 900,
    annualTurnoverCr: 340,
    certifications: ['CMMI L5', 'ISO 27001', 'ISO 9001', 'ISO 20000'],
    empanelment: ['GeM registered'],
    contactName: 'Rohit Deshmukh',
    contactEmail: 'rohit.deshmukh@arkavatisystems.in',
    rating: 4.4,
    projectsDelivered: 78,
    onTimeDeliveryPct: 91,
    historyEntries: [
      { buyer: 'Maharashtra Information Technology Corporation', year: 2023, valueCr: 96, outcome: 'Delivered to schedule, O&M running into a second term.' },
      { buyer: 'Bharat Sanchar Nigam Limited', year: 2022, valueCr: 141, outcome: 'Nine months late on rollout, penalty applied and settled.' },
      { buyer: 'Karnataka e-Governance Department', year: 2021, valueCr: 58, outcome: 'Delivered, cited for the migration approach.' },
    ],
    technicalStack: ['Java / Spring Boot', 'PostgreSQL', 'Oracle', 'Kubernetes', 'API gateway', 'Angular', 'Android / iOS native'],
    comparableTechnicalScope: true,
    comparableScopeNote:
      'Delivered the MahaIT 96 Cr citizen portal end to end, including its Aadhaar and payment integrations.',
    onboardedAt: agoFromNow(1340),
    status: 'active',
  },
  {
    id: 'pt-nirvaha',
    name: 'Nirvaha Analytics Private Limited',
    type: 'Specialist',
    industry: 'Document Management and Digitisation',
    // Narrow and deep: three adjacent AI capabilities and nothing else.
    capabilities: ['AI - Document Intelligence', 'AI - NLP', 'Data and Analytics'],
    regions: ['South', 'Karnataka', 'Telangana'],
    teamSize: 46,
    annualTurnoverCr: 19,
    certifications: ['ISO 27001', 'ISO 9001'],
    empanelment: ['GeM registered', 'Startup India'],
    contactName: 'Sneha Raghavan',
    contactEmail: 'sneha.raghavan@nirvaha.in',
    rating: 4.6,
    projectsDelivered: 23,
    onTimeDeliveryPct: 96,
    historyEntries: [
      { buyer: 'Bruhat Bengaluru Mahanagara Palike', year: 2024, valueCr: 11, outcome: 'Document intelligence pilot taken into production.' },
      { buyer: 'Telangana IT, Electronics and Communications Department', year: 2023, valueCr: 7, outcome: 'Delivered early, scope extended twice.' },
    ],
    technicalStack: ['Python', 'PyTorch', 'FastAPI', 'PostgreSQL', 'Airflow'],
    comparableTechnicalScope: false,
    comparableScopeNote:
      'Largest engagement is an 11 Cr document-intelligence pilot. No portal-scale integration delivered.',
    onboardedAt: agoFromNow(610),
    status: 'active',
  },
  {
    id: 'pt-tarangam',
    name: 'Tarangam Networks Private Limited',
    type: 'Specialist',
    industry: 'Telecom and Connectivity',
    capabilities: ['Optical Fibre', 'Telecom', 'Networking'],
    regions: ['East', 'West Bengal', 'Bihar', 'Odisha'],
    teamSize: 132,
    annualTurnoverCr: 54,
    // Certification gap: no ISO 27001, which several central tenders require.
    certifications: ['ISO 9001'],
    empanelment: ['GeM registered', 'NSIC'],
    contactName: 'Debashis Sen',
    contactEmail: 'debashis.sen@tarangamnetworks.in',
    rating: 3.9,
    projectsDelivered: 41,
    onTimeDeliveryPct: 84,
    historyEntries: [
      { buyer: 'RailTel Corporation of India', year: 2023, valueCr: 44, outcome: 'Delivered, two milestones slipped on right-of-way delays.' },
      { buyer: 'West Bengal State Electricity Distribution Company', year: 2022, valueCr: 29, outcome: 'Completed, one segment re-laid after an audit finding.' },
    ],
    technicalStack: ['C', 'SNMP', 'OTDR tooling', 'MySQL'],
    comparableTechnicalScope: false,
    comparableScopeNote:
      'Optical fibre and network rollouts only. No citizen-facing application delivered.',
    onboardedAt: agoFromNow(880),
    status: 'active',
  },
  {
    id: 'pt-vedhika',
    name: 'Vedhika Instruments Limited',
    type: 'OEM',
    industry: 'Smart City and Urban Infrastructure',
    capabilities: ['Smart City', 'AI - Computer Vision', 'Networking'],
    regions: ['Pan-India', 'Gujarat', 'Maharashtra'],
    teamSize: 410,
    annualTurnoverCr: 208,
    certifications: ['ISO 9001', 'ISO 27001', 'CMMI L3'],
    empanelment: ['GeM registered'],
    contactName: 'Anjali Mehta',
    contactEmail: 'anjali.mehta@vedhikainstruments.in',
    rating: 4.1,
    projectsDelivered: 63,
    onTimeDeliveryPct: 88,
    historyEntries: [
      { buyer: 'Gujarat Urban Development Mission', year: 2024, valueCr: 63, outcome: 'Command centre delivered, hardware supplied in full.' },
      { buyer: 'National Highways Authority of India', year: 2022, valueCr: 88, outcome: 'Delivered, ANPR accuracy reworked after acceptance testing.' },
    ],
    technicalStack: ['C++', 'Python', 'OpenCV', 'Kubernetes', 'PostgreSQL', 'API gateway', 'MQTT'],
    comparableTechnicalScope: true,
    comparableScopeNote:
      'Delivered an 88 Cr NHAI command centre with real-time video pipelines and a 63 Cr city integration.',
    onboardedAt: agoFromNow(1105),
    status: 'active',
  },
  {
    id: 'pt-suhrid',
    name: 'Suhrid Digital LLP',
    type: 'Consultant',
    industry: 'e-Governance and Citizen Services',
    // Small on paper, best rated in the set: the case for reading past turnover.
    capabilities: ['e-Governance', 'Citizen Services', 'IT Services'],
    regions: ['West', 'Maharashtra', 'Goa'],
    teamSize: 28,
    annualTurnoverCr: 4,
    certifications: ['ISO 9001', 'ISO 27001'],
    empanelment: ['MSE', 'GeM registered', 'Startup India'],
    contactName: 'Kavita Joshi',
    contactEmail: 'kavita.joshi@suhriddigital.in',
    rating: 4.8,
    projectsDelivered: 17,
    onTimeDeliveryPct: 98,
    historyEntries: [
      { buyer: 'Municipal Corporation of Greater Mumbai', year: 2024, valueCr: 3, outcome: 'Citizen portal delivered ahead of schedule.' },
      { buyer: 'Goa Directorate of Information Technology', year: 2023, valueCr: 2, outcome: 'Delivered, retained for a second phase.' },
    ],
    technicalStack: ['Java / Spring Boot', 'PostgreSQL', 'React', 'Android / iOS native', 'API gateway'],
    comparableTechnicalScope: false,
    comparableScopeNote:
      'The right stack at the wrong scale: strongest engagement is 3 Cr, against a 72 Cr tender.',
    onboardedAt: agoFromNow(420),
    status: 'active',
  },
  {
    id: 'pt-praneetha',
    name: 'Praneetha Workforce Services Private Limited',
    type: 'Manpower',
    industry: 'e-Governance and Citizen Services',
    // A large bench on thin margins: turnover per head is a fraction of the SI's.
    capabilities: ['IT Services', 'Civil'],
    regions: ['Pan-India', 'Uttar Pradesh', 'Madhya Pradesh', 'Rajasthan'],
    teamSize: 740,
    annualTurnoverCr: 62,
    // Second certification gap, and no security certification at all.
    certifications: ['ISO 9001'],
    empanelment: ['GeM registered', 'NSIC'],
    contactName: 'Manish Tiwari',
    contactEmail: 'manish.tiwari@praneethaworkforce.in',
    rating: 3.2,
    projectsDelivered: 52,
    onTimeDeliveryPct: 76,
    historyEntries: [
      { buyer: 'Uttar Pradesh Development Systems Corporation', year: 2023, valueCr: 21, outcome: 'Staffed to plan, two escalations on attrition.' },
      { buyer: 'Madhya Pradesh Agency for Promotion of IT', year: 2021, valueCr: 17, outcome: 'Completed eleven weeks late, liquidated damages applied.' },
    ],
    technicalStack: ['Java', 'MySQL', 'PHP'],
    comparableTechnicalScope: false,
    comparableScopeNote:
      'Staff augmentation rather than delivery. No system integrated under its own name.',
    onboardedAt: agoFromNow(960),
    status: 'paused',
  },
  {
    id: 'pt-kaveri',
    name: 'Kaveri Power Solutions Private Limited',
    type: 'Specialist',
    industry: 'Energy and Utilities',
    capabilities: ['Solar', 'Cloud and Infrastructure'],
    // The regional player: two states and nothing wider.
    regions: ['Tamil Nadu', 'Kerala'],
    teamSize: 12,
    annualTurnoverCr: 7,
    certifications: ['ISO 9001', 'ISO 27001'],
    empanelment: ['MSE', 'GeM registered'],
    contactName: 'Lakshmi Narayanan',
    contactEmail: 'lakshmi.narayanan@kaveripower.in',
    rating: 4.2,
    projectsDelivered: 14,
    onTimeDeliveryPct: 93,
    historyEntries: [
      { buyer: 'Tamil Nadu Generation and Distribution Corporation', year: 2024, valueCr: 5, outcome: 'Delivered to schedule on a single-site scope.' },
    ],
    technicalStack: ['Python', 'Modbus', 'PostgreSQL', 'Grafana'],
    comparableTechnicalScope: false,
    comparableScopeNote:
      'Single-site solar and infrastructure scopes, largest 5 Cr.',
    onboardedAt: agoFromNow(300),
    status: 'active',
  },
  /*
   * ---------------------------------------------------------------------------
   * Beyond e-Governance.
   *
   * The seven above were written when one tender seed existed and every partner
   * had to be plausible against it. Real uploads are not all e-Governance -- a
   * scanning and digitisation tender arrived and had exactly one partner who
   * could answer it, which makes an evaluation of one and a ranking of nothing.
   *
   * The six below give the other industries a field deep enough to compare, and
   * are unalike inside each industry for the same reason the first seven are:
   * ranking near-identical rows demonstrates nothing.
   * ---------------------------------------------------------------------------
   */
  {
    id: 'pt-lipika',
    name: 'Lipika Records Management Private Limited',
    type: 'System Integrator',
    industry: 'Document Management and Digitisation',
    capabilities: ['Document Management', 'IT Services', 'Cloud and Infrastructure'],
    regions: ['Pan-India', 'Delhi', 'Uttar Pradesh', 'Haryana'],
    teamSize: 610,
    annualTurnoverCr: 128,
    certifications: ['ISO 27001', 'ISO 9001', 'CMMI L3'],
    empanelment: ['GeM registered', 'NSIC'],
    contactName: 'Ashwini Bhatnagar',
    contactEmail: 'ashwini.bhatnagar@lipikarecords.in',
    rating: 4.2,
    projectsDelivered: 54,
    onTimeDeliveryPct: 88,
    historyEntries: [
      { buyer: 'National Archives of India', year: 2024, valueCr: 41, outcome: 'Delivered, 2.1 crore pages digitised and indexed.' },
      { buyer: 'Registrar of Companies, Delhi', year: 2022, valueCr: 27, outcome: 'Delivered four months late; scanning bench under-staffed at peak.' },
    ],
    technicalStack: ['Production scanners', 'OCR pipelines', 'Elasticsearch', 'Java / Spring Boot', 'S3-compatible storage'],
    comparableTechnicalScope: true,
    comparableScopeNote: 'Ran a 2.1 crore page programme for the National Archives, indexing and QA included.',
    onboardedAt: agoFromNow(880),
    status: 'active',
  },
  {
    id: 'pt-akshara',
    name: 'Akshara Imaging Systems Limited',
    type: 'OEM',
    industry: 'Document Management and Digitisation',
    // Sells the hardware and bundles software with it. Deep on capture, thin on
    // everything downstream, which is where its evaluation should suffer.
    capabilities: ['Document Management', 'AI - Document Intelligence'],
    regions: ['West', 'Maharashtra', 'Gujarat'],
    teamSize: 210,
    annualTurnoverCr: 96,
    certifications: ['ISO 9001'],
    empanelment: ['GeM registered'],
    contactName: 'Devang Mehta',
    contactEmail: 'devang.mehta@aksharaimaging.com',
    rating: 4.0,
    projectsDelivered: 33,
    onTimeDeliveryPct: 94,
    historyEntries: [
      { buyer: 'Maharashtra Land Records Department', year: 2023, valueCr: 18, outcome: 'Supplied and commissioned 140 production scanners on schedule.' },
    ],
    technicalStack: ['Production scanners', 'OCR pipelines', 'Windows imaging stack'],
    comparableTechnicalScope: false,
    comparableScopeNote: 'Supplies and commissions capture hardware; has not run an indexing or QA programme end to end.',
    onboardedAt: agoFromNow(520),
    status: 'active',
  },
  {
    id: 'pt-mudrika',
    name: 'Mudrika Bureau Services LLP',
    type: 'Manpower',
    industry: 'Document Management and Digitisation',
    // No ISO 27001, which matters more here than anywhere: the work is handling
    // somebody else's records. Evaluation has a real disqualifier to surface.
    capabilities: ['Document Management', 'IT Services'],
    regions: ['North', 'Delhi', 'Punjab'],
    teamSize: 1400,
    annualTurnoverCr: 44,
    certifications: ['ISO 9001'],
    empanelment: ['GeM registered', 'MSE'],
    contactName: 'Harpreet Sandhu',
    contactEmail: 'harpreet.sandhu@mudrikabureau.in',
    rating: 3.6,
    projectsDelivered: 61,
    onTimeDeliveryPct: 79,
    historyEntries: [
      { buyer: 'Punjab Revenue Department', year: 2023, valueCr: 12, outcome: 'Delivered; rework on 6% of records after a QA sample failed.' },
      { buyer: 'Delhi Jal Board', year: 2021, valueCr: 8, outcome: 'Delivered to schedule.' },
    ],
    technicalStack: ['Production scanners', 'Manual indexing workflows'],
    comparableTechnicalScope: false,
    comparableScopeNote: 'Large bench and high throughput, but every programme so far has been under a prime contractor.',
    onboardedAt: agoFromNow(1120),
    status: 'active',
  },
  {
    id: 'pt-aarogya',
    name: 'Aarogya Health Informatics Private Limited',
    type: 'Specialist',
    industry: 'Healthcare and Public Health',
    capabilities: ['Healthcare IT', 'Data and Analytics', 'Citizen Services'],
    regions: ['South', 'Tamil Nadu', 'Kerala', 'Karnataka'],
    teamSize: 130,
    annualTurnoverCr: 37,
    certifications: ['ISO 27001', 'ISO 9001', 'CMMI L3'],
    empanelment: ['GeM registered', 'Startup India'],
    contactName: 'Lakshmi Narayanan',
    contactEmail: 'lakshmi.narayanan@aarogyahealth.in',
    rating: 4.5,
    projectsDelivered: 29,
    onTimeDeliveryPct: 93,
    historyEntries: [
      { buyer: 'Tamil Nadu Health Systems Project', year: 2024, valueCr: 34, outcome: 'Delivered; hospital information system live across 41 facilities.' },
    ],
    technicalStack: ['FHIR / HL7', 'PostgreSQL', 'Java / Spring Boot', 'Kubernetes'],
    comparableTechnicalScope: true,
    comparableScopeNote: 'Delivered a 41-facility HIS rollout including ABDM integration.',
    onboardedAt: agoFromNow(690),
    status: 'active',
  },
  {
    id: 'pt-vidyut',
    name: 'Vidyut Learning Technologies Private Limited',
    type: 'Specialist',
    industry: 'Education and Skilling',
    capabilities: ['EdTech', 'Citizen Services', 'Data and Analytics'],
    regions: ['Pan-India', 'Rajasthan', 'Madhya Pradesh'],
    teamSize: 88,
    annualTurnoverCr: 22,
    certifications: ['ISO 27001', 'ISO 9001'],
    empanelment: ['GeM registered', 'Startup India'],
    contactName: 'Nikhil Ranka',
    contactEmail: 'nikhil.ranka@vidyutlearning.in',
    rating: 4.1,
    projectsDelivered: 24,
    onTimeDeliveryPct: 86,
    historyEntries: [
      { buyer: 'Rajasthan Skill and Livelihoods Development Corporation', year: 2023, valueCr: 15, outcome: 'Delivered; learner platform running for a third cohort.' },
    ],
    technicalStack: ['Node.js', 'PostgreSQL', 'React', 'Android / iOS native', 'SCORM / xAPI'],
    comparableTechnicalScope: false,
    comparableScopeNote: 'Largest engagement to date is 15 Cr; has not delivered at state-programme scale.',
    onboardedAt: agoFromNow(430),
    status: 'active',
  },
  {
    id: 'pt-pathik',
    name: 'Pathik Mobility Solutions Limited',
    type: 'System Integrator',
    industry: 'Transport and Mobility',
    capabilities: ['Intelligent Transport', 'Smart City', 'Networking', 'Cloud and Infrastructure'],
    regions: ['Pan-India', 'Maharashtra', 'Gujarat', 'Telangana'],
    teamSize: 470,
    annualTurnoverCr: 190,
    certifications: ['CMMI L3', 'ISO 27001', 'ISO 9001', 'ISO 20000'],
    empanelment: ['GeM registered'],
    contactName: 'Farhan Qureshi',
    contactEmail: 'farhan.qureshi@pathikmobility.com',
    rating: 4.3,
    projectsDelivered: 46,
    onTimeDeliveryPct: 90,
    historyEntries: [
      { buyer: 'Brihanmumbai Electric Supply and Transport', year: 2024, valueCr: 72, outcome: 'Delivered; ticketing and AVL live across 3,200 buses.' },
      { buyer: 'Surat Municipal Corporation', year: 2022, valueCr: 39, outcome: 'Delivered, six weeks late on the control centre.' },
    ],
    technicalStack: ['Java / Spring Boot', 'Kafka', 'PostgreSQL', 'Kubernetes', 'GTFS / GTFS-RT', 'Android / iOS native'],
    comparableTechnicalScope: true,
    comparableScopeNote: 'Ran a 72 Cr fleet-wide ticketing and tracking programme for BEST.',
    onboardedAt: agoFromNow(1010),
    status: 'active',
  },
]
