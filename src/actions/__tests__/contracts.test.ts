import { getContracts, updateContractStatus, scheduleInstallation } from '../contracts'

// Mock Supabase server client
const mockSupabase = {
  from: jest.fn(),
}

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: () => mockSupabase,
}))

jest.mock('../auth-helpers', () => ({
  getUser: jest.fn(),
}))

import { getUser } from '../auth-helpers'

describe('Contract Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getUser as jest.Mock).mockResolvedValue({ id: 'user-1', email: 'test@example.com' })
  })

  test('getContracts returns contracts with filters', async () => {
    const mockData = [
      {
        id: 'contract-1',
        contract_number: 'CTR-ABC123',
        lead_id: 'lead-1',
        status: 'active',
        deposit_amount_cents: 250000,
        deposit_paid_at: null,
        installation_scheduled_at: null,
      },
      {
        id: 'contract-2',
        contract_number: 'CTR-DEF456',
        lead_id: 'lead-2',
        status: 'installing',
        deposit_amount_cents: 300000,
        deposit_paid_at: '2026-11-01T10:00:00Z',
        installation_scheduled_at: '2026-11-15T09:00:00Z',
      },
    ]

    // Create a chainable query builder mock
    const createChain = () => {
      const chain = {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((resolve) => resolve({ data: mockData, error: null })),
      }
      return chain
    }

    const mockChain = createChain()
    const mockSelect = jest.fn().mockReturnValue(mockChain)
    mockSupabase.from.mockReturnValue({ select: mockSelect })

    const contracts = await getContracts({ status: 'active' })
    expect(contracts).toHaveLength(2)
    expect(contracts[0].contract_number).toBe('CTR-ABC123')
    expect(contracts[1].status).toBe('installing')
  })

  test('updateContractStatus updates contract status', async () => {
    const mockUserSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { tenant_id: 'tenant-1' },
          error: null,
        }),
      }),
    })

    const mockUpdateSelect = jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: { id: 'contract-1', status: 'installing' },
        error: null,
      }),
    })

    const mockUpdateEq2 = jest.fn().mockReturnValue({ select: mockUpdateSelect })
    const mockUpdateEq1 = jest.fn().mockReturnValue({ eq: mockUpdateEq2 })
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq1 })

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'users') return { select: mockUserSelect }
      if (table === 'contracts') return { update: mockUpdate }
      return {}
    })

    const contract = await updateContractStatus('contract-1', 'installing')
    expect(contract).toBeDefined()
    expect(contract.status).toBe('installing')
  })

  test('scheduleInstallation sets installation date', async () => {
    const mockUserSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { tenant_id: 'tenant-1' },
          error: null,
        }),
      }),
    })

    const mockUpdateSelect = jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'contract-1',
          status: 'installing',
          installation_scheduled_at: '2026-11-15T09:00:00Z',
        },
        error: null,
      }),
    })

    const mockUpdateEq2 = jest.fn().mockReturnValue({ select: mockUpdateSelect })
    const mockUpdateEq1 = jest.fn().mockReturnValue({ eq: mockUpdateEq2 })
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq1 })

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'users') return { select: mockUserSelect }
      if (table === 'contracts') return { update: mockUpdate }
      return {}
    })

    const contract = await scheduleInstallation('contract-1', '2026-11-15T09:00:00Z')
    expect(contract).toBeDefined()
    expect(contract.installation_scheduled_at).toBe('2026-11-15T09:00:00Z')
    expect(contract.status).toBe('installing')
  })
})