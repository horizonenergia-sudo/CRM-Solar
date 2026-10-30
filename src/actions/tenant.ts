'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getUser } from './auth-helpers'

export async function createTenant(name: string, slug: string) {
  const supabase = createServerClient()
  const user = await getUser()

  if (!user) {
    return { tenant: null, error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('tenants')
    .insert({
      name,
      slug,
      settings: {},
    })
    .select()
    .single()

  if (error) {
    return { tenant: null, error: error.message }
  }

  // Update user to associate with tenant
  await supabase.from('users').upsert({
    id: user.id,
    tenant_id: data.id,
    email: user.email,
    role: 'owner',
  })

  return { tenant: data, error: null }
}

export async function getTenant() {
  const supabase = createServerClient()
  const user = await getUser()

  if (!user) {
    return { tenant: null, error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('users')
    .select('tenant_id, tenants(*)')
    .eq('id', user.id)
    .single()

  if (error || !data) {
    return { tenant: null, error: 'Tenant not found' }
  }

  return { tenant: data.tenants, error: null }
}

export async function updateTenant(updates: { name?: string; settings?: Record<string, unknown> }) {
  const supabase = createServerClient()
  const { tenant: currentTenant, error: tenantError } = await getTenant()

  if (tenantError || !currentTenant) {
    return { tenant: null, error: tenantError || 'Tenant not found' }
  }

  const { data, error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', currentTenant.id)
    .select()
    .single()

  if (error) {
    return { tenant: null, error: error.message }
  }

  return { tenant: data, error: null }
}