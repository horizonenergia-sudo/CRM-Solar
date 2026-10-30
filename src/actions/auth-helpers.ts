'use server'

import { createServerClient } from '@/lib/supabase/server'

export async function getUser() {
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

export async function getSession() {
  const supabase = createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session
}