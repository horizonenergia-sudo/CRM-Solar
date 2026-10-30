import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-opensolar-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface OpenSolarPayload {
  design: {
    id: string
    status: string
    system_size?: number
    panels?: number
    estimated_annual_kwh?: number
    layout_url?: string
    shade_analysis?: Record<string, unknown>
  }
  lead_id?: string
}

async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )
  const signatureBytes = new Uint8Array(
    signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  )
  return await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(payload))
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // Get signature from header
    const signature = req.headers.get('x-opensolar-signature')
    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get raw body for signature verification
    const body = await req.text()

    // Get webhook secret from environment
    const webhookSecret = Deno.env.get('OPENSOLAR_WEBHOOK_SECRET')
    if (!webhookSecret) {
      console.error('OPENSOLAR_WEBHOOK_SECRET not configured')
      return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify signature
    const isValid = await verifySignature(body, signature, webhookSecret)
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse payload
    const payload: OpenSolarPayload = JSON.parse(body)
    const designInfo = payload.design

    // Validate required fields
    if (!designInfo?.id || !designInfo?.status) {
      return new Response(JSON.stringify({ error: 'Missing required design fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create Supabase client with service role for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Find tenant and lead from design_id (stored in designs table)
    // First, check if design already exists (idempotency)
    const { data: existingDesign } = await supabase
      .from('designs')
      .select('id, tenant_id, lead_id')
      .eq('external_id', designInfo.id)
      .eq('external_source', 'opensolar')
      .single()

    let tenantId: string
    let leadId: string

    if (existingDesign) {
      tenantId = existingDesign.tenant_id
      leadId = existingDesign.lead_id
    } else {
      // If design doesn't exist, we need to find the lead from the payload
      if (!payload.lead_id) {
        return new Response(JSON.stringify({ error: 'lead_id required for new designs' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Get tenant from lead
      const { data: lead } = await supabase
        .from('leads')
        .select('tenant_id')
        .eq('id', payload.lead_id)
        .single()

      if (!lead) {
        return new Response(JSON.stringify({ error: 'Lead not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application.json' },
        })
      }

      tenantId = lead.tenant_id
      leadId = payload.lead_id
    }

    // Upsert design record
    const designData = {
      tenant_id: tenantId,
      lead_id: leadId,
      external_id: designInfo.id,
      external_source: 'opensolar',
      name: `OpenSolar Design ${designInfo.id}`,
      system_size_kw: designInfo.system_size,
      panel_count: designInfo.panels,
      annual_production_kwh: designInfo.estimated_annual_kwh,
      layout_image_url: designInfo.layout_url,
      shade_report: designInfo.shade_analysis,
      status: designInfo.status === 'done' ? 'approved' : 'draft',
    }

    const { data: design, error } = await supabase
      .from('designs')
      .upsert(designData, {
        onConflict: 'tenant_id,external_id,external_source',
      })
      .select()
      .single()

    if (error) {
      console.error('Error upserting design:', error)
      return new Response(JSON.stringify({ error: 'Failed to save design' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Log audit
    await supabase.from('audit_log').insert({
      tenant_id: tenantId,
      table_name: 'designs',
      record_id: design.id,
      action: existingDesign ? 'update' : 'insert',
      new_data: designData,
    })

    return new Response(JSON.stringify({ success: true, design_id: design.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})