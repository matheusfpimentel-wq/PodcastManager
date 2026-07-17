import { getSupabase } from '@/lib/supabase'
import type { PapelEpisodio } from '@/data/types'

/** Vínculo N:N episódio↔pessoa (com papel). */

export async function addPessoaToEpisode(
  episodeId: string,
  pessoaId: string,
  papel: PapelEpisodio,
): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb
    .from('episodio_pessoas')
    .upsert(
      { episodio_id: episodeId, pessoa_id: pessoaId, papel },
      { onConflict: 'episodio_id,pessoa_id,papel' },
    )
  if (error) throw new Error(`Falha ao vincular pessoa: ${error.message}`)
}

export async function removePessoaFromEpisode(
  episodeId: string,
  pessoaId: string,
  papel: string,
): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb
    .from('episodio_pessoas')
    .delete()
    .eq('episodio_id', episodeId)
    .eq('pessoa_id', pessoaId)
    .eq('papel', papel)
  if (error) throw new Error(`Falha ao desvincular pessoa: ${error.message}`)
}
