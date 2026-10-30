'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getUser } from './auth-helpers'

export async function createSurvey(
  leadId: string,
  scheduledAt: string,
  surveyorId: string
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

  const { data, error } = await supabase
    .from('site_surveys')
    .insert({
      tenant_id: userData.tenant_id,
      lead_id: leadId,
      surveyor_id: surveyorId,
      scheduled_at: scheduledAt,
      status: 'scheduled',
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function completeSurvey(
  surveyId: string,
  data: {
    roof_photos?: string[]
    measurements?: Record<string, unknown>
    notes?: string
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

  const { data: survey, error } = await supabase
    .from('site_surveys')
    .update({
      status: 'completed',
      roof_photos: data.roof_photos || [],
      measurements: data.measurements || {},
      notes: data.notes || '',
      completed_at: new Date().toISOString(),
    })
    .eq('id', surveyId)
    .eq('tenant_id', userData.tenant_id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return survey
}

export async function getSurveyByToken(token: string) {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('site_surveys')
    .select(`
      *,
      lead:leads(id, first_name, last_name, email, phone, address)
    `)
    .eq('token', token)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}