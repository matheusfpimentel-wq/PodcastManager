import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/data/database.types'

/**
 * Supabase client (single source of truth for the cloud persistence layer).
 *
 * Domain logic MUST NOT import this module — it stays persistence-agnostic so
 * the app can later move to Tauri + SQLite without rewriting business rules
 * (CLAUDE.md § "Persistence-agnostic domain"). Only src/data/** may import it.
 */

export type TypedSupabaseClient = SupabaseClient<Database>

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let client: TypedSupabaseClient | null = null

export function getSupabase(): TypedSupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local (veja .env.example).',
    )
  }
  if (!client) {
    client = createClient<Database>(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  }
  return client
}

/** True when the client has the env vars it needs (gates cloud features in the UI). */
export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey)
}
