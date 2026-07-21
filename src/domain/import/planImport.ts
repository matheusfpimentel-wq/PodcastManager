/**
 * Import planning (spec §6.1) — pure domain logic, no persistence.
 *
 * Given raw rows (from PapaParse/SheetJS), a column mapping (from an
 * `import_presets.mapa_colunas`) and a dedup key, produce a PLAN describing what
 * would be created, updated, ignored as duplicate, or flagged as a problem —
 * WITHOUT touching the database. The data layer executes the plan (upsert).
 *
 * Idempotency (§6.1: "rodar o mesmo arquivo duas vezes não duplica nada"):
 * records whose key already exists become `toUpdate`, never `toCreate`; repeated
 * keys within a single file collapse to the first occurrence.
 */

export type CellValue = string | number | boolean | Date | null | undefined
export type RawRow = Record<string, CellValue>
export type MappedRecord = Record<string, CellValue>

/** targetField -> source column header. Mirrors `import_presets.mapa_colunas`. */
export type ColumnMapping = Record<string, string>

/**
 * Separator used to join composite key parts. A control char keeps parts
 * unambiguous so ['ab','c'] can never collide with ['a','bc'].
 */
export const KEY_SEPARATOR = String.fromCharCode(1)

export interface ImportPlan {
  toCreate: MappedRecord[]
  toUpdate: Array<{ key: string; incoming: MappedRecord; existing: MappedRecord }>
  duplicatesInBatch: Array<{ key: string; record: MappedRecord; firstIndex: number }>
  problems: Array<{ index: number; record: MappedRecord; reason: string }>
  summary: {
    total: number
    criados: number
    atualizados: number
    duplicados: number
    problemas: number
  }
}

export interface PlanImportOptions {
  mapping: ColumnMapping
  /** Fields (in the mapped record) that form the dedup key, e.g. ['numero']. */
  dedupKeys: string[]
  /** Records already persisted, in mapped shape, to detect updates vs creates. */
  existing?: MappedRecord[]
}

/** Project a raw row onto target fields using the mapping. Unmapped columns are dropped. */
export function mapRow(row: RawRow, mapping: ColumnMapping): MappedRecord {
  const out: MappedRecord = {}
  for (const target of Object.keys(mapping)) {
    const source = mapping[target]
    if (source !== undefined) out[target] = row[source]
  }
  return out
}

/** Normalize a value for key comparison: trim + case-fold; null/undefined → ''. */
export function normalizeKeyPart(value: CellValue): string {
  if (value === null || value === undefined) return ''
  return String(value).trim().toLowerCase()
}

/**
 * Build a dedup key from the record. Returns null when ALL key parts are empty
 * (the row cannot be identified at all → treated as a problem row upstream).
 */
export function buildKey(record: MappedRecord, dedupKeys: string[]): string | null {
  const parts = dedupKeys.map((k) => normalizeKeyPart(record[k]))
  if (parts.every((p) => p === '')) return null
  return parts.join(KEY_SEPARATOR)
}

export function planImport(rows: RawRow[], options: PlanImportOptions): ImportPlan {
  const { mapping, dedupKeys, existing = [] } = options

  const existingByKey = new Map<string, MappedRecord>()
  for (const rec of existing) {
    const key = buildKey(rec, dedupKeys)
    if (key !== null) existingByKey.set(key, rec)
  }

  const plan: ImportPlan = {
    toCreate: [],
    toUpdate: [],
    duplicatesInBatch: [],
    problems: [],
    summary: { total: rows.length, criados: 0, atualizados: 0, duplicados: 0, problemas: 0 },
  }

  const seenInBatch = new Map<string, number>()

  rows.forEach((row, index) => {
    const record = mapRow(row, mapping)
    const key = buildKey(record, dedupKeys)

    if (key === null) {
      plan.problems.push({
        index,
        record,
        reason: `Sem valor para a chave de deduplicação (${dedupKeys.join(', ')})`,
      })
      return
    }

    const firstIndex = seenInBatch.get(key)
    if (firstIndex !== undefined) {
      plan.duplicatesInBatch.push({ key, record, firstIndex })
      return
    }
    seenInBatch.set(key, index)

    const existingRec = existingByKey.get(key)
    if (existingRec) {
      plan.toUpdate.push({ key, incoming: record, existing: existingRec })
    } else {
      plan.toCreate.push(record)
    }
  })

  plan.summary.criados = plan.toCreate.length
  plan.summary.atualizados = plan.toUpdate.length
  plan.summary.duplicados = plan.duplicatesInBatch.length
  plan.summary.problemas = plan.problems.length

  return plan
}
