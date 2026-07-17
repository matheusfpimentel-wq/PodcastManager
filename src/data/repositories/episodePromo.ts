import { getSupabase } from '@/lib/supabase'
import type { Tables } from '@/data/database.types'

export type EpisodePromo = Tables<'episode_promo'>
export type PromoStatus = 'rascunho' | 'pronto' | 'publicado'
export const PECAS = ['spotify', 'site_mppr', 'instagram', 'whatsapp', 'youtube'] as const
export type Peca = (typeof PECAS)[number]

const COLS = 'episodio_id, spotify, site_mppr, instagram, whatsapp, youtube, status, updated_at'

export async function getPromo(episodeId: string): Promise<EpisodePromo | null> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('episode_promo')
    .select(COLS)
    .eq('episodio_id', episodeId)
    .maybeSingle()
  if (error) throw new Error(`Falha ao carregar divulgação: ${error.message}`)
  return (data as EpisodePromo) ?? null
}

export interface PromoInput {
  spotify: string
  site_mppr: string
  instagram: string
  whatsapp: string
  youtube: string
  status: Record<string, PromoStatus>
}

export async function savePromo(episodeId: string, input: PromoInput): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb
    .from('episode_promo')
    .upsert(
      { episodio_id: episodeId, ...input, status: input.status as unknown as never },
      { onConflict: 'episodio_id' },
    )
  if (error) throw new Error(`Falha ao salvar divulgação: ${error.message}`)
}
