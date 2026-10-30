import { verifyAuroraSignature, verifyOpenSolarSignature, processAuroraWebhook, processOpenSolarWebhook } from '../integrations'
import * as crypto from 'crypto'

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

// Helper to generate HMAC signature using Node.js crypto
function generateHMAC(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

describe('Integration Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getUser as jest.Mock).mockResolvedValue({ id: 'user-1', email: 'test@example.com' })
  })

  test('verifyAuroraSignature validates correct HMAC', async () => {
    const payload = JSON.stringify({ design_id: '123', status: 'completed' })
    const secret = 'test-secret'
    const signature = generateHMAC(payload, secret)

    const result = await verifyAuroraSignature(payload, signature, secret)
    expect(result).toBe(true)
  })

  test('verifyAuroraSignature rejects invalid HMAC', async () => {
    const payload = JSON.stringify({ design_id: '123', status: 'completed' })
    const secret = 'test-secret'
    const invalidSignature = 'invalid-signature'

    const result = await verifyAuroraSignature(payload, invalidSignature, secret)
    expect(result).toBe(false)
  })

  test('verifyOpenSolarSignature validates correct HMAC', async () => {
    const payload = JSON.stringify({ design: { id: '456', status: 'done' } })
    const secret = 'opensolar-secret'
    const signature = generateHMAC(payload, secret)

    const result = await verifyOpenSolarSignature(payload, signature, secret)
    expect(result).toBe(true)
  })

  test('processAuroraWebhook creates design record on completion', async () => {
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
      }),
    })

    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'design-1',
            external_id: 'aurora-123',
            external_source: 'aurora',
            system_size_kw: 8.5,
          },
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({ select: mockSelect, insert: mockInsert })

    const payload = {
      design_id: 'aurora-123',
      status: 'completed',
      system_size_kw: 8.5,
      panel_count: 24,
      annual_production_kwh: 12000,
      layout_image_url: 'https://aurora.example.com/layout.png',
      shade_report: { total_shade: 0.05 },
    }

    const result = await processAuroraWebhook(payload, 'tenant-1', 'lead-1')
    expect(result).toBeDefined()
    expect(result.external_id).toBe('aurora-123')
    expect(result.external_source).toBe('aurora')
    expect(result.system_size_kw).toBe(8.5)
  })

  test('processOpenSolarWebhook creates design record on completion', async () => {
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
      }),
    })

    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'design-1',
            external_id: 'opensolar-456',
            external_source: 'opensolar',
            system_size_kw: 7.2,
          },
          error: null,
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({ select: mockSelect, insert: mockInsert })

    const payload = {
      design: {
        id: 'opensolar-456',
        status: 'done',
        system_size: 7.2,
        panels: 20,
        estimated_annual_kwh: 10500,
        layout_url: 'https://opensolar.example.com/layout.png',
        shade_analysis: { shading_factor: 0.08 },
      }
    }

    const result = await processOpenSolarWebhook(payload, 'tenant-1', 'lead-1')
    expect(result).toBeDefined()
    expect(result.external_id).toBe('opensolar-456')
    expect(result.external_source).toBe('opensolar')
    expect(result.system_size_kw).toBe(7.2)
  })
})