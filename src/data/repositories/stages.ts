import { getSupabase } from '@/lib/supabase'
import type { PipelineStage } from '@/data/types'
import type { TablesInsert, TablesUpdate } from '@/data/database.types'

/** Repositório de etapas do pipeline (Kanban). */

export async function listStages(includeInactive = false): Promise<PipelineStage[]> {
  const sb = getSupabase()
  let query = sb.from('pipeline_stages').select('*').order('ordem', { ascending: true })
  if (!includeInactive) query = query.eq('ativo', true)
  const { data, error } = await query
  if (error) throw new Error(`Falha ao listar etapas: ${error.message}`)
  return data ?? []
}

export async function createStage(input: TablesInsert<'pipeline_stages'>): Promise<PipelineStage> {
  const sb = getSupabase()
  const { data, error } = await sb.from('pipeline_stages').insert(input).select('*').single()
  if (error) throw new Error(`Falha ao criar etapa: ${error.message}`)
  return data
}

export async function updateStage(id: string, patch: TablesUpdate<'pipeline_stages'>): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('pipeline_stages').update(patch).eq('id', id)
  if (error) throw new Error(`Falha ao atualizar etapa: ${error.message}`)
}
