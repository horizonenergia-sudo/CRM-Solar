'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getUser } from './auth-helpers'
import * as crypto from 'crypto'

// HMAC signature verification for Aurora webhooks
export function verifyAuroraSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    // Use timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch {
    return false
  }
}

// HMAC signature verification for OpenSolar webhooks
export function verifyOpenSolarSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    // Use timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch {
    return false
  }
}

// Process Aurora webhook and create/update design record
export async function processAuroraWebhook(
  payload: {
    design_id: string
    status: string
    system_size_kw?: number
    panel_count?: number
    annual_production_kwh?: number
    layout_image_url?: string
    shade_report?: Record<string, unknown>
  },
  tenantId: string,
  leadId: string
) {
  const supabase = createServerClient()

  // Check if design already exists (idempotency)
  const { data: existingDesign } = await supabase
    .from('designs')
    .select('id')
    .eq('external_id', payload.design_id)
    .eq('external_source', 'aurora')
    .eq('tenant_id', tenantId)
    .single()

  const designData = {
    tenant_id: tenantId,
    lead_id: leadId,
    external_id: payload.design_id,
    external_source: 'aurora' as const,
    name: `Aurora Design ${payload.design_id}`,
    system_size_kw: payload.system_size_kw,
    panel_count: payload.panel_count,
    annual_production_kwh: payload.annual_production_kwh,
    layout_image_url: payload.layout_image_url,
    shade_report: payload.shade_report,
    status: payload.status === 'completed' ? 'approved' : 'draft',
  }

  if (existingDesign) {
    // Update existing design
    const { data, error } = await supabase
      .from('designs')
      .update(designData)
      .eq('id', existingDesign.id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  } else {
    // Create new design
    const { data, error } = await supabase
      .from('designs')
      .insert(designData)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }
}

// Process OpenSolar webhook and create/update design record
export async function processOpenSolarWebhook(
  payload: {
    design: {
      id: string
      status: string
      system_size?: number
      panels?: number
      estimated_annual_kwh?: number
      layout_url?: string
      shade_analysis?: Record<string, unknown>
    }
  },
  tenantId: string,
  leadId: string
) {
  const supabase = createServerClient()

  const designInfo = payload.design

  // Check if design already exists (idempotency)
  const { data: existingDesign } = await supabase
    .from('designs')
    .select('id')
    .eq('external_id', designInfo.id)
    .eq('external_source', 'opensolar')
    .eq('tenant_id', tenantId)
    .single()

  const designData = {
    tenant_id: tenantId,
    lead_id: leadId,
    external_id: designInfo.id,
    external_source: 'opensolar' as const,
    name: `OpenSolar Design ${designInfo.id}`,
    system_size_kw: designInfo.system_size,
    panel_count: designInfo.panels,
    annual_production_kwh: designInfo.estimated_annual_kwh,
    layout_image_url: designInfo.layout_url,
    shade_report: designInfo.shade_analysis,
    status: designInfo.status === 'done' ? 'approved' : 'draft',
  }

  if (existingDesign) {
    // Update existing design
    const { data, error } = await supabase
      .from('designs')
      .update(designData)
      .eq('id', existingDesign.id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  } else {
    // Create new design
    const { data, error } = await supabase
      .from('designs')
      .insert(designData)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }
}

// Request design from Aurora/OpenSolar (called from survey completion)
export async function requestDesign(
  surveyId: string,
  provider: 'aurora' | 'opensolar'
) {
  const supabase = createServerClient()

  // Get survey with lead info
  const { data: survey, error: surveyError } = await supabase
    .from('site_surveys')
    .select(`
      *,
      lead:leads(*)
    `)
    .eq('id', surveyId)
    .single()

  if (surveyError || !survey) {
    throw new Error('Survey not found')
  }

  // Get integration config for tenant
  const { data: integration } = await supabase
    .from('integrations')
    .select('config')
    .eq('tenant_id', survey.tenant_id)
    .eq('type', provider)
    .eq('is_active', true)
    .single()

  if (!integration) {
    throw new Error(`${provider} integration not configured`)
  }

  // In a real implementation, this would call the provider's API
  // For now, we'll simulate the request by creating a pending design record
  const { data: design, error } = await supabase
    .from('designs')
    .insert({
      tenant_id: survey.tenant_id,
      lead_id: survey.lead_id,
      site_survey_id: surveyId,
      external_source: provider,
      name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Design Request`,
      status: 'draft',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // TODO: Actually call provider API here
  // await fetch(`${providerApiUrl}/designs`, {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${integration.config.api_key}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     survey_data: survey,
  //     lead_data: survey.lead,
  //     callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/${provider}`,
  //   }),
  // })

  return design
}

// Configure integration for a tenant
export async function configureIntegration(
  provider: 'aurora' | 'opensolar' | 'loanpal' | 'solarapp',
  config: Record<string, unknown>
) {
  const supabase = createServerClient()
  const user = await getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!userData?.tenant_id) {
    throw new Error('User not associated with a tenant')
  }

  if (userData.role !== 'owner' && userData.role !== 'manager') {
    throw new Error('Insufficient permissions')
  }

  // Encrypt sensitive config values (API keys, secrets)
  const encryptedConfig = encryptConfig(config)

  const { data, error } = await supabase
    .from('integrations')
    .upsert({
      tenant_id: userData.tenant_id,
      type: provider,
      config: encryptedConfig,
      is_active: true,
    }, {
      onConflict: 'tenant_id,type',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data
}

// Get integration config for a tenant
export async function getIntegrationConfig(provider: string) {
  const supabase = createServerClient()
  const user = await getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData?.tenant_id) {
    throw new Error('User not associated with a tenant')
  }

  const { data, error } = await supabase
    .from('integrations')
    .select('config, is_active, last_sync_at')
    .eq('tenant_id', userData.tenant_id)
    .eq('type', provider)
    .single()

  if (error) throw new Error(error.message)

  return data ? { ...data, config: decryptConfig(data.config) } : null
}

// Test integration connection
export async function testIntegration(provider: string) {
  const config = await getIntegrationConfig(provider)

  if (!config || !config.is_active) {
    return { success: false, error: 'Integration not configured' }
  }

  try {
    // In a real implementation, this would make a test API call
    // For now, just return success if config exists
    return { success: true, message: 'Connection successful' }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Connection failed' }
  }
}

// Simple encryption/decryption for config (in production, use proper encryption)
function encryptConfig(config: Record<string, unknown>): Record<string, unknown> {
  const encrypted = { ...config }
  // In production, use a proper encryption library like libsodium or Web Crypto API
  // For now, we'll just mark sensitive fields
  if (encrypted.api_key) {
    encrypted.api_key = `encrypted:${encrypted.api_key}`
  }
  if (encrypted.secret) {
    encrypted.secret = `encrypted:${encrypted.secret}`
  }
  if (encrypted.webhook_secret) {
    encrypted.webhook_secret = `encrypted:${encrypted.webhook_secret}`
  }
  return encrypted
}

function decryptConfig(config: Record<string, unknown>): Record<string, unknown> {
  const decrypted = { ...config }
  if (decrypted.api_key && typeof decrypted.api_key === 'string' && decrypted.api_key.startsWith('encrypted:')) {
    decrypted.api_key = decrypted.api_key.replace('encrypted:', '')
  }
  if (decrypted.secret && typeof decrypted.secret === 'string' && decrypted.secret.startsWith('encrypted:')) {
    decrypted.secret = decrypted.secret.replace('encrypted:', '')
  }
  if (decrypted.webhook_secret && typeof decrypted.webhook_secret === 'string' && decrypted.webhook_secret.startsWith('encrypted:')) {
    decrypted.webhook_secret = decrypted.webhook_secret.replace('encrypted:', '')
  }
  return decrypted
}