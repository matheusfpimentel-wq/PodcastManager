import { getSupabase } from '@/lib/supabase'
import type { Pessoa, PessoaInsert, PessoaUpdate } from '@/data/types'

/**
 * Repositório de pessoas (CRM). Único lugar, junto de src/data, que fala com o
 * Supabase para esta entidade. Sem regra de negócio aqui — apenas persistência.
 */

const TABLE = 'pessoas'
// Nunca selecionar search_tsv (coluna interna de full-text).
const COLS =
  'id, nome, tratamento, cargo_atual, comarca_lotacao, email, telefone, instagram, genero, origem, tags, notas, campos_extras, anonimizada, created_at, updated_at'

export async function listPessoas(params?: { busca?: string }): Promise<Pessoa[]> {
  const sb = getSupabase()
  let query = sb.from(TABLE).select(COLS).order('nome', { ascending: true })

  const termo = params?.busca?.trim()
  if (termo) {
    // Full-text (portuguese) via search_tsv; websearch aceita a sintaxe do usuário.
    query = query.textSearch('search_tsv', termo, { type: 'websearch', config: 'portuguese' })
  }

  const { data, error } = await query
  if (error) throw new Error(`Falha ao listar pessoas: ${error.message}`)
  return (data ?? []) as Pessoa[]
}

export async function getPessoa(id: string): Promise<Pessoa | null> {
  const sb = getSupabase()
  const { data, error } = await sb.from(TABLE).select(COLS).eq('id', id).maybeSingle()
  if (error) throw new Error(`Falha ao carregar pessoa: ${error.message}`)
  return (data as Pessoa) ?? null
}

export async function createPessoa(input: PessoaInsert): Promise<Pessoa> {
  const sb = getSupabase()
  const { data, error } = await sb.from(TABLE).insert(input).select(COLS).single()
  if (error) throw new Error(`Falha ao criar pessoa: ${error.message}`)
  return data as Pessoa
}

export async function updatePessoa(id: string, patch: PessoaUpdate): Promise<Pessoa> {
  const sb = getSupabase()
  const { data, error } = await sb.from(TABLE).update(patch).eq('id', id).select(COLS).single()
  if (error) throw new Error(`Falha ao atualizar pessoa: ${error.message}`)
  return data as Pessoa
}

export async function deletePessoa(id: string): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from(TABLE).delete().eq('id', id)
  if (error) throw new Error(`Falha ao excluir pessoa: ${error.message}`)
}

/**
 * Participações anteriores de uma pessoa (para a regra de convidado repetido).
 * Retorna episódios vinculados com papel, para exibir contexto no alerta.
 */
export interface ParticipacaoAnterior {
  episodio_id: string
  papel: string
  numero: number | null
  titulo: string | null
  tema: string | null
  data_gravacao: string | null
}

export async function listParticipacoes(pessoaId: string): Promise<ParticipacaoAnterior[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('episodio_pessoas')
    .select('episodio_id, papel, episodios(numero, titulo, tema, data_gravacao)')
    .eq('pessoa_id', pessoaId)
  if (error) throw new Error(`Falha ao carregar participações: ${error.message}`)

  type Joined = {
    episodio_id: string
    papel: string
    episodios: {
      numero: number | null
      titulo: string | null
      tema: string | null
      data_gravacao: string | null
    } | null
  }
  return ((data ?? []) as Joined[]).map((r) => ({
    episodio_id: r.episodio_id,
    papel: r.papel,
    numero: r.episodios?.numero ?? null,
    titulo: r.episodios?.titulo ?? null,
    tema: r.episodios?.tema ?? null,
    data_gravacao: r.episodios?.data_gravacao ?? null,
  }))
}
