/**
 * Regra de lembrete relativa a datas do episódio (spec §6.6). Pura e testável.
 * Ex.: Briefing = D−1 da gravação → { base: 'data_gravacao', offset_dias: -1 }.
 */

export interface RegraLembrete {
  base: 'data_gravacao' | 'data_lancamento'
  offset_dias?: number
}

export interface EpisodioDatas {
  data_gravacao?: string | null
  data_lancamento?: string | null
}

/** Interpreta um valor JSON como RegraLembrete válida (ou null). */
export function parseRegraLembrete(json: unknown): RegraLembrete | null {
  if (!json || typeof json !== 'object') return null
  const r = json as Record<string, unknown>
  if (r.base !== 'data_gravacao' && r.base !== 'data_lancamento') return null
  const offset = typeof r.offset_dias === 'number' ? r.offset_dias : 0
  return { base: r.base, offset_dias: offset }
}

/**
 * Data em que o lembrete deve aparecer. Aplica o offset em dias sobre a data-base
 * do episódio (UTC, para não sofrer com fuso). Retorna null se a base não existe.
 */
export function computeReminderDate(
  regra: RegraLembrete | null,
  ep: EpisodioDatas,
): Date | null {
  if (!regra) return null
  const baseStr = regra.base === 'data_gravacao' ? ep.data_gravacao : ep.data_lancamento
  if (!baseStr) return null
  const d = new Date(baseStr)
  if (Number.isNaN(d.getTime())) return null
  d.setUTCDate(d.getUTCDate() + (regra.offset_dias ?? 0))
  return d
}

/** Compara apenas a data (ignora hora) — util para "vence até hoje". */
export function isSameOrBeforeDay(date: Date, ref: Date): boolean {
  const a = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  const b = Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate())
  return a <= b
}
