import { getSupabase } from '@/lib/supabase'
import { nextVersionNumber } from '@/domain/script/version'
import type { ScriptTemplateStructure } from '@/domain/script/types'

/** Repositório de templates de roteiro versionados. */

export interface TemplateVersion {
  versionId: string
  templateId: string
  versao: number
  estrutura: ScriptTemplateStructure
}

export interface TemplateHead {
  id: string
  nome: string
  descricao: string | null
}

export async function listTemplates(): Promise<TemplateHead[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('script_templates')
    .select('id, nome, descricao')
    .eq('ativo', true)
    .order('nome', { ascending: true })
  if (error) throw new Error(`Falha ao listar templates: ${error.message}`)
  return data ?? []
}

function toStructure(json: unknown): ScriptTemplateStructure {
  if (json && typeof json === 'object' && Array.isArray((json as { sections?: unknown }).sections)) {
    return json as ScriptTemplateStructure
  }
  return { sections: [] }
}

export async function getLatestVersion(templateId: string): Promise<TemplateVersion | null> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('script_template_versions')
    .select('id, template_id, versao, estrutura')
    .eq('template_id', templateId)
    .order('versao', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Falha ao carregar template: ${error.message}`)
  if (!data) return null
  return {
    versionId: data.id,
    templateId: data.template_id,
    versao: data.versao,
    estrutura: toStructure(data.estrutura),
  }
}

export async function getVersionById(versionId: string): Promise<TemplateVersion | null> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('script_template_versions')
    .select('id, template_id, versao, estrutura')
    .eq('id', versionId)
    .maybeSingle()
  if (error) throw new Error(`Falha ao carregar versão: ${error.message}`)
  if (!data) return null
  return {
    versionId: data.id,
    templateId: data.template_id,
    versao: data.versao,
    estrutura: toStructure(data.estrutura),
  }
}

/**
 * Salva uma edição como NOVA versão (imutabilidade: nunca altera versão em uso).
 * versao = maior existente + 1.
 */
export async function saveNewVersion(
  templateId: string,
  estrutura: ScriptTemplateStructure,
): Promise<TemplateVersion> {
  const sb = getSupabase()
  const { data: maxRow, error: maxErr } = await sb
    .from('script_template_versions')
    .select('versao')
    .eq('template_id', templateId)
    .order('versao', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (maxErr) throw new Error(`Falha ao calcular versão: ${maxErr.message}`)

  const versao = nextVersionNumber(maxRow?.versao ?? 0)
  const { data, error } = await sb
    .from('script_template_versions')
    .insert({ template_id: templateId, versao, estrutura: estrutura as unknown as never })
    .select('id, template_id, versao, estrutura')
    .single()
  if (error) throw new Error(`Falha ao salvar nova versão: ${error.message}`)
  return {
    versionId: data.id,
    templateId: data.template_id,
    versao: data.versao,
    estrutura: toStructure(data.estrutura),
  }
}
