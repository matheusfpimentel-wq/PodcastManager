import { getSupabase } from '@/lib/supabase'

/** Repositório de checklists instanciados por episódio+etapa. */

export interface ChecklistCheck {
  checkId: string
  itemId: string
  label: string
  ordem: number
  obrigatorio: boolean
  concluido: boolean
}

export interface EpisodeChecklist {
  instanceId: string
  checks: ChecklistCheck[]
}

interface InstanceRow {
  id: string
  episode_checklist_checks: Array<{
    id: string
    item_id: string
    concluido: boolean
    checklist_items: { label: string; ordem: number; obrigatorio: boolean } | null
  }>
}

/** Checklist do episódio na etapa informada (instanciado ao entrar na etapa). */
export async function getStageChecklist(
  episodeId: string,
  stageId: string,
): Promise<EpisodeChecklist | null> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('episode_checklist_instances')
    .select(
      'id, episode_checklist_checks(id, item_id, concluido, checklist_items(label, ordem, obrigatorio))',
    )
    .eq('episodio_id', episodeId)
    .eq('stage_id', stageId)
    .maybeSingle()
  if (error) throw new Error(`Falha ao carregar checklist: ${error.message}`)
  if (!data) return null

  const row = data as InstanceRow
  const checks: ChecklistCheck[] = row.episode_checklist_checks
    .map((c) => ({
      checkId: c.id,
      itemId: c.item_id,
      label: c.checklist_items?.label ?? '(item removido)',
      ordem: c.checklist_items?.ordem ?? 0,
      obrigatorio: c.checklist_items?.obrigatorio ?? false,
      concluido: c.concluido,
    }))
    .sort((a, b) => a.ordem - b.ordem)

  return { instanceId: row.id, checks }
}

export async function toggleCheck(checkId: string, concluido: boolean): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb
    .from('episode_checklist_checks')
    .update({ concluido, concluido_em: concluido ? new Date().toISOString() : null })
    .eq('id', checkId)
  if (error) throw new Error(`Falha ao atualizar item: ${error.message}`)
}

export interface StageProgress {
  total: number
  done: number
  obrigatoriosPendentes: number
}

/** Progresso do checklist por episódio (na etapa atual) para exibir nos cards. */
export async function progressByEpisode(): Promise<Record<string, StageProgress>> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('episode_checklist_instances')
    .select(
      'episodio_id, stage_id, episode_checklist_checks(concluido, checklist_items(obrigatorio))',
    )
  if (error) throw new Error(`Falha ao carregar progresso: ${error.message}`)

  type Row = {
    episodio_id: string
    stage_id: string
    episode_checklist_checks: Array<{
      concluido: boolean
      checklist_items: { obrigatorio: boolean } | null
    }>
  }
  const out: Record<string, StageProgress> = {}
  for (const row of (data ?? []) as Row[]) {
    // chave por episódio+etapa; o card usa a etapa atual do episódio
    const key = `${row.episodio_id}:${row.stage_id}`
    const total = row.episode_checklist_checks.length
    const done = row.episode_checklist_checks.filter((c) => c.concluido).length
    const obrigatoriosPendentes = row.episode_checklist_checks.filter(
      (c) => c.checklist_items?.obrigatorio && !c.concluido,
    ).length
    out[key] = { total, done, obrigatoriosPendentes }
  }
  return out
}
