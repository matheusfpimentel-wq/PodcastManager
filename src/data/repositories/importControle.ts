import { getSupabase } from '@/lib/supabase'
import { coerceRecord, type TargetField } from '@/domain/import/coerce'
import type { ImportPlan, MappedRecord } from '@/domain/import/planImport'
import type { EpisodioInsert, EpisodioUpdate } from '@/data/types'

/**
 * Aplicação do import do "Controle" (episódios). Recebe um ImportPlan já
 * calculado (dedup) e faz insert dos novos + update dos existentes por id.
 */

export interface ApplyReport {
  criados: number
  atualizados: number
  erros: Array<{ contexto: string; motivo: string }>
}

/**
 * Registros existentes, em formato mapeado, para o planImport detectar update
 * vs create. Inclui `id` (ignorado pela chave de dedup, usado no update).
 */
export async function fetchExistingEpisodios(): Promise<MappedRecord[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('episodios')
    .select('id, numero')
    .not('numero', 'is', null)
  if (error) throw new Error(`Falha ao carregar episódios existentes: ${error.message}`)
  return (data ?? []) as MappedRecord[]
}

export async function applyControleImport(
  plan: ImportPlan,
  fields: TargetField[],
): Promise<ApplyReport> {
  const sb = getSupabase()
  const report: ApplyReport = { criados: 0, atualizados: 0, erros: [] }

  // Criações — insert em lote.
  const novos = plan.toCreate.map((r) => coerceRecord(r, fields) as EpisodioInsert)
  if (novos.length > 0) {
    const { data, error } = await sb.from('episodios').insert(novos).select('id')
    if (error) report.erros.push({ contexto: 'inserção em lote', motivo: error.message })
    else report.criados = data?.length ?? 0
  }

  // Atualizações — por id do registro existente.
  for (const upd of plan.toUpdate) {
    const id = upd.existing.id
    if (typeof id !== 'string') {
      report.erros.push({ contexto: `numero ${String(upd.incoming.numero)}`, motivo: 'sem id existente' })
      continue
    }
    const patch = coerceRecord(upd.incoming, fields) as EpisodioUpdate
    const { error } = await sb.from('episodios').update(patch).eq('id', id)
    if (error) report.erros.push({ contexto: `numero ${String(upd.incoming.numero)}`, motivo: error.message })
    else report.atualizados += 1
  }

  return report
}
