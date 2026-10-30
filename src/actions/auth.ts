'use server'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signUp(email: string, password: string, tenantName: string) {
  const supabase = createServerClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: tenantName,
      },
    },
  })

  if (error) {
    return { user: null, tenant: null, error: error.message }
  }

  if (data.user) {
    // Create tenant for the new user
    const slug = tenantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: tenantName,
        slug,
        settings: {},
      })
      .select()
      .single()

    if (tenantError) {
      return { user: data.user, tenant: null, error: tenantError.message }
    }

    // Update user profile with tenant_id
    await supabase.from('users').insert({
      id: data.user.id,
      tenant_id: tenant.id,
      email: data.user.email,
      full_name: tenantName,
      role: 'owner',
    })

    return { user: data.user, tenant, error: null }
  }

  return { user: null, tenant: null, error: 'Sign up failed' }
}

export async function signIn(email: string, password: string) {
  const supabase = createServerClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { user: null, error: error.message }
  }

  return { user: data.user, error: null }
}

export async function signOut() {
  const supabase = createServerClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: error.message }
  }

  redirect('/login')
}

export async function resendConfirmation(email: string) {
  const supabase = createServerClient()

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
  })

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}