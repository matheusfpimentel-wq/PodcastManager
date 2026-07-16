import { getSupabase } from '@/lib/supabase'
import type { Json } from '@/data/database.types'

/** Repositório de settings (chave/valor global, single-user). */

export async function getAllSettings(): Promise<Record<string, Json>> {
  const sb = getSupabase()
  const { data, error } = await sb.from('settings').select('key, value')
  if (error) throw new Error(`Falha ao carregar configurações: ${error.message}`)
  const out: Record<string, Json> = {}
  for (const row of data ?? []) out[row.key] = row.value
  return out
}

export async function getSetting<T = Json>(key: string): Promise<T | null> {
  const sb = getSupabase()
  const { data, error } = await sb.from('settings').select('value').eq('key', key).maybeSingle()
  if (error) throw new Error(`Falha ao carregar configuração "${key}": ${error.message}`)
  return (data?.value as T) ?? null
}

export async function setSetting(key: string, value: Json): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('settings').upsert({ key, value }, { onConflict: 'key' })
  if (error) throw new Error(`Falha ao salvar configuração "${key}": ${error.message}`)
}
