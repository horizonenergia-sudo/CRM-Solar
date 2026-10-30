'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getUser } from './auth-helpers'

function generateToken(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export async function createProposal(
  leadId: string,
  designId: string,
  pricing: {
    system_price_cents: number
    financing_options?: Array<{ type: string; apr: number; term_months: number }>
    deposit_percent?: number
  }
) {
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

  // Get design to validate it belongs to the same tenant and lead
  const { data: design, error: designError } = await supabase
    .from('designs')
    .select('*')
    .eq('id', designId)
    .eq('tenant_id', userData.tenant_id)
    .single()

  if (designError || !design) {
    throw new Error('Design not found')
  }

  // Get lead for pricing context
  const { data: lead } = await supabase
    .from('leads')
    .select('avg_monthly_bill')
    .eq('id', leadId)
    .eq('tenant_id', userData.tenant_id)
    .single()

  // Calculate total price (simplified - in real app would be more complex)
  const financingCost = pricing.financing_options?.reduce((sum, opt) => {
    const monthlyRate = opt.apr / 100 / 12
    const payment = (pricing.system_price_cents * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -opt.term_months))
    return sum + (payment * opt.term_months - pricing.system_price_cents)
  }, 0) || 0

  const totalPriceCents = Math.round(pricing.system_price_cents + financingCost)

  const token = generateToken()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

  const { data, error } = await supabase
    .from('proposals')
    .insert({
      tenant_id: userData.tenant_id,
      lead_id: leadId,
      design_id: designId,
      version: 1,
      status: 'draft',
      total_price_cents: totalPriceCents,
      financing_options: pricing.financing_options || [],
      deposit_percent: pricing.deposit_percent || 10,
      expires_at: expiresAt.toISOString(),
      token,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function sendProposal(proposalId: string) {
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

  const token = generateToken()

  const { data, error } = await supabase
    .from('proposals')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      token,
    })
    .eq('id', proposalId)
    .eq('tenant_id', userData.tenant_id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  // TODO: Send email notification to lead with proposal link
  // await sendProposalEmail(data.lead_id, data.token)

  return data
}

export async function signProposal(token: string, signature: string) {
  const supabase = createServerClient()

  // Get proposal by token
  const { data: proposal, error: selectError } = await supabase
    .from('proposals')
    .select('*')
    .eq('token', token)
    .single()

  if (selectError || !proposal) {
    throw new Error('Proposal not found')
  }

  // Check if proposal is expired
  if (proposal.expires_at && new Date(proposal.expires_at) < new Date()) {
    throw new Error('Proposal has expired')
  }

  // Check if proposal is in a signable state
  if (proposal.status !== 'sent' && proposal.status !== 'viewed') {
    throw new Error('Proposal cannot be signed in current state')
  }

  const { data, error } = await supabase
    .from('proposals')
    .update({
      status: 'signed',
      signed_at: new Date().toISOString(),
      signature_data: signature,
    })
    .eq('id', proposal.id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  // Create contract record
  const contractNumber = `CTR-${Date.now().toString(36).toUpperCase()}`
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .insert({
      tenant_id: proposal.tenant_id,
      proposal_id: proposal.id,
      lead_id: proposal.lead_id,
      contract_number: contractNumber,
      deposit_amount_cents: Math.round(proposal.total_price_cents * (proposal.deposit_percent || 10) / 100),
      status: 'active',
    })
    .select()
    .single()

  if (contractError) {
    console.error('Failed to create contract:', contractError)
    // Don't throw - proposal is signed, contract creation can be retried
  }

  // Notify sales rep via realtime
  // TODO: Implement realtime notification

  return data
}

export async function getProposalByToken(token: string) {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('proposals')
    .select(`
      *,
      lead:leads(id, first_name, last_name, email, phone, address),
      design:designs(id, system_size_kw, panel_count, annual_production_kwh, layout_image_url, shade_report)
    `)
    .eq('token', token)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  // Track view if not already viewed
  if (data.status === 'sent') {
    await supabase
      .from('proposals')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', data.id)
  }

  return data
}

export async function getProposals(leadId: string) {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function getProposalById(proposalId: string) {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('proposals')
    .select(`
      *,
      lead:leads(id, first_name, last_name, email, phone, address),
      design:designs(id, system_size_kw, panel_count, annual_production_kwh, layout_image_url, shade_report)
    `)
    .eq('id', proposalId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}