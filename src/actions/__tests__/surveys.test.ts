import { createSurvey, completeSurvey, getSurveyByToken } from '../surveys'

// Mock Supabase server client
const mockSupabase = {
  from: jest.fn(),
  storage: {
    from: jest.fn(),
  },
}

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: () => mockSupabase,
}))

jest.mock('../auth-helpers', () => ({
  getUser: jest.fn(),
}))

import { getUser } from '../auth-helpers'

describe('Survey Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getUser as jest.Mock).mockResolvedValue({ id: 'user-1', email: 'test@example.com' })
  })

  test('createSurvey inserts survey record with tenant_id', async () => {
    const mockUserSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { tenant_id: 'tenant-1' },
          error: null,
        }),
      }),
    })

    const mockSurveyInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'survey-1',
            lead_id: 'lead-1',
            surveyor_id: 'user-1',
            scheduled_at: '2026-11-01T10:00:00Z',
            status: 'scheduled',
            token: 'auto-generated-uuid',
          },
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'users') return { select: mockUserSelect }
      if (table === 'site_surveys') return { insert: mockSurveyInsert }
      return {}
    })

    const survey = await createSurvey('lead-1', '2026-11-01T10:00:00Z', 'user-1')
    expect(survey).toBeDefined()
    expect(survey.lead_id).toBe('lead-1')
    expect(survey.status).toBe('scheduled')
    expect(survey.token).toBeDefined()
  })

  test('completeSurvey updates survey with data and photos', async () => {
    const mockUserSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { tenant_id: 'tenant-1' },
          error: null,
        }),
      }),
    })

    const mockEq2 = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'survey-1',
            lead_id: 'lead-1',
            status: 'completed',
            roof_photos: ['photo1.jpg', 'photo2.jpg'],
            measurements: { roof_area: 500, orientation: 'south' },
            notes: 'Good sun exposure',
          },
          error: null,
        }),
      }),
    })

    const mockEq1 = jest.fn().mockReturnValue({
      eq: mockEq2,
    })

    const mockSurveyUpdate = jest.fn().mockReturnValue({
      eq: mockEq1,
    })

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'users') return { select: mockUserSelect }
      if (table === 'site_surveys') return { update: mockSurveyUpdate }
      return {}
    })

    const survey = await completeSurvey('survey-1', {
      roof_photos: ['photo1.jpg', 'photo2.jpg'],
      measurements: { roof_area: 500, orientation: 'south' },
      notes: 'Good sun exposure',
    })
    expect(survey).toBeDefined()
    expect(survey.status).toBe('completed')
    expect(survey.roof_photos).toHaveLength(2)
  })

  test('getSurveyByToken returns survey for public token', async () => {
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'survey-1',
            lead_id: 'lead-1',
            token: 'public-token-123',
            status: 'scheduled',
          },
          error: null,
        }),
      }),
    })
    mockSupabase.from.mockReturnValue({ select: mockSelect })

    const survey = await getSurveyByToken('public-token-123')
    expect(survey).toBeDefined()
    expect(survey.token).toBe('public-token-123')
  })
})