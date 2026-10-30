import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface DesignRequestPayload {
  survey_id: string
  provider: 'aurora' | 'opensolar'
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
    const { survey_id, provider }: DesignRequestPayload = await req.json()

    if (!survey_id || !provider) {
      return new Response(JSON.stringify({ error: 'survey_id and provider required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['aurora', 'opensolar'].includes(provider)) {
      return new Response(JSON.stringify({ error: 'Invalid provider' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get survey with lead info
    const { data: survey, error: surveyError } = await supabase
      .from('site_surveys')
      .select(`
        *,
        lead:leads(*)
      `)
      .eq('id', survey_id)
      .single()

    if (surveyError || !survey) {
      return new Response(JSON.stringify({ error: 'Survey not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get integration config for tenant
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('config')
      .eq('tenant_id', survey.tenant_id)
      .eq('type', provider)
      .eq('is_active', true)
      .single()

    if (integrationError || !integration) {
      return new Response(JSON.stringify({ error: `${provider} integration not configured` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const config = integration.config
    const apiKey = config.api_key?.replace('encrypted:', '') || config.apiKey
    const baseUrl = config.base_url || config.baseUrl || (provider === 'aurora' ? 'https://api.aurorasolar.com' : 'https://api.opensolar.com')
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/${provider}-webhook`

    // Create a pending design record first
    const { data: design, error: designError } = await supabase
      .from('designs')
      .insert({
        tenant_id: survey.tenant_id,
        lead_id: survey.lead_id,
        site_survey_id: survey_id,
        external_source: provider,
        name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Design Request`,
        status: 'draft',
      })
      .select()
      .single()

    if (designError) {
      return new Response(JSON.stringify({ error: 'Failed to create design record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Prepare request payload for provider API
    const providerPayload = {
      external_id: design.id,
      survey_data: {
        roof_photos: survey.roof_photos,
        electrical_panel_photos: survey.electrical_panel_photos,
        measurements: survey.measurements,
        notes: survey.notes,
        address: survey.lead?.address,
      },
      lead_data: {
        first_name: survey.lead?.first_name,
        last_name: survey.lead?.last_name,
        email: survey.lead?.email,
        phone: survey.lead?.phone,
        avg_monthly_bill: survey.lead?.avg_monthly_bill,
        utility_provider: survey.lead?.utility_provider,
      },
      callback_url: webhookUrl,
    }

    // Call provider API
    try {
      const response = await fetch(`${baseUrl}/v1/designs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-Webhook-Secret': Deno.env.get(`${provider.toUpperCase()}_WEBHOOK_SECRET`) || '',
        },
        body: JSON.stringify(providerPayload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`${provider} API error:`, errorText)

        // Update design status to failed
        await supabase
          .from('designs')
          .update({ status: 'rejected' })
          .eq('id', design.id)

        return new Response(JSON.stringify({
          error: `Failed to request design from ${provider}`,
          details: errorText
        }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const result = await response.json()

      // Update design with provider's design ID
      await supabase
        .from('designs')
        .update({
          external_id: result.design_id || result.id,
          status: 'draft',
        })
        .eq('id', design.id)

      // Update integration last_sync_at
      await supabase
        .from('integrations')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('tenant_id', survey.tenant_id)
        .eq('type', provider)

      return new Response(JSON.stringify({
        success: true,
        design_id: design.id,
        external_design_id: result.design_id || result.id,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (apiError) {
      console.error(`${provider} API request failed:`, apiError)

      // Update design status to failed
      await supabase
        .from('designs')
        .update({ status: 'rejected' })
        .eq('id', design.id)

      return new Response(JSON.stringify({
        error: `Failed to connect to ${provider} API`,
        details: apiError instanceof Error ? apiError.message : 'Unknown error'
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error) {
    console.error('Design request error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})