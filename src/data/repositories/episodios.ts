import { getSupabase } from '@/lib/supabase'
import type { Episodio, EpisodioUpdate } from '@/data/types'

/** Repositório de episódios + movimentação de etapa (via RPC transacional). */

export interface BoardEpisode {
  id: string
  numero: number | null
  titulo: string | null
  tema: string | null
  data_gravacao: string | null
  stage_id: string | null
  convidados: string[]
}

interface BoardRow {
  id: string
  numero: number | null
  titulo: string | null
  tema: string | null
  data_gravacao: string | null
  stage_id: string | null
  episodio_pessoas: Array<{ papel: string; pessoas: { nome: string } | null }>
}

export async function listBoardEpisodes(): Promise<BoardEpisode[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('episodios')
    .select(
      'id, numero, titulo, tema, data_gravacao, stage_id, episodio_pessoas(papel, pessoas(nome))',
    )
    .order('numero', { ascending: true, nullsFirst: false })
  if (error) throw new Error(`Falha ao carregar quadro: ${error.message}`)

  return ((data ?? []) as BoardRow[]).map((r) => ({
    id: r.id,
    numero: r.numero,
    titulo: r.titulo,
    tema: r.tema,
    data_gravacao: r.data_gravacao,
    stage_id: r.stage_id,
    convidados: r.episodio_pessoas
      .filter((ep) => ep.papel === 'convidado' || ep.papel === 'participacao_especial')
      .map((ep) => ep.pessoas?.nome)
      .filter((n): n is string => Boolean(n)),
  }))
}

export async function createEpisodio(
  input: { tema?: string | null; titulo?: string | null; notas?: string | null },
  stageId: string,
): Promise<string> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('episodios')
    .insert({ tema: input.tema ?? null, titulo: input.titulo ?? null, notas: input.notas ?? null })
    .select('id')
    .single()
  if (error) throw new Error(`Falha ao criar episódio: ${error.message}`)
  // Registra a etapa inicial via RPC (grava stage_history + instancia checklist).
  await moveToStage(data.id, stageId)
  return data.id
}

export async function updateEpisodio(id: string, patch: EpisodioUpdate): Promise<Episodio> {
  const sb = getSupabase()
  const { data, error } = await sb.from('episodios').update(patch).eq('id', id).select('*').single()
  if (error) throw new Error(`Falha ao atualizar episódio: ${error.message}`)
  return data
}

export async function moveToStage(episodeId: string, stageId: string): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.rpc('move_episode_to_stage', {
    p_episode: episodeId,
    p_stage: stageId,
  })
  if (error) throw new Error(`Falha ao mover etapa: ${error.message}`)
}

export interface EpisodioHeader {
  id: string
  numero: number | null
  titulo: string | null
  tema: string | null
}

export async function getEpisodioHeader(id: string): Promise<EpisodioHeader | null> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('episodios')
    .select('id, numero, titulo, tema')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`Falha ao carregar episódio: ${error.message}`)
  return data
}

export async function deleteEpisodio(id: string): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('episodios').delete().eq('id', id)
  if (error) throw new Error(`Falha ao excluir episódio: ${error.message}`)
}

export interface EpisodeWithDates {
  id: string
  numero: number | null
  titulo: string | null
  tema: string | null
  data_gravacao: string | null
  data_lancamento: string | null
  stage_id: string | null
  links: Record<string, unknown>
}

/** Episódios com datas + etapa — base da tela "Hoje" (lembretes, próximas). */
export async function listEpisodesWithDates(): Promise<EpisodeWithDates[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('episodios')
    .select('id, numero, titulo, tema, data_gravacao, data_lancamento, stage_id, links')
  if (error) throw new Error(`Falha ao carregar episódios: ${error.message}`)
  return ((data ?? []) as Array<Omit<EpisodeWithDates, 'links'> & { links: unknown }>).map((e) => ({
    ...e,
    links: (e.links && typeof e.links === 'object' ? e.links : {}) as Record<string, unknown>,
  }))
}

export interface EpisodioContext {
  id: string
  numero: number | null
  titulo: string | null
  tema: string | null
  data_gravacao: string | null
  data_lancamento: string | null
  links: Record<string, unknown>
}

/** Dados do episódio para montar mensagens/lembretes. */
export async function getEpisodioContext(id: string): Promise<EpisodioContext | null> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('episodios')
    .select('id, numero, titulo, tema, data_gravacao, data_lancamento, links')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`Falha ao carregar episódio: ${error.message}`)
  if (!data) return null
  return {
    ...data,
    links: (data.links && typeof data.links === 'object' ? data.links : {}) as Record<string, unknown>,
  }
}

export interface EpisodePessoa {
  pessoa_id: string
  papel: string
  nome: string
  tratamento: string | null
  cargo_atual: string | null
  comarca_lotacao: string | null
  email: string | null
  telefone: string | null
  instagram: string | null
}

/** Pessoas vinculadas a um episódio (com papel) — para o gerador de mensagens. */
export async function listEpisodePessoas(episodeId: string): Promise<EpisodePessoa[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('episodio_pessoas')
    .select('papel, pessoa_id, pessoas(nome, tratamento, cargo_atual, comarca_lotacao, email, telefone, instagram)')
    .eq('episodio_id', episodeId)
  if (error) throw new Error(`Falha ao carregar convidados: ${error.message}`)
  type Row = {
    papel: string
    pessoa_id: string
    pessoas: {
      nome: string
      tratamento: string | null
      cargo_atual: string | null
      comarca_lotacao: string | null
      email: string | null
      telefone: string | null
      instagram: string | null
    } | null
  }
  return ((data ?? []) as Row[])
    .filter((r) => r.pessoas)
    .map((r) => ({ pessoa_id: r.pessoa_id, papel: r.papel, ...r.pessoas! }))
}
