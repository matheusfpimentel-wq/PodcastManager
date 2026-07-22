import { getSupabase } from '@/lib/supabase'
import { coerceRecord, type TargetField } from '@/domain/import/coerce'
import type { ImportPlan } from '@/domain/import/planImport'
import type { ApplyReport } from '@/data/repositories/importControle'

/**
 * Aplicação do import "Spotify for Creators" → episode_metrics (série temporal).
 * Resolve numero→episodio_id e faz UPSERT por (episodio_id, plataforma, data).
 * Idempotente no banco: reimportar a mesma data atualiza os plays.
 */
export async function applySpotifyImport(
  plan: ImportPlan,
  fields: TargetField[],
): Promise<ApplyReport> {
  const sb = getSupabase()
  const report: ApplyReport = { criados: 0, atualizados: 0, convidados: 0, erros: [] }

  // mapa numero→id
  const { data: eps, error: epErr } = await sb.from('episodios').select('id, numero').not('numero', 'is', null)
  if (epErr) throw new Error(`Falha ao carregar episódios: ${epErr.message}`)
  const byNumero = new Map<number, string>()
  for (const e of eps ?? []) if (e.numero != null) byNumero.set(e.numero, e.id)

  // com existing=[] no plano, todas as linhas únicas caem em toCreate
  const rows = plan.toCreate
  for (const r of rows) {
    const rec = coerceRecord(r, fields)
    const numero = typeof rec.numero === 'number' ? rec.numero : null
    const data_referencia = typeof rec.data_referencia === 'string' ? rec.data_referencia : null
    const plays = typeof rec.plays === 'number' ? rec.plays : null

    if (numero == null || data_referencia == null) {
      report.erros.push({ contexto: `numero ${String(rec.numero)}`, motivo: 'número ou data ausente' })
      continue
    }
    const episodio_id = byNumero.get(numero)
    if (!episodio_id) {
      report.erros.push({ contexto: `numero ${numero}`, motivo: 'episódio não encontrado' })
      continue
    }

    const { error } = await sb
      .from('episode_metrics')
      .upsert(
        { episodio_id, plataforma: 'spotify', data_referencia, plays },
        { onConflict: 'episodio_id,plataforma,data_referencia' },
      )
    if (error) report.erros.push({ contexto: `numero ${numero}`, motivo: error.message })
    else report.criados += 1
  }
  return report
}
