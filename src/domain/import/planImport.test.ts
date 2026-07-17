import { describe, expect, it } from 'vitest'
import { buildKey, KEY_SEPARATOR, mapRow, planImport } from './planImport'

describe('mapRow', () => {
  it('projects raw columns onto target fields and drops unmapped columns', () => {
    const row = { 'Nº': 12, 'Título do episódio': 'Improbidade', Ignorar: 'x' }
    const record = mapRow(row, { numero: 'Nº', titulo: 'Título do episódio' })
    expect(record).toEqual({ numero: 12, titulo: 'Improbidade' })
  })
})

describe('buildKey', () => {
  it('normalizes (trim + case-fold) and joins composite keys with a separator', () => {
    expect(buildKey({ nome: '  Ana  ', comarca: 'Curitiba' }, ['nome', 'comarca'])).toBe(
      `ana${KEY_SEPARATOR}curitiba`,
    )
  })

  it('composite key parts cannot collide (ab|c never equals a|bc)', () => {
    const a = buildKey({ x: 'ab', y: 'c' }, ['x', 'y'])
    const b = buildKey({ x: 'a', y: 'bc' }, ['x', 'y'])
    expect(a).not.toBe(b)
  })

  it('returns null when every key part is empty', () => {
    expect(buildKey({ numero: '   ' }, ['numero'])).toBeNull()
    expect(buildKey({ numero: null }, ['numero'])).toBeNull()
  })
})

describe('planImport', () => {
  const mapping = { numero: 'Nº', titulo: 'Título' }

  it('maps columns and separates creates from updates against existing records', () => {
    const rows = [
      { 'Nº': 1, 'Título': 'Ep 1' },
      { 'Nº': 2, 'Título': 'Ep 2' },
    ]
    const existing = [{ numero: 1, titulo: 'Ep 1 (antigo)' }]
    const plan = planImport(rows, { mapping, dedupKeys: ['numero'], existing })

    expect(plan.toCreate).toEqual([{ numero: 2, titulo: 'Ep 2' }])
    expect(plan.toUpdate).toHaveLength(1)
    expect(plan.toUpdate[0]?.incoming).toEqual({ numero: 1, titulo: 'Ep 1' })
    expect(plan.toUpdate[0]?.existing).toEqual({ numero: 1, titulo: 'Ep 1 (antigo)' })
    expect(plan.summary).toMatchObject({ total: 2, criados: 1, atualizados: 1 })
  })

  it('collapses duplicate keys within the same file to the first occurrence', () => {
    const rows = [
      { 'Nº': 5, 'Título': 'primeira' },
      { 'Nº': 5, 'Título': 'repetida' },
      { 'Nº': 6, 'Título': 'outra' },
    ]
    const plan = planImport(rows, { mapping, dedupKeys: ['numero'] })

    expect(plan.toCreate.map((r) => r.numero)).toEqual([5, 6])
    expect(plan.duplicatesInBatch).toHaveLength(1)
    expect(plan.duplicatesInBatch[0]).toMatchObject({ firstIndex: 0 })
  })

  it('is idempotent: re-importing the same file yields updates, never new creates', () => {
    const rows = [
      { 'Nº': 1, 'Título': 'Ep 1' },
      { 'Nº': 2, 'Título': 'Ep 2' },
    ]
    const firstPass = planImport(rows, { mapping, dedupKeys: ['numero'] })
    // Simulate persistence of the first pass, then re-run the exact same file.
    const existing = firstPass.toCreate
    const secondPass = planImport(rows, { mapping, dedupKeys: ['numero'], existing })

    expect(secondPass.toCreate).toEqual([])
    expect(secondPass.toUpdate).toHaveLength(2)
    expect(secondPass.summary).toMatchObject({ criados: 0, atualizados: 2, duplicados: 0 })
  })

  it('flags rows with no dedup key as problems (never silently dropped)', () => {
    const rows = [
      { 'Nº': '', 'Título': 'sem número' },
      { 'Nº': 9, 'Título': 'ok' },
    ]
    const plan = planImport(rows, { mapping, dedupKeys: ['numero'] })

    expect(plan.problems).toHaveLength(1)
    expect(plan.problems[0]?.index).toBe(0)
    expect(plan.toCreate.map((r) => r.numero)).toEqual([9])
    expect(plan.summary.problemas).toBe(1)
  })
})
