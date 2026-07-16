import { getSupabase } from '@/lib/supabase'
import type { PipelineStage } from '@/data/types'

/** Repositório de etapas do pipeline (Kanban). */

export async function listStages(includeInactive = false): Promise<PipelineStage[]> {
  const sb = getSupabase()
  let query = sb.from('pipeline_stages').select('*').order('ordem', { ascending: true })
  if (!includeInactive) query = query.eq('ativo', true)
  const { data, error } = await query
  if (error) throw new Error(`Falha ao listar etapas: ${error.message}`)
  return data ?? []
}
