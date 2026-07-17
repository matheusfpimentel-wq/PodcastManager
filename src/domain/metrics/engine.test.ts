import { describe, expect, it } from 'vitest'
import {
  avgPlaysByEixo,
  genderParity,
  mesDe,
  weightedAvgDurationByMonth,
  type EpisodeFact,
  type GuestFact,
} from './engine'

const eps: EpisodeFact[] = [
  { episodeId: 'a', eixo: 'Patrimônio Público', mes: '2026-06', plays: 1000, duracaoSeg: 3000 },
  { episodeId: 'b', eixo: 'Patrimônio Público', mes: '2026-06', plays: 3000, duracaoSeg: 3600 },
  { episodeId: 'c', eixo: 'Consumidor', mes: '2026-07', plays: 500, duracaoSeg: 2400 },
  { episodeId: 'd', eixo: null, mes: null, plays: 200, duracaoSeg: null },
]

describe('avgPlaysByEixo', () => {
  it('média de plays por eixo, ordenada desc', () => {
    const r = avgPlaysByEixo(eps)
    expect(r[0]).toEqual({ eixo: 'Patrimônio Público', media: 2000, episodios: 2 })
    expect(r.find((x) => x.eixo === 'Consumidor')?.media).toBe(500)
    expect(r.find((x) => x.eixo === 'Sem eixo')?.media).toBe(200)
  })
})

describe('weightedAvgDurationByMonth', () => {
  it('pondera a duração pelos streams', () => {
    // 2026-06: (3000*1000 + 3600*3000) / (1000+3000) = 13.8M/4000 = 3450
    const r = weightedAvgDurationByMonth(eps)
    expect(r.find((x) => x.mes === '2026-06')?.duracaoMediaSeg).toBe(3450)
    expect(r.find((x) => x.mes === '2026-07')?.duracaoMediaSeg).toBe(2400)
    // episódio sem mês/duração é ignorado
    expect(r.some((x) => x.mes === null)).toBe(false)
  })
})

describe('genderParity', () => {
  const guests: GuestFact[] = [
    { mes: '2026-06', genero: 'feminino' },
    { mes: '2026-06', genero: 'masculino' },
    { mes: '2026-07', genero: 'feminino' },
    { mes: '2026-07', genero: 'nao_informado' },
  ]
  it('acumulado e por mês, com proporção feminina', () => {
    const r = genderParity(guests)
    expect(r.total).toMatchObject({ feminino: 2, masculino: 1, nao_informado: 1, total: 4 })
    expect(r.total.propFeminino).toBe(0.5)
    expect(r.porMes.find((m) => m.mes === '2026-06')?.propFeminino).toBe(0.5)
  })
})

describe('mesDe', () => {
  it('extrai YYYY-MM (UTC) ou null', () => {
    expect(mesDe('2026-07-14T10:00:00Z')).toBe('2026-07')
    expect(mesDe('2026-12-01')).toBe('2026-12')
    expect(mesDe(null)).toBeNull()
    expect(mesDe('xx')).toBeNull()
  })
})
