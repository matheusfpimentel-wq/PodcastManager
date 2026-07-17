import { getSupabase } from '@/lib/supabase'
import type { EpisodeScriptContent, ScriptTemplateStructure } from '@/domain/script/types'

/** Repositório do roteiro de um episódio (referencia a versão exata do template). */

export interface EpisodeScriptFull {
  id: string
  episodioId: string
  templateVersionId: string
  versao: number
  estrutura: ScriptTemplateStructure
  conteudo: EpisodeScriptContent
}

function toStructure(json: unknown): ScriptTemplateStructure {
  if (json && typeof json === 'object' && Array.isArray((json as { sections?: unknown }).sections)) {
    return json as ScriptTemplateStructure
  }
  return { sections: [] }
}

function toContent(json: unknown): EpisodeScriptContent {
  return json && typeof json === 'object' ? (json as EpisodeScriptContent) : {}
}

interface JoinedRow {
  id: string
  episodio_id: string
  template_version_id: string
  conteudo: unknown
  script_template_versions: { versao: number; estrutura: unknown } | null
}

export async function getEpisodeScript(episodeId: string): Promise<EpisodeScriptFull | null> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('episode_scripts')
    .select('id, episodio_id, template_version_id, conteudo, script_template_versions(versao, estrutura)')
    .eq('episodio_id', episodeId)
    .maybeSingle()
  if (error) throw new Error(`Falha ao carregar roteiro: ${error.message}`)
  if (!data) return null
  const row = data as JoinedRow
  return {
    id: row.id,
    episodioId: row.episodio_id,
    templateVersionId: row.template_version_id,
    versao: row.script_template_versions?.versao ?? 0,
    estrutura: toStructure(row.script_template_versions?.estrutura),
    conteudo: toContent(row.conteudo),
  }
}

/** Cria o roteiro do episódio a partir de uma versão de template (conteúdo vazio). */
export async function startEpisodeScript(
  episodeId: string,
  templateVersionId: string,
): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb
    .from('episode_scripts')
    .insert({ episodio_id: episodeId, template_version_id: templateVersionId, conteudo: {} })
  if (error) throw new Error(`Falha ao iniciar roteiro: ${error.message}`)
}

/** Salva o conteúdo e registra uma revisão (histórico simples). */
export async function saveEpisodeScript(
  scriptId: string,
  conteudo: EpisodeScriptContent,
): Promise<void> {
  const sb = getSupabase()
  const payload = conteudo as unknown as never
  const { error } = await sb
    .from('episode_scripts')
    .update({ conteudo: payload, atualizado_em: new Date().toISOString() })
    .eq('id', scriptId)
  if (error) throw new Error(`Falha ao salvar roteiro: ${error.message}`)
  // revisão (best-effort; não bloqueia o save)
  await sb.from('episode_script_revisions').insert({ episode_script_id: scriptId, conteudo: payload })
}
