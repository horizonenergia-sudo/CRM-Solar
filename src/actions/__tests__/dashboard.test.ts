import { getMetrics, getPipelineData, getRepPerformance } from '../dashboard'

// Mock Supabase server client
const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn(),
}

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: () => mockSupabase,
}))

jest.mock('../auth-helpers', () => ({
  getUser: jest.fn(),
}))

import { getUser } from '../auth-helpers'

describe('Dashboard Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getUser as jest.Mock).mockResolvedValue({ id: 'user-1', email: 'test@example.com' })
  })

  test('getMetrics returns aggregated metrics for tenant', async () => {
    const mockUserSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { tenant_id: 'tenant-1' },
          error: null,
        }),
      }),
    })

    const mockRpcData = {
      data: [{
        total_leads: 150,
        qualified_leads: 45,
        proposals_sent: 30,
        proposals_signed: 18,
        total_revenue_cents: 450000000,
        avg_cycle_days: 28,
      }],
      error: null,
    }

    mockSupabase.from.mockReturnValue({ select: mockUserSelect })
    mockSupabase.rpc.mockResolvedValue(mockRpcData)

    const metrics = await getMetrics({ startDate: '2026-01-01', endDate: '2026-12-31' })

    expect(metrics).toBeDefined()
    expect(metrics.totalLeads).toBe(150)
    expect(metrics.qualifiedLeads).toBe(45)
    expect(metrics.proposalsSent).toBe(30)
    expect(metrics.proposalsSigned).toBe(18)
    expect(metrics.conversionRate).toBeCloseTo(40, 1) // 18/45 * 100
    expect(metrics.totalRevenueCents).toBe(450000000)
    expect(metrics.avgCycleDays).toBe(28)
  })

  test('getPipelineData returns pipeline funnel data', async () => {
    const mockUserSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { tenant_id: 'tenant-1' },
          error: null,
        }),
      }),
    })

    const mockRpcData = {
      data: [
        { stage: 'new', count: 40, value_cents: 0 },
        { stage: 'qualified', count: 35, value_cents: 87500000 },
        { stage: 'survey_scheduled', count: 25, value_cents: 62500000 },
        { stage: 'survey_completed', count: 20, value_cents: 50000000 },
        { stage: 'design_ready', count: 15, value_cents: 37500000 },
        { stage: 'proposal_sent', count: 10, value_cents: 25000000 },
        { stage: 'won', count: 8, value_cents: 20000000 },
        { stage: 'lost', count: 7, value_cents: 0 },
      ],
      error: null,
    }

    mockSupabase.from.mockReturnValue({ select: mockUserSelect })
    mockSupabase.rpc.mockResolvedValue(mockRpcData)

    const pipeline = await getPipelineData()

    expect(pipeline).toHaveLength(8)
    expect(pipeline[0].stage).toBe('new')
    expect(pipeline[0].count).toBe(40)
    expect(pipeline[6].stage).toBe('won')
    expect(pipeline[6].count).toBe(8)
  })

  test('getRepPerformance returns sales rep leaderboard', async () => {
    const mockUserSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { tenant_id: 'tenant-1' },
          error: null,
        }),
      }),
    })

    const mockRpcData = {
      data: [
        { user_id: 'user-1', full_name: 'John Smith', leads_count: 25, proposals_sent: 15, deals_won: 8, revenue_cents: 200000000, conversion_rate: 53.33 },
        { user_id: 'user-2', full_name: 'Jane Doe', leads_count: 30, proposals_sent: 12, deals_won: 6, revenue_cents: 150000000, conversion_rate: 50.0 },
        { user_id: 'user-3', full_name: 'Bob Wilson', leads_count: 20, proposals_sent: 8, deals_won: 4, revenue_cents: 100000000, conversion_rate: 50.0 },
      ],
      error: null,
    }

    mockSupabase.from.mockReturnValue({ select: mockUserSelect })
    mockSupabase.rpc.mockResolvedValue(mockRpcData)

    const reps = await getRepPerformance()

    expect(reps).toHaveLength(3)
    expect(reps[0].fullName).toBe('John Smith')
    expect(reps[0].dealsWon).toBe(8)
    expect(reps[0].revenueCents).toBe(200000000)
    expect(reps[1].conversionRate).toBe(50.0)
  })
})