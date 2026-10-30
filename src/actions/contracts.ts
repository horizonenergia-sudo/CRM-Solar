'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getUser } from './auth-helpers'

export async function getContracts(filters: { status?: string; leadId?: string } = {}) {
  const supabase = createServerClient()

  let query = supabase
    .from('contracts')
    .select(`
      *,
      lead:leads(id, first_name, last_name, email, phone, address),
      proposal:proposals(id, total_price_cents, design_id)
    `)
    .order('created_at', { ascending: false })

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.leadId) {
    query = query.eq('lead_id', filters.leadId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function updateContractStatus(contractId: string, status: 'active' | 'installing' | 'completed' | 'cancelled') {
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

  const updateData: Record<string, any> = { status }

  // Auto-set installation_scheduled_at when moving to installing
  if (status === 'installing') {
    updateData.installation_scheduled_at = new Date().toISOString()
  }

  // Auto-set completion date when moving to completed
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('contracts')
    .update(updateData)
    .eq('id', contractId)
    .eq('tenant_id', userData.tenant_id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function scheduleInstallation(contractId: string, scheduledAt: string) {
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
    .from('contracts')
    .update({
      status: 'installing',
      installation_scheduled_at: scheduledAt,
    })
    .eq('id', contractId)
    .eq('tenant_id', userData.tenant_id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function recordDepositPayment(contractId: string, amountCents: number) {
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

  // Get contract to verify deposit amount
  const { data: contract } = await supabase
    .from('contracts')
    .select('deposit_amount_cents')
    .eq('id', contractId)
    .eq('tenant_id', userData.tenant_id)
    .single()

  if (!contract) {
    throw new Error('Contract not found')
  }

  const { data, error } = await supabase
    .from('contracts')
    .update({
      deposit_paid_at: new Date().toISOString(),
      deposit_amount_cents: amountCents,
    })
    .eq('id', contractId)
    .eq('tenant_id', userData.tenant_id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function getContractById(contractId: string) {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('contracts')
    .select(`
      *,
      lead:leads(id, first_name, last_name, email, phone, address),
      proposal:proposals(id, total_price_cents, design_id, financing_options)
    `)
    .eq('id', contractId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}