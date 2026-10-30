import { logActivity, getActivities } from '../activities'

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

describe('Activity Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getUser as jest.Mock).mockResolvedValue({ id: 'user-1', email: 'test@example.com' })
  })

  test('logActivity creates activity record', async () => {
    const mockUserSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { tenant_id: 'tenant-1' },
          error: null,
        }),
      }),
    })

    const mockActivityInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'activity-1',
            type: 'call',
            subject: 'Follow up call',
            body: 'Discussed pricing options',
          },
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'users') return { select: mockUserSelect }
      if (table === 'activities') return { insert: mockActivityInsert }
      return {}
    })

    const activity = await logActivity('lead-1', 'call', 'Follow up call', 'Discussed pricing options')
    expect(activity).toBeDefined()
    expect(activity.type).toBe('call')
    expect(activity.subject).toBe('Follow up call')
  })

  test('getActivities returns activities for lead', async () => {
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [
            { id: 'activity-1', type: 'call', subject: 'Call', body: 'Called lead' },
            { id: 'activity-2', type: 'email', subject: 'Email', body: 'Sent proposal' },
          ],
          error: null,
        }),
      }),
    })
    mockSupabase.from.mockReturnValue({ select: mockSelect })

    const activities = await getActivities('lead-1')
    expect(activities).toHaveLength(2)
  })
})