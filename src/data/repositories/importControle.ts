import { getSupabase } from '@/lib/supabase'
import { coerceRecord, coerceValue, type TargetField } from '@/domain/import/coerce'
import type { ImportPlan, MappedRecord } from '@/domain/import/planImport'
import type { EpisodioInsert, EpisodioUpdate } from '@/data/types'

/**
 * Aplicação do import do "Controle" (episódios). Recebe um ImportPlan já
 * calculado (dedup) e faz insert dos novos + update dos existentes por id.
 * O campo "convidado" (nome) não é coluna de episódio: resolvemos/creamos a
 * pessoa e vinculamos como convidado (papel), reaproveitando o CRM.
 */

export interface ApplyReport {
  criados: number
  atualizados: number
  convidados: number
  erros: Array<{ contexto: string; motivo: string }>
}

export async function fetchExistingEpisodios(): Promise<MappedRecord[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('episodios')
    .select('id, numero')
    .not('numero', 'is', null)
  if (error) throw new Error(`Falha ao carregar episódios existentes: ${error.message}`)
  return (data ?? []) as MappedRecord[]
}

export async function applyControleImport(
  plan: ImportPlan,
  fields: TargetField[],
): Promise<ApplyReport> {
  const sb = getSupabase()
  const report: ApplyReport = { criados: 0, atualizados: 0, convidados: 0, erros: [] }

  // "convidado" é tratado à parte (não é coluna de episódio).
  const episodeFields = fields.filter((f) => f.key !== 'convidado')
  const numeroToId = new Map<number, string>()

  const numeroDe = (rec: MappedRecord): number | null => {
    const n = coerceValue(rec.numero, 'int')
    return typeof n === 'number' ? n : null
  }

  // Criações — insert em lote, recuperando id + numero para vincular convidados.
  const novos = plan.toCreate.map((r) => coerceRecord(r, episodeFields) as EpisodioInsert)
  if (novos.length > 0) {
    const { data, error } = await sb.from('episodios').insert(novos).select('id, numero')
    if (error) report.erros.push({ contexto: 'inserção em lote', motivo: error.message })
    else {
      report.criados = data?.length ?? 0
      for (const row of data ?? []) if (row.numero != null) numeroToId.set(row.numero, row.id)
    }
  }

  // Atualizações — por id do registro existente.
  for (const upd of plan.toUpdate) {
    const id = upd.existing.id
    if (typeof id !== 'string') {
      report.erros.push({ contexto: `numero ${String(upd.incoming.numero)}`, motivo: 'sem id existente' })
      continue
    }
    const patch = coerceRecord(upd.incoming, episodeFields) as EpisodioUpdate
    const { error } = await sb.from('episodios').update(patch).eq('id', id)
    if (error) {
      report.erros.push({ contexto: `numero ${String(upd.incoming.numero)}`, motivo: error.message })
    } else {
      report.atualizados += 1
      const n = numeroDe(upd.incoming)
      if (n != null) numeroToId.set(n, id)
    }
  }

  // Vínculo de convidados (find-or-create pessoa por nome + episodio_pessoas).
  const hasConvidado = fields.some((f) => f.key === 'convidado')
  if (hasConvidado) {
    const pessoaCache = new Map<string, string>() // nome-normalizado -> pessoa_id
    const findOrCreatePessoa = async (nome: string): Promise<string | null> => {
      const chave = nome.trim().toLowerCase()
      const cached = pessoaCache.get(chave)
      if (cached) return cached
      const { data: achou } = await sb.from('pessoas').select('id').ilike('nome', nome.trim()).limit(1)
      let id = achou?.[0]?.id
      if (!id) {
        const { data: novo, error } = await sb
          .from('pessoas')
          .insert({ nome: nome.trim(), origem: 'at_membros' })
          .select('id')
          .single()
        if (error) {
          report.erros.push({ contexto: `convidado "${nome}"`, motivo: error.message })
          return null
        }
        id = novo.id
      }
      pessoaCache.set(chave, id)
      return id
    }

    const rows = [...plan.toCreate, ...plan.toUpdate.map((u) => u.incoming)]
    for (const rec of rows) {
      const nome = coerceValue(rec.convidado, 'text')
      const n = numeroDe(rec)
      if (typeof nome !== 'string' || nome.trim() === '' || n == null) continue
      const episodioId = numeroToId.get(n)
      if (!episodioId) continue
      const pessoaId = await findOrCreatePessoa(nome)
      if (!pessoaId) continue
      const { error } = await sb
        .from('episodio_pessoas')
        .upsert(
          { episodio_id: episodioId, pessoa_id: pessoaId, papel: 'convidado' },
          { onConflict: 'episodio_id,pessoa_id,papel' },
        )
      if (error) report.erros.push({ contexto: `vínculo ${nome} → ep ${n}`, motivo: error.message })
      else report.convidados += 1
    }
  }

  return report
}
