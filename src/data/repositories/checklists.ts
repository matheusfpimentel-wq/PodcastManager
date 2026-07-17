import { getSupabase } from '@/lib/supabase'
import { nextVersionNumber } from '@/domain/script/version'

/** Repositório de checklists instanciados por episódio+etapa. */

export interface ChecklistTemplateHead {
  id: string
  stage_id: string | null
  nome: string
}

export async function listChecklistTemplates(): Promise<ChecklistTemplateHead[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('checklist_templates')
    .select('id, stage_id, nome')
    .eq('ativo', true)
    .order('nome', { ascending: true })
  if (error) throw new Error(`Falha ao listar checklists: ${error.message}`)
  return data ?? []
}

export interface ChecklistItemEdit {
  label: string
  ordem: number
  obrigatorio: boolean
}
export interface ChecklistVersionEdit {
  versionId: string
  versao: number
  items: ChecklistItemEdit[]
}

export async function getLatestChecklistVersion(
  templateId: string,
): Promise<ChecklistVersionEdit | null> {
  const sb = getSupabase()
  const { data: ver, error: e1 } = await sb
    .from('checklist_template_versions')
    .select('id, versao')
    .eq('template_id', templateId)
    .order('versao', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (e1) throw new Error(`Falha ao carregar checklist: ${e1.message}`)
  if (!ver) return null
  const { data: items, error: e2 } = await sb
    .from('checklist_items')
    .select('label, ordem, obrigatorio')
    .eq('version_id', ver.id)
    .order('ordem', { ascending: true })
  if (e2) throw new Error(`Falha ao carregar itens: ${e2.message}`)
  return { versionId: ver.id, versao: ver.versao, items: items ?? [] }
}

/** Salva edição do checklist como NOVA versão (imutável; instâncias antigas intactas). */
export async function saveNewChecklistVersion(
  templateId: string,
  items: ChecklistItemEdit[],
): Promise<void> {
  const sb = getSupabase()
  const { data: maxRow, error: e0 } = await sb
    .from('checklist_template_versions')
    .select('versao')
    .eq('template_id', templateId)
    .order('versao', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (e0) throw new Error(`Falha ao calcular versão: ${e0.message}`)

  const versao = nextVersionNumber(maxRow?.versao ?? 0)
  const { data: ver, error: e1 } = await sb
    .from('checklist_template_versions')
    .insert({ template_id: templateId, versao })
    .select('id')
    .single()
  if (e1) throw new Error(`Falha ao criar versão: ${e1.message}`)

  if (items.length > 0) {
    const { error: e2 } = await sb.from('checklist_items').insert(
      items.map((it, i) => ({ version_id: ver.id, label: it.label, ordem: it.ordem || (i + 1) * 10, obrigatorio: it.obrigatorio })),
    )
    if (e2) throw new Error(`Falha ao salvar itens: ${e2.message}`)
  }
}

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
