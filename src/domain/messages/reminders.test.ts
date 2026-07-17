import { describe, expect, it } from 'vitest'
import {
  computeReminderDate,
  isSameOrBeforeDay,
  parseRegraLembrete,
} from './reminders'

describe('parseRegraLembrete', () => {
  it('aceita regra válida e normaliza offset', () => {
    expect(parseRegraLembrete({ base: 'data_gravacao', offset_dias: -1 })).toEqual({
      base: 'data_gravacao',
      offset_dias: -1,
    })
    expect(parseRegraLembrete({ base: 'data_lancamento' })).toEqual({
      base: 'data_lancamento',
      offset_dias: 0,
    })
  })
  it('rejeita inválidas', () => {
    expect(parseRegraLembrete(null)).toBeNull()
    expect(parseRegraLembrete({ base: 'foo' })).toBeNull()
  })
})

describe('computeReminderDate', () => {
  it('D−1 da gravação', () => {
    const d = computeReminderDate(
      { base: 'data_gravacao', offset_dias: -1 },
      { data_gravacao: '2026-07-14T10:00:00Z' },
    )
    expect(d?.toISOString().slice(0, 10)).toBe('2026-07-13')
  })
  it('D0 do lançamento', () => {
    const d = computeReminderDate(
      { base: 'data_lancamento', offset_dias: 0 },
      { data_lancamento: '2026-07-20' },
    )
    expect(d?.toISOString().slice(0, 10)).toBe('2026-07-20')
  })
  it('null quando falta a data-base', () => {
    expect(computeReminderDate({ base: 'data_gravacao' }, {})).toBeNull()
    expect(computeReminderDate(null, { data_gravacao: '2026-07-14' })).toBeNull()
  })
})

describe('isSameOrBeforeDay', () => {
  it('compara só a data', () => {
    expect(isSameOrBeforeDay(new Date('2026-07-13T23:00:00Z'), new Date('2026-07-14T01:00:00Z'))).toBe(true)
    expect(isSameOrBeforeDay(new Date('2026-07-15T00:00:00Z'), new Date('2026-07-14T23:00:00Z'))).toBe(false)
  })
})
