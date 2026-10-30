import { createProposal, sendProposal, signProposal, getProposalByToken } from '../proposals'

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

// Helper to create chained eq mocks
function createEqChain(responses: any[]) {
  let callIndex = 0
  const createNext = () => {
    const response = responses[callIndex] || responses[responses.length - 1]
    callIndex++
    return jest.fn().mockReturnValue(response)
  }

  const chain: any = { eq: createNext() }
  let current = chain
  for (let i = 1; i < responses.length; i++) {
    current = current.eq = createNext()
  }
  return chain
}

describe('Proposal Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getUser as jest.Mock).mockResolvedValue({ id: 'user-1', email: 'test@example.com' })
  })

  test('createProposal creates proposal with pricing validation', async () => {
    const mockUserSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { tenant_id: 'tenant-1' },
          error: null,
        }),
      }),
    })

    const mockDesignEq2 = jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'design-1',
          tenant_id: 'tenant-1',
          lead_id: 'lead-1',
          system_size_kw: 8.5,
          panel_count: 24,
          annual_production_kwh: 12000,
          layout_image_url: 'https://example.com/layout.png',
        },
        error: null,
      }),
    })

    const mockDesignEq1 = jest.fn().mockReturnValue({ eq: mockDesignEq2 })
    const mockDesignSelect = jest.fn().mockReturnValue({ eq: mockDesignEq1 })

    const mockLeadEq2 = jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: { id: 'lead-1', tenant_id: 'tenant-1', avg_monthly_bill: 15000 },
        error: null,
      }),
    })

    const mockLeadEq1 = jest.fn().mockReturnValue({ eq: mockLeadEq2 })
    const mockLeadSelect = jest.fn().mockReturnValue({ eq: mockLeadEq1 })

    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'proposal-1', lead_id: 'lead-1', design_id: 'design-1', total_price_cents: 2500000, status: 'draft', version: 1 },
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'users') return { select: mockUserSelect }
      if (table === 'designs') return { select: mockDesignSelect }
      if (table === 'leads') return { select: mockLeadSelect }
      if (table === 'proposals') return { insert: mockInsert }
      return {}
    })

    const proposal = await createProposal('lead-1', 'design-1', {
      system_price_cents: 2200000,
      financing_options: [{ type: 'loan', apr: 4.99, term_months: 240 }],
      deposit_percent: 10,
    })
    expect(proposal).toBeDefined()
    expect(proposal.total_price_cents).toBe(2500000)
    expect(proposal.status).toBe('draft')
  })

  test('sendProposal updates status and sets sent_at', async () => {
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
        data: { id: 'proposal-1', status: 'sent', sent_at: new Date().toISOString(), token: 'proposal-token-123' },
        error: null,
      }),
    })

    const mockUpdateEq2 = jest.fn().mockReturnValue({ select: mockUpdateSelect })
    const mockUpdateEq1 = jest.fn().mockReturnValue({ eq: mockUpdateEq2 })
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq1 })

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'users') return { select: mockUserSelect }
      if (table === 'proposals') return { update: mockUpdate }
      return {}
    })

    const proposal = await sendProposal('proposal-1')
    expect(proposal).toBeDefined()
    expect(proposal.status).toBe('sent')
    expect(proposal.sent_at).toBeDefined()
    expect(proposal.token).toBeDefined()
  })

  test('signProposal updates status to signed', async () => {
    const mockSelectEq = jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: { id: 'proposal-1', status: 'sent', expires_at: new Date(Date.now() + 86400000).toISOString(), tenant_id: 'tenant-1', lead_id: 'lead-1', total_price_cents: 2500000, deposit_percent: 10 },
        error: null,
      }),
    })

    const mockSelect = jest.fn().mockReturnValue({ eq: mockSelectEq })

    const mockUpdateSelect = jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: { id: 'proposal-1', status: 'signed', signed_at: new Date().toISOString() },
        error: null,
      }),
    })

    const mockUpdateEq = jest.fn().mockReturnValue({ select: mockUpdateSelect })
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq })

    const mockContractInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: { id: 'contract-1' }, error: null }),
      }),
    })

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'proposals') return { select: mockSelect, update: mockUpdate }
      if (table === 'contracts') return { insert: mockContractInsert }
      return {}
    })

    const proposal = await signProposal('proposal-token-123', 'signature-data')
    expect(proposal).toBeDefined()
    expect(proposal.status).toBe('signed')
    expect(proposal.signed_at).toBeDefined()
  })

  test('getProposalByToken returns proposal for public view', async () => {
    const mockSelectEq = jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: { id: 'proposal-1', token: 'proposal-token-123', status: 'sent', lead: { first_name: 'John', last_name: 'Doe' }, design: { system_size_kw: 8.5, layout_image_url: 'https://example.com/layout.png' } },
        error: null,
      }),
    })

    const mockSelect = jest.fn().mockReturnValue({ eq: mockSelectEq })

    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    })

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'proposals') return { select: mockSelect, update: mockUpdate }
      return {}
    })

    const proposal = await getProposalByToken('proposal-token-123')
    expect(proposal).toBeDefined()
    expect(proposal.token).toBe('proposal-token-123')
  })
})