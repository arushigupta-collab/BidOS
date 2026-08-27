import type { Source } from '@/types'
import { agoFromNow } from './workspace'

/**
 * The five sources this workspace already had. The platforms are real; the
 * workspace reading them is not. A source is a platform, a listing page, an
 * identifier and the keywords that qualify a listing — nothing else.
 *
 * These are not loaded on a fresh visit. The workspace starts empty and they
 * appear alongside the operator's first created source: the count then reads six,
 * with the new one first. See src/store/useWorkspace.ts.
 *
 * `platformId` holds an id from ./platforms.
 */
export const SOURCES: Source[] = [
  {
    id: 's-gem',
    name: 'Systems integration and managed services',
    platformId: 'gem',
    url: 'https://gem.gov.in/bidlists',
    registeredId: 'GEM-SLR-4471902',
    credentialLabel: 'Vault-encrypted seller login',
    keywords: ['system integrator', 'managed services', 'ICT infrastructure', 'network rollout'],
    status: 'active',
    addedAt: agoFromNow(214),
  },
  {
    id: 's-cppp',
    name: 'Turnkey and e-governance',
    platformId: 'cppp',
    url: 'https://eprocure.gov.in/eprocure/app',
    registeredId: 'CPPP-BR-2019-88134',
    credentialLabel: 'Vault-encrypted portal login',
    keywords: ['turnkey', 'optical fibre', 'e-governance', 'SCADA', 'command centre'],
    status: 'active',
    addedAt: agoFromNow(198),
  },
  {
    id: 's-ireps',
    name: 'Railway signalling and telecom',
    platformId: 'ireps',
    url: 'https://www.ireps.gov.in/epsn/anonymSearch.do',
    registeredId: 'IREPS-VC-30281-MIL',
    credentialLabel: 'Vault-encrypted seller login',
    keywords: ['signalling', 'telecom works', 'OFC', 'station systems'],
    status: 'active',
    addedAt: agoFromNow(167),
  },
  {
    id: 's-mahatenders',
    name: 'Maharashtra citizen services',
    platformId: 'mahatenders',
    url: 'https://www.mahatenders.gov.in/nicgep/app',
    registeredId: 'MAHA-BR-114509',
    credentialLabel: 'Vault-encrypted portal login',
    keywords: ['Aaple Sarkar', 'RTS', 'citizen services', 'system integrator', 'MahaIT'],
    status: 'active',
    addedAt: agoFromNow(96),
  },
  {
    id: 's-state-eproc',
    name: 'Karnataka smart city and data centre',
    platformId: 'state-eproc',
    url: 'https://etenders.karnataka.gov.in/eprocure/app',
    registeredId: 'KA-ETP-59120',
    credentialLabel: 'Vault-encrypted portal login',
    keywords: ['smart city', 'data centre', 'command centre', 'ICT infrastructure'],
    // One paused, so the Status column has something to say.
    status: 'paused',
    addedAt: agoFromNow(51),
  },
]

export const SOURCES_BY_ID = new Map(SOURCES.map((s) => [s.id, s]))

export const SOURCE_STATUS_COPY: Record<Source['status'], { label: string; tone: 'success' | 'neutral' }> = {
  active: { label: 'Active', tone: 'success' },
  paused: { label: 'Paused', tone: 'neutral' },
}
