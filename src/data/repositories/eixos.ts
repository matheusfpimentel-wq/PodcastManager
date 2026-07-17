import { getSupabase } from '@/lib/supabase'
import type { Tables, TablesInsert } from '@/data/database.types'

export type Eixo = Tables<'eixos_tematicos'>

export async function listEixos(): Promise<Eixo[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('eixos_tematicos')
    .select('*')
    .eq('ativo', true)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })
  if (error) throw new Error(`Falha ao listar eixos: ${error.message}`)
  return data ?? []
}

export async function createEixo(input: TablesInsert<'eixos_tematicos'>): Promise<Eixo> {
  const sb = getSupabase()
  const { data, error } = await sb.from('eixos_tematicos').insert(input).select('*').single()
  if (error) throw new Error(`Falha ao criar eixo: ${error.message}`)
  return data
}

export async function updateEixo(
  id: string,
  patch: import('@/data/database.types').TablesUpdate<'eixos_tematicos'>,
): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('eixos_tematicos').update(patch).eq('id', id)
  if (error) throw new Error(`Falha ao atualizar eixo: ${error.message}`)
}
