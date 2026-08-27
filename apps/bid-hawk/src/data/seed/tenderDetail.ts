/**
 * What Screen 7 renders beyond the tender record itself: the structured Bid Hawk
 * summary.
 *
 * Kept in its own module rather than added to tenders.ts on purpose. The hero
 * record in that file was validated line by line against the 262-page published
 * RFP, and the fewer edits it takes the better. Everything here is keyed by
 * tender id, so the two stay independent.
 */

export interface TenderSummary {
  scope: string
  financials: string
  eligibility: string
  risk: string
  precedent: string
  recommendation: string
  evaluation: string
}

export const TENDER_SUMMARIES: Record<string, TenderSummary> = {
  't-mahait-rts2': {
    scope:
      'Design, build and migrate the Aaple Sarkar Right to Service platform, then operate it for 36 months. Existing citizen services move across; the platform is single-supplier end to end.',
    financials:
      'INR 72 Cr estimated against a INR 1 Cr EMD as bank guarantee and a 10% PBG valid 180 days past O&M. Tender fee INR 25,000, non-refundable, paid on the portal. Prices must be inclusive of GST.',
    eligibility:
      'Ten of eleven criteria are met or recoverable. CMMI Level 5 is not: the certificate is under renewal and must be verifiable at cmmiinstitute.com/pars before commercial bid opening.',
    risk:
      'Two defects in the documents. The SLA schedule demands a 0.30 ms API response with a 1% penalty per breaching call, contradicting Section 7. No Advance Bank Guarantee is specified.',
    precedent:
      'Two Maharashtra citizen-service platforms delivered in the last five years, both with client sign-off available for the E2 envelope.',
    recommendation:
      'Bid, conditional on the CMMI renewal landing before commercial opening. Raise both defects as pre-bid queries before 13 Aug.',
    evaluation:
      'QCBS at 70:30 with prices inclusive of GST. Consortia are barred, so the technical score rests entirely on this entity’s own credentials.',
  },
  't-railtel-wifi': {
    scope:
      'Refresh managed WiFi and augment bandwidth at 460 Northern Zone stations, then run it as a managed service for 60 months.',
    financials:
      'INR 74.5 Cr estimated with a INR 1.49 Cr EMD. A 60-month managed service means the recurring line dominates the commercial score.',
    eligibility:
      'Railway supplier registration is current. The bandwidth-provisioning criterion needs a licensed ISP partner named in the bid.',
    risk: 'Bandwidth commitments are per station with uptime measured monthly; a single sustained outage crosses the penalty band.',
    precedent: 'Comparable station-systems work delivered on IREPS in the last three years.',
    recommendation: 'Bid. The managed-service term suits the operations base already in the North.',
    evaluation: 'QCBS at 70:30 across two bid envelopes.',
  },
  't-bsnl-otn-bihar': {
    scope:
      'Supply, install and commission a 100G optical transport network across 38 Bihar districts, including DWDM terminals, protection paths and integration with the NGN core.',
    financials:
      'INR 128 Cr estimated with a INR 2.56 Cr EMD. Award is L1 on total cost of ownership over 42 months, so spares and AMC price as heavily as capex.',
    eligibility:
      'PPP-MII Class I preference applies. Imported line cards require a local content declaration signed by a statutory auditor.',
    risk: 'Two days remain on the clock and the local content declaration needs an auditor signature.',
    precedent: 'Optical transport delivered at circle scale, including protection-path design.',
    recommendation: 'Bid only if the local content declaration can be signed inside two days.',
    evaluation: 'L1 on total cost of ownership across 42 months, two bid envelopes.',
  },
  't-uppcl-metering': {
    scope: 'Install and commission smart prepaid meters under RDSS across three UPPCL zones, with head-end integration.',
    financials: 'INR 210 Cr estimated, the largest in this feed, with the EMD scaled to match.',
    eligibility: 'RDSS empanelment and a meter type-approval certificate are both prerequisites.',
    risk: 'Meter supply lead times against an RDSS milestone calendar that does not move.',
    precedent: 'AMI rollouts delivered for two state DISCOMs.',
    recommendation: 'Bid. This is the closest match in the feed to the metering practice.',
    evaluation: 'QCBS with a technical qualification gate on type approval.',
  },
  't-nhai-atms': {
    scope: 'Advanced Traffic Management System across 640 km of national highway, including ANPR, VMS and a control centre.',
    financials: 'INR 96 Cr estimated. Civil works are carved out and awarded separately.',
    eligibility: 'Highway ITS experience at corridor scale is the binding criterion.',
    risk: 'Interface risk with the separately awarded civil package sits with the ITS contractor.',
    precedent: 'Corridor ITS delivered on two national highway packages.',
    recommendation: 'Bid, with the civil interface priced as a risk line.',
    evaluation: 'QCBS at 80:20, technical weighted heavily.',
  },
  't-gcc-iccc': {
    scope: 'Integrated Command and Control Centre for Greater Chennai Corporation, including city surveillance and incident workflow.',
    financials: 'INR 154 Cr estimated with a five-year O&M tail.',
    eligibility: 'Smart city ICCC experience and a data-centre certification are both required.',
    risk: 'Departmental integration count is stated as indicative, which moves scope after award.',
    precedent: 'ICCC delivered for one municipal corporation.',
    recommendation: 'Bid, with the integration count pinned in a pre-bid query.',
    evaluation: 'QCBS at 70:30.',
  },
  't-bel-tactical': {
    scope: 'Tactical communication subsystem integration for a defence programme, including secure gateways.',
    financials: 'INR 62 Cr estimated. Payment is milestone-linked against acceptance testing.',
    eligibility: 'Defence supplier registration and security clearance are prerequisites.',
    risk: 'Acceptance testing is at the customer’s discretion with no stated calendar.',
    precedent: 'Secure communications delivered on two defence programmes.',
    recommendation: 'Bid. The secure-communications practice covers this directly.',
    evaluation: 'Technical qualification gate, then L1 among qualified bidders.',
  },
  't-aai-cctv': {
    scope: 'Airport surveillance refresh across six regional airports, with analytics and a central viewing facility.',
    financials: 'INR 38 Cr estimated with a 36-month AMC.',
    eligibility: 'Aviation-sector security clearance is required before mobilisation.',
    risk: 'Work must proceed in live terminals with night-only windows.',
    precedent: 'Surveillance delivered at two transport hubs.',
    recommendation: 'Bid, with night-window productivity priced realistically.',
    evaluation: 'QCBS at 70:30.',
  },
  't-kseb-ami': {
    scope: 'AMI head-end and meter data management for KSEB, with SCADA interfacing.',
    financials: 'INR 44 Cr estimated. Licence and support are priced separately from integration.',
    eligibility: 'MDM product certification and an RDSS reference are both needed.',
    risk: 'The SCADA interface specification is referenced but not attached to the tender.',
    precedent: 'AMI head-end delivered for one DISCOM.',
    recommendation: 'Request the SCADA specification in pre-bid before committing to the interface scope.',
    evaluation: 'QCBS at 70:30.',
  },
  't-bsnl-4g-backhaul': {
    scope: 'Optical fibre backhaul augmentation for 4G saturation sites across two circles.',
    financials: 'INR 88 Cr estimated. Route-kilometre rates carry the commercial score.',
    eligibility: 'Right-of-way handling experience across state and municipal authorities.',
    risk: 'Right-of-way approvals sit with the bidder and are the usual cause of slippage.',
    precedent: 'OFC rollout delivered at circle scale.',
    recommendation: 'Bid, with right-of-way contingency in the programme.',
    evaluation: 'L1 on route-kilometre rates.',
  },
  't-hal-plm': {
    scope: 'Product Lifecycle Management implementation and rollout across HAL divisions.',
    financials: 'INR 26 Cr estimated, licence-heavy with a services tail.',
    eligibility: 'Certified implementation partner status for the named PLM product.',
    risk: 'Partner certification is product-specific and cannot be substituted.',
    precedent: 'Enterprise application rollouts delivered for two PSUs.',
    recommendation: 'Bid only with the named product’s partner certification in hand.',
    evaluation: 'QCBS at 70:30 with a product certification gate.',
  },
  't-bbmp-property-tax': {
    scope: 'Property tax platform modernisation for BBMP, including payment gateway and citizen portal.',
    financials: 'INR 18 Cr estimated with a transaction-linked O&M component.',
    eligibility: 'Municipal revenue platform experience is the binding criterion.',
    risk: 'Legacy data quality is the bidder’s problem after award, and no data audit is offered.',
    precedent: 'Citizen service platforms delivered for two urban local bodies.',
    recommendation: 'Bid, with a data remediation allowance priced in.',
    evaluation: 'QCBS at 70:30.',
  },
  't-mppkvvcl-rdss': {
    scope: 'Feeder automation and SCADA extension under RDSS for MPPKVVCL.',
    financials: 'INR 57 Cr estimated against an RDSS milestone calendar.',
    eligibility: 'RDSS empanelment and feeder automation references are required.',
    risk: 'RDSS milestone dates are fixed regardless of site handover delays.',
    precedent: 'Feeder automation delivered for one DISCOM.',
    recommendation: 'Bid. The RDSS practice covers this directly.',
    evaluation: 'QCBS with an empanelment gate.',
  },
  't-djb-scada': {
    scope: 'SCADA and telemetry for Delhi Jal Board water distribution, with a control room.',
    financials: 'INR 45 Lakh estimated, the smallest in this feed, and effectively a pilot.',
    eligibility: 'Water utility SCADA experience, with a pilot-scale reference accepted.',
    risk: 'Pilot scope with no stated route to the full rollout it is meant to precede.',
    precedent: 'Utility SCADA delivered at pilot scale.',
    recommendation: 'Bid if the full rollout route can be clarified in pre-bid.',
    evaluation: 'L1 among technically qualified bidders.',
  },
}

/** The disclaimer is required wherever agent output is shown. */
export const SUMMARY_DISCLAIMER =
  'Generated by Bid Hawk from the published tender documents. Verify against the source RFP before submission.'
