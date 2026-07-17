import { getSupabase } from '@/lib/supabase'
import { mesDe, type EpisodeFact, type GuestFact } from '@/domain/metrics/engine'

/** Monta os "fatos" que alimentam o motor de métricas. */

export async function getEpisodeFacts(): Promise<EpisodeFact[]> {
  const sb = getSupabase()
  const [{ data: eps, error: e1 }, { data: metrics, error: e2 }] = await Promise.all([
    sb.from('episodios').select('id, data_lancamento, duracao_seg, eixos_tematicos(nome)'),
    sb.from('episode_metrics').select('episodio_id, data_referencia, plays').eq('plataforma', 'spotify'),
  ])
  if (e1) throw new Error(`Falha ao carregar episódios: ${e1.message}`)
  if (e2) throw new Error(`Falha ao carregar métricas: ${e2.message}`)

  // plays = valor na data_referencia mais recente (série é cumulativa)
  const latest = new Map<string, { data: string; plays: number }>()
  for (const m of metrics ?? []) {
    const prev = latest.get(m.episodio_id)
    if (!prev || m.data_referencia > prev.data) {
      latest.set(m.episodio_id, { data: m.data_referencia, plays: m.plays ?? 0 })
    }
  }

  type EpRow = {
    id: string
    data_lancamento: string | null
    duracao_seg: number | null
    eixos_tematicos: { nome: string } | null
  }
  return ((eps ?? []) as EpRow[]).map((e) => ({
    episodeId: e.id,
    eixo: e.eixos_tematicos?.nome ?? null,
    mes: mesDe(e.data_lancamento),
    plays: latest.get(e.id)?.plays ?? 0,
    duracaoSeg: e.duracao_seg,
  }))
}

export async function getGuestFacts(): Promise<GuestFact[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('episodio_pessoas')
    .select('papel, pessoas(genero), episodios(data_lancamento)')
    .in('papel', ['convidado', 'participacao_especial'])
  if (error) throw new Error(`Falha ao carregar convidados: ${error.message}`)

  type Row = {
    pessoas: { genero: string } | null
    episodios: { data_lancamento: string | null } | null
  }
  return ((data ?? []) as Row[]).map((r) => ({
    mes: mesDe(r.episodios?.data_lancamento),
    genero: r.pessoas?.genero ?? 'nao_informado',
  }))
}
