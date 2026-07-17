import { getSupabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/data/database.types'

export type MessageTemplate = Tables<'message_templates'>
export type MessageTemplateInsert = TablesInsert<'message_templates'>
export type MessageTemplateUpdate = TablesUpdate<'message_templates'>

export async function listMessageTemplates(): Promise<MessageTemplate[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('message_templates')
    .select('*')
    .eq('ativo', true)
    .order('ordem', { ascending: true })
  if (error) throw new Error(`Falha ao listar modelos: ${error.message}`)
  return data ?? []
}

export async function createMessageTemplate(input: MessageTemplateInsert): Promise<MessageTemplate> {
  const sb = getSupabase()
  const { data, error } = await sb.from('message_templates').insert(input).select('*').single()
  if (error) throw new Error(`Falha ao criar modelo: ${error.message}`)
  return data
}

export async function updateMessageTemplate(
  id: string,
  patch: MessageTemplateUpdate,
): Promise<MessageTemplate> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('message_templates')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(`Falha ao atualizar modelo: ${error.message}`)
  return data
}

/** "Excluir" = desativar (preserva o histórico do log que referencia o modelo). */
export async function deactivateMessageTemplate(id: string): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('message_templates').update({ ativo: false }).eq('id', id)
  if (error) throw new Error(`Falha ao excluir modelo: ${error.message}`)
}
