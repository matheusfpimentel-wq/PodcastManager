import { getSupabase } from '@/lib/supabase'

/**
 * Busca global (spec §6.5): pessoas, episódios e citações via full-text (pt-BR).
 * Consulta-chave da curadoria: "já cobrimos este julgado/tema?".
 */

export interface SearchResults {
  pessoas: Array<{ id: string; nome: string; cargo_atual: string | null; comarca_lotacao: string | null }>
  episodios: Array<{ id: string; numero: number | null; titulo: string | null; tema: string | null }>
  citacoes: Array<{
    id: string
    episodio_id: string
    tipo: string | null
    identificador: string | null
    orgao: string | null
    o_que_fixou: string | null
    status_verificacao: string
  }>
}

const FT = { type: 'websearch', config: 'portuguese' } as const

export async function searchGlobal(term: string): Promise<SearchResults> {
  const q = term.trim()
  if (q.length < 2) return { pessoas: [], episodios: [], citacoes: [] }
  const sb = getSupabase()

  const [pes, eps, cits] = await Promise.all([
    sb.from('pessoas').select('id, nome, cargo_atual, comarca_lotacao').textSearch('search_tsv', q, FT).limit(20),
    sb.from('episodios').select('id, numero, titulo, tema').textSearch('search_tsv', q, FT).limit(20),
    sb
      .from('citacoes')
      .select('id, episodio_id, tipo, identificador, orgao, o_que_fixou, status_verificacao')
      .textSearch('search_tsv', q, FT)
      .limit(30),
  ])

  if (pes.error) throw new Error(`Busca (pessoas): ${pes.error.message}`)
  if (eps.error) throw new Error(`Busca (episódios): ${eps.error.message}`)
  if (cits.error) throw new Error(`Busca (citações): ${cits.error.message}`)

  return { pessoas: pes.data ?? [], episodios: eps.data ?? [], citacoes: cits.data ?? [] }
}
