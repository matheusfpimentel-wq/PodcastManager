import { getSupabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/data/database.types'

/** Repositório de citações/fontes por episódio (§6.4). */

export type Citacao = Tables<'citacoes'>
export type CitacaoInsert = TablesInsert<'citacoes'>
export type CitacaoUpdate = TablesUpdate<'citacoes'>

const COLS =
  'id, episodio_id, tipo, identificador, orgao, data, o_que_fixou, fonte_url, status_verificacao, created_at, updated_at'

export async function listCitacoes(episodeId: string): Promise<Citacao[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('citacoes')
    .select(COLS)
    .eq('episodio_id', episodeId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Falha ao listar citações: ${error.message}`)
  return (data ?? []) as Citacao[]
}

export async function createCitacao(input: CitacaoInsert): Promise<Citacao> {
  const sb = getSupabase()
  const { data, error } = await sb.from('citacoes').insert(input).select(COLS).single()
  if (error) throw new Error(`Falha ao criar citação: ${error.message}`)
  return data as Citacao
}

export async function updateCitacao(id: string, patch: CitacaoUpdate): Promise<Citacao> {
  const sb = getSupabase()
  const { data, error } = await sb.from('citacoes').update(patch).eq('id', id).select(COLS).single()
  if (error) throw new Error(`Falha ao atualizar citação: ${error.message}`)
  return data as Citacao
}

export async function deleteCitacao(id: string): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('citacoes').delete().eq('id', id)
  if (error) throw new Error(`Falha ao excluir citação: ${error.message}`)
}

/** Nº de citações "a_confirmar" por episódio (para aviso no card/editor). */
export async function countAConfirmar(episodeId: string): Promise<number> {
  const sb = getSupabase()
  const { count, error } = await sb
    .from('citacoes')
    .select('id', { count: 'exact', head: true })
    .eq('episodio_id', episodeId)
    .eq('status_verificacao', 'a_confirmar')
  if (error) throw new Error(`Falha ao contar pendências: ${error.message}`)
  return count ?? 0
}
