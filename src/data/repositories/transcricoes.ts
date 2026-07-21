import { getSupabase } from '@/lib/supabase'

/** Transcrição do episódio (texto colado ou extraído de arquivo no client). */

export interface Transcricao {
  conteudo: string
  arquivo_nome: string | null
  updated_at: string | null
}

export async function getTranscricao(episodeId: string): Promise<Transcricao | null> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('episode_transcricao')
    .select('conteudo, arquivo_nome, updated_at')
    .eq('episodio_id', episodeId)
    .maybeSingle()
  if (error) throw new Error(`Falha ao carregar transcrição: ${error.message}`)
  return data
}

export async function saveTranscricao(
  episodeId: string,
  input: { conteudo: string; arquivo_nome?: string | null },
): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('episode_transcricao').upsert(
    {
      episodio_id: episodeId,
      conteudo: input.conteudo,
      arquivo_nome: input.arquivo_nome ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'episodio_id' },
  )
  if (error) throw new Error(`Falha ao salvar transcrição: ${error.message}`)
}

export async function deleteTranscricao(episodeId: string): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('episode_transcricao').delete().eq('episodio_id', episodeId)
  if (error) throw new Error(`Falha ao excluir transcrição: ${error.message}`)
}
