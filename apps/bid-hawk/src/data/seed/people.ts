import type { Person } from '@/types'
import { agoFromNow } from './workspace'

/**
 * The five bid managers this workspace already had. Not loaded on a fresh visit:
 * the workspace starts empty and these appear alongside the operator's first
 * created person, so the count then reads six with the new one first. See
 * src/store/useWorkspace.ts.
 *
 * Two of them are deliberately lopsided — one holds domain expertise with no
 * region, one holds regions with no domain — so the either-or validation on the
 * form is reflected in data a reader can actually see, rather than only in a rule.
 */
export const PEOPLE: Person[] = [
  {
    id: 'p-anand',
    name: 'Anand Raghunathan',
    email: 'anand.raghunathan@meridianinfratech.in',
    domains: ['Telecom', 'Optical Fibre', 'Networking'],
    regions: ['North', 'Pan-India'],
    addedAt: agoFromNow(186),
  },
  {
    id: 'p-meera',
    name: 'Meera Krishnan',
    email: 'meera.krishnan@meridianinfratech.in',
    domains: ['e-Governance', 'Citizen Services', 'IT Services', 'AI - Document Intelligence'],
    regions: ['Maharashtra', 'Gujarat', 'West'],
    addedAt: agoFromNow(154),
  },
  {
    id: 'p-vikram',
    name: 'Vikram Iyer',
    email: 'vikram.iyer@meridianinfratech.in',
    // Domain only: a specialist called in wherever the work lands.
    domains: ['Cloud and Infrastructure', 'Cybersecurity', 'AI - Agentic AI'],
    regions: [],
    addedAt: agoFromNow(88),
  },
  {
    id: 'p-sudeshna',
    name: 'Sudeshna Roy',
    email: 'sudeshna.roy@meridianinfratech.in',
    // Region only: holds the relationships in the east, whatever the scope.
    domains: [],
    regions: ['East', 'West Bengal', 'Odisha', 'Bihar'],
    addedAt: agoFromNow(61),
  },
  {
    id: 'p-nafisa',
    name: 'Nafisa Qureshi',
    email: 'nafisa.qureshi@meridianinfratech.in',
    domains: ['AI - Computer Vision', 'AI - NLP', 'Data and Analytics'],
    regions: ['South', 'Karnataka', 'Telangana'],
    addedAt: agoFromNow(34),
  },
]
