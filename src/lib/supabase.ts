import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client (single source of truth for the cloud persistence layer).
 *
 * Domain logic MUST NOT import this module directly — it stays
 * persistence-agnostic so the app can later move to Tauri + SQLite without
 * rewriting business rules (see CLAUDE.md § "Persistence-agnostic domain").
 * Only repository/data-access modules under src/data may import it.
 */

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local (veja .env.example).',
    )
  }
  if (!client) {
    client = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  }
  return client
}

/** True when the client has the env vars it needs (used to gate cloud features in the UI). */
export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey)
}
