'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getUser } from './auth-helpers'

export interface TenantSettings {
  name: string
  slug: string
  timezone: string
  currency: string
}

export interface UserInviteResult {
  id: string
  tenant_id: string
  email: string
  full_name: string
  role: string
}

export interface IntegrationData {
  id: string
  type: 'aurora' | 'opensolar'
  isActive: boolean
  config: Record<string, any>
  createdAt: string
}

export async function updateTenantSettings(settings: Partial<TenantSettings>): Promise<TenantSettings> {
  const supabase = createServerClient()
  const user = await getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Get user's tenant and verify owner role
  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!userData?.tenant_id) {
    throw new Error('User not associated with a tenant')
  }

  if (userData.role !== 'owner') {
    throw new Error('Only owners can update tenant settings')
  }

  const { data, error } = await supabase
    .from('tenants')
    .update(settings)
    .eq('id', userData.tenant_id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as TenantSettings
}

export async function inviteUser(email: string, role: 'owner' | 'manager' | 'rep'): Promise<UserInviteResult> {
  const supabase = createServerClient()
  const user = await getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Get user's tenant and verify owner/manager role
  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!userData?.tenant_id) {
    throw new Error('User not associated with a tenant')
  }

  if (!['owner', 'manager'].includes(userData.role)) {
    throw new Error('Only owners and managers can invite users')
  }

  // Invite user via Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { tenant_id: userData.tenant_id, role },
  })

  if (authError) {
    throw new Error(authError.message)
  }

  // Create user record in users table
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      tenant_id: userData.tenant_id,
      email,
      full_name: email.split('@')[0], // Default name from email
      role,
    })
    .select()
    .single()

  if (error) {
    // Clean up auth user if user record creation fails
    await supabase.auth.admin.deleteUser(authData.user.id)
    throw new Error(error.message)
  }

  return data as UserInviteResult
}

export async function updateUserRole(userId: string, role: 'owner' | 'manager' | 'rep') {
  const supabase = createServerClient()
  const user = await getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Get user's tenant and verify owner role
  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!userData?.tenant_id) {
    throw new Error('User not associated with a tenant')
  }

  if (userData.role !== 'owner') {
    throw new Error('Only owners can update user roles')
  }

  // Verify target user belongs to same tenant
  const { data: targetUser } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', userId)
    .single()

  if (!targetUser || targetUser.tenant_id !== userData.tenant_id) {
    throw new Error('User not found in your tenant')
  }

  // Update user role in Supabase Auth metadata
  const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { role },
  })

  if (authError) {
    throw new Error(authError.message)
  }

  // Update user role in users table
  const { data, error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId)
    .eq('tenant_id', userData.tenant_id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function getIntegrations(): Promise<IntegrationData[]> {
  const supabase = createServerClient()
  const user = await getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Get user's tenant
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
    .select('*')
    .eq('tenant_id', userData.tenant_id)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map((i: any) => ({
    id: i.id,
    type: i.type,
    isActive: i.is_active,
    config: i.config,
    createdAt: i.created_at,
  }))
}

export async function updateIntegration(
  integrationId: string,
  config: { apiUrl?: string; apiKey?: string; webhookSecret?: string; isActive?: boolean }
) {
  const supabase = createServerClient()
  const user = await getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Get user's tenant and verify owner role
  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!userData?.tenant_id) {
    throw new Error('User not associated with a tenant')
  }

  if (userData.role !== 'owner') {
    throw new Error('Only owners can update integrations')
  }

  const updateData: Record<string, any> = {}
  if (config.apiUrl) updateData.config = { ...updateData.config, api_url: config.apiUrl }
  if (config.apiKey) updateData.config = { ...updateData.config, api_key: config.apiKey }
  if (config.webhookSecret) updateData.config = { ...updateData.config, webhook_secret: config.webhookSecret }
  if (config.isActive !== undefined) updateData.is_active = config.isActive

  const { data, error } = await supabase
    .from('integrations')
    .update(updateData)
    .eq('id', integrationId)
    .eq('tenant_id', userData.tenant_id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return {
    id: data.id,
    type: data.type,
    isActive: data.is_active,
    config: data.config,
    createdAt: data.created_at,
  }
}