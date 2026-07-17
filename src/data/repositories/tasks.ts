import { getSupabase } from '@/lib/supabase'
import type { Tables, TablesInsert } from '@/data/database.types'

export type Task = Tables<'tasks'>

export async function listOpenTasks(): Promise<Task[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('tasks')
    .select('*')
    .eq('concluida', false)
    .order('vence_em', { ascending: true, nullsFirst: false })
  if (error) throw new Error(`Falha ao listar tarefas: ${error.message}`)
  return data ?? []
}

export async function createTask(input: TablesInsert<'tasks'>): Promise<Task> {
  const sb = getSupabase()
  const { data, error } = await sb.from('tasks').insert(input).select('*').single()
  if (error) throw new Error(`Falha ao criar tarefa: ${error.message}`)
  return data
}

export async function completeTask(id: string): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb
    .from('tasks')
    .update({ concluida: true, concluida_em: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`Falha ao concluir tarefa: ${error.message}`)
}

export async function deleteTask(id: string): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('tasks').delete().eq('id', id)
  if (error) throw new Error(`Falha ao excluir tarefa: ${error.message}`)
}
