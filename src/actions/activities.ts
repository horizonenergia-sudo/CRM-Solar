'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getUser } from './auth-helpers'

export async function logActivity(
  leadId: string,
  type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'status_change',
  subject: string,
  body: string,
  metadata: Record<string, unknown> = {}
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
    .from('activities')
    .insert({
      tenant_id: userData.tenant_id,
      lead_id: leadId,
      user_id: user.id,
      type,
      subject,
      body,
      metadata,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function getActivities(leadId: string) {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      user:users!activities_user_id_fkey(full_name, avatar_url)
    `)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}