import type { Database } from '@/lib/supabase/types'
import type { SupabaseClient } from '@supabase/supabase-js'

declare module '@supabase/ssr' {
  interface CreateServerClientOptions<Schema = any> {
    cookies: {
      get(name: string): string | undefined
      set(name: string, value: string, options: any): void
      remove(name: string, options: any): void
    }
  }

  function createServerClient<Schema = any>(
    url: string,
    key: string,
    options: CreateServerClientOptions<Schema>
  ): SupabaseClient<Schema>

  export { createServerClient }
}