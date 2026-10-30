'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getUser } from './auth-helpers'

export async function getDesigns(leadId: string) {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('designs')
    .select('*')
    .eq('lead_id', leadId)
    .order('version', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function requestRevision(designId: string, notes: string) {
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

  // Get the original design
  const { data: originalDesign, error: designError } = await supabase
    .from('designs')
    .select('*')
    .eq('id', designId)
    .eq('tenant_id', userData.tenant_id)
    .single()

  if (designError || !originalDesign) {
    throw new Error('Design not found')
  }

  // Create a new revision
  const revisionData = {
    ...originalDesign,
    id: undefined, // Let database generate new UUID
    name: `${originalDesign.name} (Revision)`,
    version: originalDesign.version + 1,
    status: 'draft',
    revision_notes: notes,
    parent_design_id: originalDesign.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // Remove fields that shouldn't be copied
  delete revisionData.id
  delete revisionData.created_at
  delete revisionData.updated_at

  const { data, error } = await supabase
    .from('designs')
    .insert(revisionData)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  // Also update the original design status if it was approved
  if (originalDesign.status === 'approved') {
    await supabase
      .from('designs')
      .update({ status: 'revision_requested' })
      .eq('id', designId)
  }

  return data
}

export async function approveDesign(designId: string) {
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
    .from('designs')
    .update({
      status: 'approved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', designId)
    .eq('tenant_id', userData.tenant_id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function getDesignById(designId: string) {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('designs')
    .select(`
      *,
      lead:leads(id, first_name, last_name, email, phone, address),
      site_survey:site_surveys(id, roof_photos, measurements, notes)
    `)
    .eq('id', designId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function compareDesigns(designId1: string, designId2: string) {
  const supabase = createServerClient()

  const [design1, design2] = await Promise.all([
    getDesignById(designId1),
    getDesignById(designId2),
  ])

  // Compare key specifications
  const comparison = {
    system_size_kw: { design1: design1.system_size_kw, design2: design2.system_size_kw },
    panel_count: { design1: design1.panel_count, design2: design2.panel_count },
    inverter_type: { design1: design1.inverter_type, design2: design2.inverter_type },
    battery_count: { design1: design1.battery_count, design2: design2.battery_count },
    annual_production_kwh: { design1: design1.annual_production_kwh, design2: design2.annual_production_kwh },
    status: { design1: design1.status, design2: design2.status },
    version: { design1: design1.version, design2: design2.version },
  }

  return { design1, design2, comparison }
}