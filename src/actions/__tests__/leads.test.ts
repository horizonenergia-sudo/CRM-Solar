import { getLeads, createLead, updateLead, updateLeadStatus, assignLead } from '../leads'

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

describe('Lead Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getUser as jest.Mock).mockResolvedValue({ id: 'user-1', email: 'test@example.com' })
  })

  test('createLead inserts lead with tenant_id from auth', async () => {
    const mockUserSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { tenant_id: 'tenant-1' },
          error: null,
        }),
      }),
    })

    const mockLeadInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'lead-1',
            tenant_id: 'tenant-1',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com',
            status: 'new',
          },
          error: null,
        }),
      }),
    })

    const mockActivityInsert = jest.fn().mockResolvedValue({ error: null })

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'users') return { select: mockUserSelect }
      if (table === 'leads') return { insert: mockLeadInsert }
      if (table === 'activities') return { insert: mockActivityInsert }
      return {}
    })

    const lead = await createLead({ first_name: 'John', last_name: 'Doe', email: 'john@example.com' })
    expect(lead).toBeDefined()
    expect(lead.tenant_id).toBe('tenant-1')
    expect(lead.first_name).toBe('John')
  })

  test('getLeads returns leads with filters', async () => {
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [
            { id: 'lead-1', first_name: 'John', last_name: 'Doe', status: 'new' },
            { id: 'lead-2', first_name: 'Jane', last_name: 'Smith', status: 'qualified' },
          ],
          error: null,
        }),
      }),
      or: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    })
    mockSupabase.from.mockReturnValue({ select: mockSelect })

    const leads = await getLeads({ status: 'new' })
    expect(leads).toHaveLength(2)
  })

  test('updateLead updates lead fields', async () => {
    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'lead-1', first_name: 'John', last_name: 'Doe', email: 'john@example.com', phone: '555-1234' },
            error: null,
          }),
        }),
      }),
    })
    mockSupabase.from.mockReturnValue({ update: mockUpdate })

    const lead = await updateLead('lead-1', { phone: '555-1234' })
    expect(lead).toBeDefined()
    expect(lead.phone).toBe('555-1234')
  })

  test('updateLeadStatus updates lead status', async () => {
    const mockUserSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { tenant_id: 'tenant-1' },
          error: null,
        }),
      }),
    })

    const mockLeadUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'lead-1', status: 'qualified' },
            error: null,
          }),
        }),
      }),
    })

    const mockActivityInsert = jest.fn().mockResolvedValue({ error: null })

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'users') return { select: mockUserSelect }
      if (table === 'leads') return { update: mockLeadUpdate }
      if (table === 'activities') return { insert: mockActivityInsert }
      return {}
    })

    const lead = await updateLeadStatus('lead-1', 'qualified')
    expect(lead).toBeDefined()
    expect(lead.status).toBe('qualified')
  })

  test('assignLead assigns lead to user', async () => {
    const mockUserSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { tenant_id: 'tenant-1' },
          error: null,
        }),
      }),
    })

    const mockLeadUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'lead-1', assigned_to: 'user-2' },
            error: null,
          }),
        }),
      }),
    })

    const mockActivityInsert = jest.fn().mockResolvedValue({ error: null })

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'users') return { select: mockUserSelect }
      if (table === 'leads') return { update: mockLeadUpdate }
      if (table === 'activities') return { insert: mockActivityInsert }
      return {}
    })

    const lead = await assignLead('lead-1', 'user-2')
    expect(lead).toBeDefined()
    expect(lead.assigned_to).toBe('user-2')
  })
})