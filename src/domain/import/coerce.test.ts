import { describe, expect, it } from 'vitest'
import { coerceRecord, coerceValue, parseDateLoose, parseIntLoose } from './coerce'

describe('parseIntLoose', () => {
  it('parses numbers and numeric strings', () => {
    expect(parseIntLoose(12)).toBe(12)
    expect(parseIntLoose('42')).toBe(42)
    expect(parseIntLoose(3.9)).toBe(3)
  })
  it('handles pt-BR thousand separators', () => {
    expect(parseIntLoose('1.234')).toBe(1234)
  })
  it('returns null for empty/invalid', () => {
    expect(parseIntLoose('')).toBeNull()
    expect(parseIntLoose('abc')).toBeNull()
    expect(parseIntLoose(null)).toBeNull()
  })
})

describe('parseDateLoose', () => {
  it('parses BR dd/mm/yyyy', () => {
    expect(parseDateLoose('14/07/2026')?.toISOString().slice(0, 10)).toBe('2026-07-14')
  })
  it('parses ISO', () => {
    expect(parseDateLoose('2026-07-14')?.toISOString().slice(0, 10)).toBe('2026-07-14')
  })
  it('returns null for invalid', () => {
    expect(parseDateLoose('não é data')).toBeNull()
    expect(parseDateLoose('')).toBeNull()
  })
  it('converte serial do Excel (número e string numérica)', () => {
    // 45000 ≈ 2023-03-15 (época 1899-12-30)
    expect(parseDateLoose(45000)?.toISOString().slice(0, 10)).toBe('2023-03-15')
    expect(parseDateLoose('45000')?.toISOString().slice(0, 10)).toBe('2023-03-15')
  })
  it('rejeita datas com ano implausível (bug +043738)', () => {
    // "43738" que o JS leria como ANO 43738 → serial válido (≈2019), não quebra
    expect(parseDateLoose('43738')?.toISOString().slice(0, 4)).toBe('2019')
    // valores absurdos → null (não estouram o Postgres)
    expect(parseDateLoose('9999999')).toBeNull() // serial fora do range
    expect(parseDateLoose(new Date('+043738-01-01T03:00:00Z'))).toBeNull() // ano implausível
  })
})

describe('coerceValue', () => {
  it('coerces by type', () => {
    expect(coerceValue('  Olá  ', 'text')).toBe('Olá')
    expect(coerceValue('  ', 'text')).toBeNull()
    expect(coerceValue('7', 'int')).toBe(7)
    expect(coerceValue('14/07/2026', 'date')).toBe('2026-07-14')
    expect(coerceValue('14/07/2026', 'timestamp')).toMatch(/^2026-07-14T/)
  })
})

describe('coerceRecord', () => {
  it('coerces only the declared fields with their types', () => {
    const rec = { numero: '12', titulo: ' Ep ', data_gravacao: '14/07/2026', ignorar: 'x' }
    const out = coerceRecord(rec, [
      { key: 'numero', label: 'Número', type: 'int' },
      { key: 'titulo', label: 'Título' },
      { key: 'data_gravacao', label: 'Gravação', type: 'timestamp' },
    ])
    expect(out).toEqual({
      numero: 12,
      titulo: 'Ep',
      data_gravacao: expect.stringMatching(/^2026-07-14T/),
    })
    expect(out).not.toHaveProperty('ignorar')
  })
})
