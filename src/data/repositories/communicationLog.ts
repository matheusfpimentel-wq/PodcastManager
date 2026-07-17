import { getSupabase } from '@/lib/supabase'
import type { Tables, TablesInsert } from '@/data/database.types'

export type CommLog = Tables<'communication_log'>

/**
 * Registra uma comunicação enviada (§6.6). LGPD: não logamos telefone/e-mail
 * aqui — apenas o conteúdo renderizado que o usuário escolheu enviar.
 */
export async function logCommunication(input: TablesInsert<'communication_log'>): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('communication_log').insert(input)
  if (error) throw new Error(`Falha ao registrar comunicação: ${error.message}`)
}

interface LogRow {
  id: string
  canal: string | null
  assunto: string | null
  conteudo_renderizado: string | null
  enviado_em: string
  message_templates: { nome: string } | null
  pessoas: { nome: string } | null
}

export interface CommLogEntry {
  id: string
  canal: string | null
  assunto: string | null
  conteudo: string | null
  enviadoEm: string
  modelo: string | null
  pessoa: string | null
}

function mapRows(data: LogRow[]): CommLogEntry[] {
  return data.map((r) => ({
    id: r.id,
    canal: r.canal,
    assunto: r.assunto,
    conteudo: r.conteudo_renderizado,
    enviadoEm: r.enviado_em,
    modelo: r.message_templates?.nome ?? null,
    pessoa: r.pessoas?.nome ?? null,
  }))
}

export async function listLogByEpisode(episodeId: string): Promise<CommLogEntry[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('communication_log')
    .select('id, canal, assunto, conteudo_renderizado, enviado_em, message_templates(nome), pessoas(nome)')
    .eq('episodio_id', episodeId)
    .order('enviado_em', { ascending: false })
  if (error) throw new Error(`Falha ao carregar log: ${error.message}`)
  return mapRows((data ?? []) as LogRow[])
}

export async function listLogByPessoa(pessoaId: string): Promise<CommLogEntry[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('communication_log')
    .select('id, canal, assunto, conteudo_renderizado, enviado_em, message_templates(nome), pessoas(nome)')
    .eq('pessoa_id', pessoaId)
    .order('enviado_em', { ascending: false })
  if (error) throw new Error(`Falha ao carregar log: ${error.message}`)
  return mapRows((data ?? []) as LogRow[])
}
