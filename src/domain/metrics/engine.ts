/**
 * Motor de métricas (spec §6.8) — funções puras métrica × dimensão × período.
 * Os 3 widgets seed são casos deste motor. Sem persistência/React.
 */

export interface EpisodeFact {
  episodeId: string
  eixo: string | null // nome do eixo (null → "Sem eixo")
  mes: string | null // 'YYYY-MM' (do lançamento)
  plays: number
  duracaoSeg: number | null
}

export interface GuestFact {
  mes: string | null
  genero: string // feminino | masculino | outro | nao_informado
}

const SEM_EIXO = 'Sem eixo'

/** 1) Média de plays por eixo temático. */
export function avgPlaysByEixo(
  episodes: EpisodeFact[],
): Array<{ eixo: string; media: number; episodios: number }> {
  const acc = new Map<string, { soma: number; n: number }>()
  for (const e of episodes) {
    const key = e.eixo ?? SEM_EIXO
    const cur = acc.get(key) ?? { soma: 0, n: 0 }
    cur.soma += e.plays
    cur.n += 1
    acc.set(key, cur)
  }
  return [...acc.entries()]
    .map(([eixo, { soma, n }]) => ({ eixo, media: n ? Math.round(soma / n) : 0, episodios: n }))
    .sort((a, b) => b.media - a.media)
}

/** 2) Duração média PONDERADA por streams, por mês (segundos). */
export function weightedAvgDurationByMonth(
  episodes: EpisodeFact[],
): Array<{ mes: string; duracaoMediaSeg: number }> {
  const acc = new Map<string, { somaPond: number; somaPlays: number; somaDur: number; n: number }>()
  for (const e of episodes) {
    if (!e.mes || e.duracaoSeg == null) continue
    const cur = acc.get(e.mes) ?? { somaPond: 0, somaPlays: 0, somaDur: 0, n: 0 }
    cur.somaPond += e.duracaoSeg * e.plays
    cur.somaPlays += e.plays
    cur.somaDur += e.duracaoSeg
    cur.n += 1
    acc.set(e.mes, cur)
  }
  return [...acc.entries()]
    .map(([mes, { somaPond, somaPlays, somaDur, n }]) => ({
      mes,
      // sem plays no mês → cai para média simples das durações
      duracaoMediaSeg: somaPlays > 0 ? Math.round(somaPond / somaPlays) : n ? Math.round(somaDur / n) : 0,
    }))
    .sort((a, b) => a.mes.localeCompare(b.mes))
}

export interface ParityBucket {
  feminino: number
  masculino: number
  outro: number
  nao_informado: number
  total: number
  propFeminino: number
}

function emptyBucket(): ParityBucket {
  return { feminino: 0, masculino: 0, outro: 0, nao_informado: 0, total: 0, propFeminino: 0 }
}
function addGuest(b: ParityBucket, genero: string) {
  if (genero === 'feminino') b.feminino += 1
  else if (genero === 'masculino') b.masculino += 1
  else if (genero === 'outro') b.outro += 1
  else b.nao_informado += 1
  b.total += 1
  b.propFeminino = b.total ? b.feminino / b.total : 0
}

/** 3) Paridade de gênero dos convidados — acumulada e por mês. */
export function genderParity(guests: GuestFact[]): {
  total: ParityBucket
  porMes: Array<{ mes: string } & ParityBucket>
} {
  const total = emptyBucket()
  const porMesMap = new Map<string, ParityBucket>()
  for (const g of guests) {
    addGuest(total, g.genero)
    if (g.mes) {
      const b = porMesMap.get(g.mes) ?? emptyBucket()
      addGuest(b, g.genero)
      porMesMap.set(g.mes, b)
    }
  }
  const porMes = [...porMesMap.entries()]
    .map(([mes, b]) => ({ mes, ...b }))
    .sort((a, b) => a.mes.localeCompare(b.mes))
  return { total, porMes }
}

/** Mês 'YYYY-MM' a partir de uma data ISO/date (ou null). */
export function mesDe(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}
