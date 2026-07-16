import { getSupabase } from '@/lib/supabase'
import type { ImportPreset } from '@/data/types'
import type { ColumnMapping } from '@/domain/import/planImport'

/** Repositório de presets de import (mapeamentos coluna→campo por fonte). */

export async function listPresets(): Promise<ImportPreset[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('import_presets')
    .select('*')
    .eq('ativo', true)
    .order('nome', { ascending: true })
  if (error) throw new Error(`Falha ao listar presets: ${error.message}`)
  return data ?? []
}

/** Persiste o mapa de colunas (e opcionalmente a chave de dedup) do preset. */
export async function savePresetMapping(
  id: string,
  mapa_colunas: ColumnMapping,
  chave_dedup?: string[],
): Promise<void> {
  const sb = getSupabase()
  const patch: { mapa_colunas: ColumnMapping; chave_dedup?: string[] } = { mapa_colunas }
  if (chave_dedup) patch.chave_dedup = chave_dedup
  const { error } = await sb.from('import_presets').update(patch).eq('id', id)
  if (error) throw new Error(`Falha ao salvar preset: ${error.message}`)
}
