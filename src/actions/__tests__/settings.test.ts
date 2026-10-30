import { updateTenantSettings, inviteUser, updateUserRole, getIntegrations, updateIntegration } from '../settings'

// Mock Supabase server client
const mockSupabase = {
  from: jest.fn(),
  auth: {
    admin: {
      inviteUserByEmail: jest.fn(),
      updateUserById: jest.fn(),
    },
  },
}

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: () => mockSupabase,
}))

jest.mock('../auth-helpers', () => ({
  getUser: jest.fn(),
}))

import { getUser } from '../auth-helpers'

describe('Settings Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getUser as jest.Mock).mockResolvedValue({ id: 'user-1', email: 'owner@example.com' })
  })

  test('updateTenantSettings updates tenant general settings', async () => {
    const mockUserSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { tenant_id: 'tenant-1', role: 'owner' },
          error: null,
        }),
      }),
    })

    const mockUpdateSelect = jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: { id: 'tenant-1', name: 'Updated Solar Co', slug: 'updated-solar', timezone: 'America/Sao_Paulo', currency: 'BRL' },
        error: null,
      }),
    })

    const mockUpdateEq = jest.fn().mockReturnValue({ select: mockUpdateSelect })
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq })

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'users') return { select: mockUserSelect }
      if (table === 'tenants') return { update: mockUpdate }
      return {}
    })

    const result = await updateTenantSettings({
      name: 'Updated Solar Co',
      slug: 'updated-solar',
      timezone: 'America/Sao_Paulo',
      currency: 'BRL',
    })

    expect(result).toBeDefined()
    expect(result.name).toBe('Updated Solar Co')
    expect(result.slug).toBe('updated-solar')
    expect(result.timezone).toBe('America/Sao_Paulo')
    expect(result.currency).toBe('BRL')
  })

  test('inviteUser sends invitation to new user', async () => {
    const mockUserSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { tenant_id: 'tenant-1', role: 'owner' },
          error: null,
        }),
      }),
    })

    mockSupabase.auth.admin.inviteUserByEmail.mockResolvedValue({
      data: { user: { id: 'new-user-id', email: 'newrep@example.com' } },
      error: null,
    })

    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'new-user-id', tenant_id: 'tenant-1', email: 'newrep@example.com', full_name: 'New Rep', role: 'rep' },
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'users') return { select: mockUserSelect, insert: mockInsert }
      return {}
    })

    const result = await inviteUser('newrep@example.com', 'rep')

    expect(result).toBeDefined()
    expect(result.email).toBe('newrep@example.com')
    expect(result.role).toBe('rep')
    expect(mockSupabase.auth.admin.inviteUserByEmail).toHaveBeenCalledWith('newrep@example.com', {
      data: { tenant_id: 'tenant-1', role: 'rep' },
    })
  })

  test('updateUserRole updates user role', async () => {
    const mockUserSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { tenant_id: 'tenant-1', role: 'owner' },
          error: null,
        }),
      }),
    })

    mockSupabase.auth.admin.updateUserById.mockResolvedValue({
      data: { user: { id: 'user-2', role: 'manager' } },
      error: null,
    })

    const mockUpdateSelect = jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: { id: 'user-2', tenant_id: 'tenant-1', role: 'manager' },
        error: null,
      }),
    })

    const mockUpdateEq2 = jest.fn().mockReturnValue({ select: mockUpdateSelect })
    const mockUpdateEq1 = jest.fn().mockReturnValue({ eq: mockUpdateEq2 })
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq1 })

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'users') return { select: mockUserSelect, update: mockUpdate }
      return {}
    })

    const result = await updateUserRole('user-2', 'manager')

    expect(result).toBeDefined()
    expect(result.role).toBe('manager')
    expect(mockSupabase.auth.admin.updateUserById).toHaveBeenCalledWith('user-2', { user_metadata: { role: 'manager' } })
  })

  test('getIntegrations returns integrations for tenant', async () => {
    const mockUserSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { tenant_id: 'tenant-1', role: 'owner' },
          error: null,
        }),
      }),
    })

    const mockIntegrationsOrder = jest.fn().mockResolvedValue({
      data: [
        { id: 'int-1', type: 'aurora', is_active: true, config: { api_url: 'https://api.aurora.com' }, created_at: '2026-01-01' },
        { id: 'int-2', type: 'opensolar', is_active: false, config: {}, created_at: '2026-01-02' },
      ],
      error: null,
    })

    const mockIntegrationsEq = jest.fn().mockReturnValue({ order: mockIntegrationsOrder })
    const mockIntegrationsSelect = jest.fn().mockReturnValue({ eq: mockIntegrationsEq })

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'users') return { select: mockUserSelect }
      if (table === 'integrations') return { select: mockIntegrationsSelect }
      return {}
    })

    const integrations = await getIntegrations()

    expect(integrations).toHaveLength(2)
    expect(integrations[0].type).toBe('aurora')
    expect(integrations[0].isActive).toBe(true)
    expect(integrations[1].type).toBe('opensolar')
  })

  test('updateIntegration updates integration config', async () => {
    const mockUserSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { tenant_id: 'tenant-1', role: 'owner' },
          error: null,
        }),
      }),
    })

    const mockUpdateSelect = jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: { id: 'int-1', type: 'aurora', is_active: true, config: { api_url: 'https://new-api.aurora.com', api_key: 'encrypted-key' } },
        error: null,
      }),
    })

    const mockUpdateEq2 = jest.fn().mockReturnValue({ select: mockUpdateSelect })
    const mockUpdateEq1 = jest.fn().mockReturnValue({ eq: mockUpdateEq2 })
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq1 })

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'users') return { select: mockUserSelect }
      if (table === 'integrations') return { update: mockUpdate }
      return {}
    })

    const result = await updateIntegration('int-1', { apiUrl: 'https://new-api.aurora.com', apiKey: 'new-key' })

    expect(result).toBeDefined()
    expect(result.config.api_url).toBe('https://new-api.aurora.com')
  })
})