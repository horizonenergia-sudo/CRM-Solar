import { getDesigns, requestRevision, approveDesign } from '../designs'

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

describe('Design Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getUser as jest.Mock).mockResolvedValue({ id: 'user-1', email: 'test@example.com' })
  })

  test('getDesigns returns designs for lead', async () => {
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'design-1',
              external_id: 'aurora-123',
              external_source: 'aurora',
              name: 'Design 1',
              system_size_kw: 8.5,
              panel_count: 24,
              status: 'approved',
              version: 1,
            },
            {
              id: 'design-2',
              external_id: 'aurora-123',
              external_source: 'aurora',
              name: 'Design 1 v2',
              system_size_kw: 8.5,
              panel_count: 24,
              status: 'draft',
              version: 2,
            },
          ],
          error: null,
        }),
      }),
    })
    mockSupabase.from.mockReturnValue({ select: mockSelect })

    const designs = await getDesigns('lead-1')
    expect(designs).toHaveLength(2)
    expect(designs[0].external_id).toBe('aurora-123')
    expect(designs[0].version).toBe(1)
    expect(designs[1].version).toBe(2)
  })

  test('requestRevision updates design status and creates revision', async () => {
    const mockUserSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { tenant_id: 'tenant-1' },
          error: null,
        }),
      }),
    })

    // Mock for select().eq().eq().single() chain
    const mockDesignEq2 = jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'design-1',
          tenant_id: 'tenant-1',
          lead_id: 'lead-1',
          external_id: 'aurora-123',
          external_source: 'aurora',
          name: 'Design 1',
          version: 1,
          status: 'approved',
        },
        error: null,
      }),
    })

    const mockDesignEq1 = jest.fn().mockReturnValue({
      eq: mockDesignEq2,
    })

    const mockDesignSelect = jest.fn().mockReturnValue({
      eq: mockDesignEq1,
    })

    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'design-2',
            tenant_id: 'tenant-1',
            lead_id: 'lead-1',
            external_id: 'aurora-123',
            external_source: 'aurora',
            name: 'Design 1 (Revision)',
            version: 2,
            status: 'draft',
          },
          error: null,
        }),
      }),
    })

    // Mock for update().eq().eq().select().single() chain
    const mockUpdateSelect = jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })

    const mockUpdateEq2 = jest.fn().mockReturnValue({
      select: mockUpdateSelect,
    })

    const mockUpdateEq1 = jest.fn().mockReturnValue({
      eq: mockUpdateEq2,
    })

    const mockUpdate = jest.fn().mockReturnValue({
      eq: mockUpdateEq1,
    })

    // Return an object with both select, insert, and update methods for designs table
    const designsMock = {
      select: mockDesignSelect,
      insert: mockInsert,
      update: mockUpdate,
    }

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'users') return { select: mockUserSelect }
      if (table === 'designs') return designsMock
      return {}
    })

    const design = await requestRevision('design-1', 'Please adjust panel layout')
    expect(design).toBeDefined()
    expect(design.version).toBe(2)
    expect(design.status).toBe('draft')
  })

  test('approveDesign sets design status to approved', async () => {
    const mockUserSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { tenant_id: 'tenant-1' },
          error: null,
        }),
      }),
    })

    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'design-1',
                status: 'approved',
              },
              error: null,
            }),
          }),
        }),
      }),
    })

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'users') return { select: mockUserSelect }
      if (table === 'designs') return { update: mockUpdate }
      return {}
    })

    const design = await approveDesign('design-1')
    expect(design).toBeDefined()
    expect(design.status).toBe('approved')
  })
})