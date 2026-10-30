'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getUser } from './auth-helpers'

export async function getLeads(filters?: { status?: string; assignedTo?: string; search?: string }) {
  const supabase = createServerClient()
  const user = await getUser()

  if (!user) {
    return []
  }

  let query = supabase.from('leads').select('*')

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo)
  }

  if (filters?.search) {
    query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function createLead(input: {
  first_name: string
  last_name: string
  email?: string
  phone?: string
  source?: string
  address?: Record<string, unknown>
  utility_provider?: string
  avg_monthly_bill?: number
  roof_type?: string
  shading_notes?: string
  notes?: string
  assigned_to?: string
}) {
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
    .from('leads')
    .insert({
      ...input,
      tenant_id: userData.tenant_id,
      assigned_to: input.assigned_to || user.id,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  // Log activity
  await supabase.from('activities').insert({
    tenant_id: userData.tenant_id,
    lead_id: data.id,
    user_id: user.id,
    type: 'status_change',
    subject: 'Lead created',
    body: `Lead created with status: ${data.status}`,
  })

  return data
}

export async function updateLead(id: string, input: Partial<{
  first_name: string
  last_name: string
  email: string
  phone: string
  source: string
  address: Record<string, unknown>
  utility_provider: string
  avg_monthly_bill: number
  roof_type: string
  shading_notes: string
  notes: string
  assigned_to: string
}>) {
  const supabase = createServerClient()
  const user = await getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('leads')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function updateLeadStatus(id: string, status: string) {
  const supabase = createServerClient()
  const user = await getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const validStatuses = ['new', 'contacted', 'qualified', 'survey_scheduled', 'proposal_sent', 'won', 'lost']
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status')
  }

  const { data, error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  // Log activity
  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (userData?.tenant_id) {
    await supabase.from('activities').insert({
      tenant_id: userData.tenant_id,
      lead_id: id,
      user_id: user.id,
      type: 'status_change',
      subject: `Status changed to ${status}`,
      body: `Lead status updated to: ${status}`,
    })
  }

  return data
}

export async function assignLead(id: string, userId: string) {
  const supabase = createServerClient()
  const user = await getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('leads')
    .update({ assigned_to: userId })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  // Log activity
  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (userData?.tenant_id) {
    await supabase.from('activities').insert({
      tenant_id: userData.tenant_id,
      lead_id: id,
      user_id: user.id,
      type: 'status_change',
      subject: 'Lead assigned',
      body: `Lead assigned to user: ${userId}`,
    })
  }

  return data
}