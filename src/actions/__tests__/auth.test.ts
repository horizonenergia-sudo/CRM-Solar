import { signUp, signIn, signOut, resendConfirmation } from '../auth'
import { createTenant, updateTenant, getTenant } from '../tenant'

// Mock Supabase server client
const mockSupabase = {
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    resend: jest.fn(),
    getUser: jest.fn(),
    getSession: jest.fn(),
  },
  from: jest.fn(),
}

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: () => mockSupabase,
}))

jest.mock('../auth-helpers', () => ({
  getUser: jest.fn(),
  getSession: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT')
  }),
}))

import { getUser } from '../auth-helpers'
import { redirect } from 'next/navigation'

describe('Auth Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('signUp creates user and tenant', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null,
    })

    const mockTenantInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'tenant-1', name: 'Test Solar', slug: 'test-solar' },
          error: null,
        }),
      }),
    })

    const mockUserInsert = jest.fn().mockResolvedValue({ error: null })

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'tenants') return { insert: mockTenantInsert }
      if (table === 'users') return { insert: mockUserInsert }
      return {}
    })

    const result = await signUp('test@example.com', 'password', 'Test Solar')
    expect(result.user).toBeDefined()
    expect(result.tenant).toBeDefined()
    expect(result.error).toBeNull()
  })

  test('signIn authenticates user', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null,
    })

    const result = await signIn('test@example.com', 'password')
    expect(result.user).toBeDefined()
    expect(result.error).toBeNull()
  })

  test('signOut signs out user and redirects', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: null })

    await expect(signOut()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/login')
  })

  test('resendConfirmation sends confirmation email', async () => {
    mockSupabase.auth.resend.mockResolvedValue({ error: null })

    const result = await resendConfirmation('test@example.com')
    expect(result.error).toBeNull()
  })
})

describe('Tenant Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('createTenant creates new tenant', async () => {
    ;(getUser as jest.Mock).mockResolvedValue({ id: 'user-1', email: 'test@example.com' })

    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'tenant-1', name: 'Test Solar', slug: 'test-solar' },
          error: null,
        }),
      }),
    })
    const mockUpsert = jest.fn().mockResolvedValue({ error: null })

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'tenants') return { insert: mockInsert }
      if (table === 'users') return { upsert: mockUpsert }
      return {}
    })

    const result = await createTenant('Test Solar', 'test-solar')
    expect(result.tenant).toBeDefined()
    expect(result.tenant.name).toBe('Test Solar')
    expect(result.tenant.slug).toBe('test-solar')
    expect(result.error).toBeNull()
  })

  test('getTenant returns current tenant', async () => {
    ;(getUser as jest.Mock).mockResolvedValue({ id: 'user-1', email: 'test@example.com' })

    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            tenant_id: 'tenant-1',
            tenants: { id: 'tenant-1', name: 'Test Solar', slug: 'test-solar' },
          },
          error: null,
        }),
      }),
    })
    mockSupabase.from.mockReturnValue({ select: mockSelect })

    const result = await getTenant()
    expect(result.tenant).toBeDefined()
    expect(result.error).toBeNull()
  })

  test('updateTenant updates tenant settings', async () => {
    ;(getUser as jest.Mock).mockResolvedValue({ id: 'user-1', email: 'test@example.com' })

    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { tenant_id: 'tenant-1', tenants: { id: 'tenant-1', name: 'Test Solar', slug: 'test-solar' } },
          error: null,
        }),
      }),
    })

    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'tenant-1', name: 'Updated Solar', slug: 'test-solar' },
            error: null,
          }),
        }),
      }),
    })

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'users') return { select: mockSelect }
      if (table === 'tenants') return { update: mockUpdate }
      return {}
    })

    const result = await updateTenant({ name: 'Updated Solar' })
    expect(result.tenant).toBeDefined()
    expect(result.tenant.name).toBe('Updated Solar')
    expect(result.error).toBeNull()
  })
})