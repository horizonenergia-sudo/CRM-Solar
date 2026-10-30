'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getUser } from './auth-helpers'

export interface DashboardMetrics {
  totalLeads: number
  qualifiedLeads: number
  proposalsSent: number
  proposalsSigned: number
  conversionRate: number
  totalRevenueCents: number
  avgCycleDays: number
}

export interface PipelineStageData {
  stage: string
  count: number
  valueCents: number
}

export interface RepPerformanceData {
  userId: string
  fullName: string
  leadsCount: number
  proposalsSent: number
  dealsWon: number
  revenueCents: number
  conversionRate: number
}

export async function getMetrics(dateRange?: { startDate: string; endDate: string }): Promise<DashboardMetrics> {
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

  const { data, error } = await supabase.rpc('get_dashboard_metrics', {
    p_tenant_id: userData.tenant_id,
    p_start_date: dateRange?.startDate || null,
    p_end_date: dateRange?.endDate || null,
  })

  if (error) {
    throw new Error(error.message)
  }

  const d = data?.[0] || {}
  const qualifiedLeads = d.qualified_leads || 0
  const proposalsSigned = d.proposals_signed || 0
  const conversionRate = qualifiedLeads > 0 ? (proposalsSigned / qualifiedLeads) * 100 : 0

  return {
    totalLeads: d.total_leads || 0,
    qualifiedLeads,
    proposalsSent: d.proposals_sent || 0,
    proposalsSigned,
    conversionRate: Math.round(conversionRate * 100) / 100,
    totalRevenueCents: d.total_revenue_cents || 0,
    avgCycleDays: d.avg_cycle_days || 0,
  }
}

export async function getPipelineData(): Promise<PipelineStageData[]> {
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

  const { data, error } = await supabase.rpc('get_pipeline_data', {
    p_tenant_id: userData.tenant_id,
  })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map((d: any) => ({
    stage: d.stage,
    count: d.count || 0,
    valueCents: d.value_cents || 0,
  }))
}

export async function getRepPerformance(): Promise<RepPerformanceData[]> {
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

  const { data, error } = await supabase.rpc('get_rep_performance', {
    p_tenant_id: userData.tenant_id,
  })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map((d: any) => ({
    userId: d.user_id,
    fullName: d.full_name,
    leadsCount: d.leads_count || 0,
    proposalsSent: d.proposals_sent || 0,
    dealsWon: d.deals_won || 0,
    revenueCents: d.revenue_cents || 0,
    conversionRate: d.conversion_rate || 0,
  }))
}