/**
 * The controlled vocabularies the source configuration form selects from. Kept
 * apart from the source records themselves so a list can grow without touching
 * anything that has already been saved.
 */

export interface Option {
  value: string
  label: string
}

/** The workspace's own practice areas. Drives business unit and keyword suggestions. */
export const PRACTICE_AREAS: Array<Option & { keywords: string[] }> = [
  {
    value: 'egov',
    label: 'e-Governance and citizen services',
    keywords: [
      'system integrator',
      'e-governance',
      'citizen services',
      'service delivery platform',
      'RTS',
      'single window',
    ],
  },
  {
    value: 'telecom',
    label: 'Telecom and network infrastructure',
    keywords: ['optical fibre', 'OFC', 'managed services', 'network rollout', 'BharatNet'],
  },
  {
    value: 'power',
    label: 'Power distribution and metering',
    keywords: ['smart metering', 'AMI', 'RDSS', 'feeder automation', 'SCADA'],
  },
  {
    value: 'transport',
    label: 'Transport and highway systems',
    keywords: ['intelligent transport', 'tolling', 'ATMS', 'ANPR', 'traffic management'],
  },
  {
    value: 'datacentre',
    label: 'Data centre, cloud and security',
    keywords: ['data centre', 'cloud migration', 'SOC', 'cybersecurity', 'command centre'],
  },
  {
    value: 'defence',
    label: 'Defence and strategic accounts',
    keywords: ['secure communications', 'defence electronics', 'C4ISR'],
  },
]

export const BUSINESS_UNIT_OPTIONS: Option[] = PRACTICE_AREAS.map(({ value, label }) => ({
  value,
  label,
}))

/**
 * Domain expertise a bid manager can hold. Deliberately finer than the practice
 * areas: routing is matched against what a person actually covers, and "AI" or
 * "IT Services" as single buckets would route a computer-vision tender to whoever
 * happens to know Kubernetes.
 *
 * Free text is still accepted, so this is a starting vocabulary rather than a
 * closed list.
 *
 * e-Governance and Citizen Services were added to the list as given: without them
 * no bid manager could hold a domain covering the flagship Aaple Sarkar tender, and
 * it routed on region alone.
 */
export const DOMAIN_EXPERTISE = [
  'e-Governance',
  'Citizen Services',
  'AI - Computer Vision',
  'AI - Agentic AI',
  'AI - NLP',
  'AI - Document Intelligence',
  'Data and Analytics',
  'Telecom',
  'Optical Fibre',
  'Networking',
  'Solar',
  'Smart City',
  'IT Services',
  'Civil',
  'Cybersecurity',
  'Cloud and Infrastructure',
] as const

/**
 * Regional coverage, offered as two groups. A person may hold a mix: a zone for
 * broad coverage and named states for the ones they actually work.
 */
export const REGION_ZONES = [
  'Pan-India',
  'North',
  'Central',
  'South',
  'East',
  'West',
  'North East',
] as const

export const REGION_STATES = [
  'Rajasthan',
  'Bihar',
  'Maharashtra',
  'Delhi',
  'Tamil Nadu',
  'Karnataka',
  'Uttar Pradesh',
  'Gujarat',
  'West Bengal',
  'Madhya Pradesh',
  'Telangana',
  'Kerala',
  'Punjab',
  'Haryana',
  'Odisha',
  'Assam',
] as const

export const AUTH_METHODS: Option[] = [
  { value: 'anonymous', label: 'Anonymous or public listing' },
  { value: 'portal-login', label: 'Portal login' },
  { value: 'api-key', label: 'API key' },
  { value: 'bearer', label: 'Bearer token' },
]

export const DSC_CLASSES: Option[] = [
  { value: 'class-3-individual', label: 'Class 3 Individual' },
  { value: 'class-3-organisation', label: 'Class 3 Organisation' },
]

export const FREQUENCIES: Array<Option & { perDay: number; sentence: string }> = [
  { value: 'every-15-minutes', label: 'Every 15 minutes', perDay: 96, sentence: 'every 15 minutes' },
  { value: 'hourly', label: 'Hourly', perDay: 24, sentence: 'every hour' },
  { value: 'every-2-hours', label: 'Every 2 hours', perDay: 12, sentence: 'every 2 hours' },
  { value: 'every-6-hours', label: 'Every 6 hours', perDay: 4, sentence: 'every 6 hours' },
  { value: 'daily', label: 'Daily', perDay: 1, sentence: 'once a day' },
]

export const BACKFILL_OPTIONS: Array<Option & { sentence: string | null }> = [
  { value: 'none', label: 'None', sentence: null },
  { value: '7', label: 'Last 7 days', sentence: 'backfilling the last 7 days' },
  { value: '30', label: 'Last 30 days', sentence: 'backfilling the last 30 days' },
  { value: '90', label: 'Last 90 days', sentence: 'backfilling the last 90 days' },
]

export const MATCH_MODES: Option[] = [
  { value: 'any', label: 'Any keyword' },
  { value: 'all', label: 'All keywords' },
  { value: 'phrase', label: 'Exact phrase' },
]

export const MATCH_SCOPES: Array<Option & { sentence: string }> = [
  { value: 'title', label: 'Title only', sentence: 'in the listing title' },
  { value: 'title-abstract', label: 'Title and abstract', sentence: 'across title and abstract' },
  { value: 'full-text', label: 'Full document text', sentence: 'across the full document text' },
]

export const CRAWL_WINDOWS: Option[] = [
  { value: 'continuous', label: 'Continuous' },
  { value: 'business-hours', label: 'Business hours only' },
]

export const RETENTION_OPTIONS: Option[] = [
  { value: '12-months', label: '12 months' },
  { value: '3-years', label: '3 years' },
  { value: '7-years', label: '7 years' },
  { value: 'contract-plus-7', label: 'Contract term plus 7 years' },
]

export const BUYER_TYPES: Option[] = [
  { value: 'central', label: 'Central Government' },
  { value: 'state', label: 'State Government' },
  { value: 'psu', label: 'PSU' },
  { value: 'ulb', label: 'Urban Local Body' },
  { value: 'autonomous', label: 'Autonomous body' },
  { value: 'defence', label: 'Defence' },
]

export const PROCUREMENT_TYPES: Option[] = [
  { value: 'goods', label: 'Goods' },
  { value: 'services', label: 'Services' },
  { value: 'works', label: 'Works' },
  { value: 'turnkey', label: 'Turnkey' },
]

export const TENDER_TYPES: Option[] = [
  { value: 'open', label: 'Open tender' },
  { value: 'limited', label: 'Limited tender' },
  { value: 'gem-bid', label: 'GeM bid' },
  { value: 'reverse-auction', label: 'Reverse auction' },
  { value: 'eoi', label: 'EOI' },
  { value: 'rfp', label: 'RFP' },
  { value: 'rfq', label: 'RFQ' },
]

export const PREFERENCE_OPTIONS: Array<Option & { detail: string }> = [
  {
    value: 'mii-class-1',
    label: 'PPP-MII Class I local supplier',
    detail: 'Local content at or above 50 percent',
  },
  {
    value: 'mii-class-2',
    label: 'Class II local supplier',
    detail: 'Local content between 20 and 50 percent',
  },
  { value: 'mse', label: 'MSE preference', detail: 'Micro and small enterprise purchase preference' },
  { value: 'startup', label: 'Startup preference', detail: 'Recognised startup exemptions' },
]

export const GEOGRAPHIES: Option[] = [
  { value: 'pan-india', label: 'Pan-India' },
  { value: 'andhra-pradesh', label: 'Andhra Pradesh' },
  { value: 'assam', label: 'Assam' },
  { value: 'bihar', label: 'Bihar' },
  { value: 'chhattisgarh', label: 'Chhattisgarh' },
  { value: 'delhi', label: 'Delhi' },
  { value: 'goa', label: 'Goa' },
  { value: 'gujarat', label: 'Gujarat' },
  { value: 'haryana', label: 'Haryana' },
  { value: 'himachal-pradesh', label: 'Himachal Pradesh' },
  { value: 'jharkhand', label: 'Jharkhand' },
  { value: 'karnataka', label: 'Karnataka' },
  { value: 'kerala', label: 'Kerala' },
  { value: 'madhya-pradesh', label: 'Madhya Pradesh' },
  { value: 'maharashtra', label: 'Maharashtra' },
  { value: 'odisha', label: 'Odisha' },
  { value: 'punjab', label: 'Punjab' },
  { value: 'rajasthan', label: 'Rajasthan' },
  { value: 'tamil-nadu', label: 'Tamil Nadu' },
  { value: 'telangana', label: 'Telangana' },
  { value: 'uttar-pradesh', label: 'Uttar Pradesh' },
  { value: 'uttarakhand', label: 'Uttarakhand' },
  { value: 'west-bengal', label: 'West Bengal' },
]

const ALL = [
  ...BUSINESS_UNIT_OPTIONS,
  ...AUTH_METHODS,
  ...DSC_CLASSES,
  ...FREQUENCIES,
  ...BACKFILL_OPTIONS,
  ...MATCH_MODES,
  ...MATCH_SCOPES,
  ...CRAWL_WINDOWS,
  ...RETENTION_OPTIONS,
  ...BUYER_TYPES,
  ...PROCUREMENT_TYPES,
  ...TENDER_TYPES,
  ...PREFERENCE_OPTIONS,
  ...GEOGRAPHIES,
]

const LABELS = new Map(ALL.map((option) => [option.value, option.label]))

/** Label for any vocabulary value, for the preview sentence and table cells. */
export function labelFor(value: string): string {
  return LABELS.get(value) ?? value
}
