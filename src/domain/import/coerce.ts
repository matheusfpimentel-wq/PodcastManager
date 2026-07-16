/**
 * Coerção de valores de célula para os tipos de campo do destino (spec §6.1).
 * Pura e testável — usada pela camada de dados ao aplicar um import.
 */
import type { CellValue } from './planImport'

export type FieldType = 'text' | 'int' | 'date' | 'timestamp'

export interface TargetField {
  key: string
  label: string
  type?: FieldType // default 'text'
}

/** Aceita ISO (yyyy-mm-dd...) ou BR (dd/mm/aaaa). Retorna Date ou null. */
export function parseDateLoose(value: CellValue): Date | null {
  if (value === null || value === undefined) return null
  // XLSX (raw) pode entregar Date; CellValue não a tipa, então checamos via unknown.
  const maybeDate = value as unknown
  if (maybeDate instanceof Date) return Number.isNaN(maybeDate.getTime()) ? null : maybeDate
  const s = String(value).trim()
  if (s === '') return null

  // BR: dd/mm/aaaa [hh:mm]
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/)
  if (br) {
    const [, d, m, y, hh, mm] = br
    const date = new Date(
      Date.UTC(Number(y), Number(m) - 1, Number(d), hh ? Number(hh) : 0, mm ? Number(mm) : 0),
    )
    return Number.isNaN(date.getTime()) ? null : date
  }

  const iso = new Date(s)
  return Number.isNaN(iso.getTime()) ? null : iso
}

/** Inteiro tolerante: aceita number, "12", "1.234" (milhar pt-BR) → 1234. */
export function parseIntLoose(value: CellValue): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : null
  const s = String(value).trim()
  if (s === '') return null
  // remove separadores de milhar e espaços; mantém sinal e dígitos
  const cleaned = s.replace(/[.\s]/g, '').replace(',', '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

export function coerceValue(value: CellValue, type: FieldType = 'text'): string | number | null {
  switch (type) {
    case 'int':
      return parseIntLoose(value)
    case 'date': {
      const d = parseDateLoose(value)
      return d ? d.toISOString().slice(0, 10) : null // yyyy-mm-dd
    }
    case 'timestamp': {
      const d = parseDateLoose(value)
      return d ? d.toISOString() : null
    }
    case 'text':
    default: {
      if (value === null || value === undefined) return null
      const s = String(value).trim()
      return s === '' ? null : s
    }
  }
}

/** Coage um registro mapeado inteiro conforme os tipos dos campos-alvo. */
export function coerceRecord(
  record: Record<string, CellValue>,
  fields: TargetField[],
): Record<string, string | number | null> {
  const out: Record<string, string | number | null> = {}
  for (const f of fields) {
    if (f.key in record) out[f.key] = coerceValue(record[f.key], f.type)
  }
  return out
}
