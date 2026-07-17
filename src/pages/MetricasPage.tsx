import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getEpisodeFacts, getGuestFacts } from '@/data/repositories/metricsRepo'
import {
  avgPlaysByEixo,
  genderParity,
  weightedAvgDurationByMonth,
  type EpisodeFact,
  type GuestFact,
} from '@/domain/metrics/engine'

function baixarCSV<T extends object>(nome: string, rows: T[]) {
  if (rows.length === 0) return
  const cols = Object.keys(rows[0]!)
  const linhas = [
    cols.join(','),
    ...rows.map((r) =>
      cols.map((c) => JSON.stringify((r as Record<string, unknown>)[c] ?? '')).join(','),
    ),
  ]
  const blob = new Blob([linhas.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nome}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function MetricasPage() {
  const episodeFacts = useQuery({ queryKey: ['metrics', 'episodes'], queryFn: () => getEpisodeFacts() })
  const guestFacts = useQuery({ queryKey: ['metrics', 'guests'], queryFn: () => getGuestFacts() })
  const [ano, setAno] = useState<string>('todos')

  const anos = useMemo(() => {
    const s = new Set<string>()
    for (const e of episodeFacts.data ?? []) if (e.mes) s.add(e.mes.slice(0, 4))
    for (const g of guestFacts.data ?? []) if (g.mes) s.add(g.mes.slice(0, 4))
    return [...s].sort()
  }, [episodeFacts.data, guestFacts.data])

  const eps: EpisodeFact[] = useMemo(() => {
    const all = episodeFacts.data ?? []
    return ano === 'todos' ? all : all.filter((e) => e.mes?.startsWith(ano))
  }, [episodeFacts.data, ano])
  const guests: GuestFact[] = useMemo(() => {
    const all = guestFacts.data ?? []
    return ano === 'todos' ? all : all.filter((g) => g.mes?.startsWith(ano))
  }, [guestFacts.data, ano])

  const porEixo = useMemo(() => avgPlaysByEixo(eps), [eps])
  const duracao = useMemo(
    () => weightedAvgDurationByMonth(eps).map((d) => ({ mes: d.mes, min: Math.round(d.duracaoMediaSeg / 60) })),
    [eps],
  )
  const paridade = useMemo(() => genderParity(guests), [guests])
  const paridadeMes = paridade.porMes.map((m) => ({ mes: m.mes, feminino: Math.round(m.propFeminino * 100) }))

  const loading = episodeFacts.isLoading || guestFacts.isLoading

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Métricas</h1>
        <div className="flex gap-1">
          <Button variant={ano === 'todos' ? 'default' : 'outline'} size="sm" onClick={() => setAno('todos')}>
            Tudo
          </Button>
          {anos.map((a) => (
            <Button key={a} variant={ano === a ? 'default' : 'outline'} size="sm" onClick={() => setAno(a)}>
              {a}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="ml-auto print:hidden" onClick={() => window.print()}>
          Relatório (PDF)
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {!loading && (episodeFacts.data?.length ?? 0) === 0 && (
        <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Sem dados ainda. Importe métricas em <strong>Importar</strong> (preset “Spotify for Creators”)
          e preencha datas/eixos/convidados nos episódios.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Média de plays por eixo</CardTitle>
            <button className="text-xs text-primary underline print:hidden" onClick={() => baixarCSV('plays-por-eixo', porEixo)}>
              CSV
            </button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={porEixo} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="eixo" width={110} fontSize={11} />
                <Tooltip />
                <Bar dataKey="media" fill="hsl(222 47% 40%)" name="média de plays" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Duração média (min) ponderada por streams</CardTitle>
            <button className="text-xs text-primary underline print:hidden" onClick={() => baixarCSV('duracao-por-mes', duracao)}>
              CSV
            </button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={duracao}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="min" stroke="hsl(222 47% 40%)" name="min" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Paridade de gênero dos convidados</CardTitle>
            <button
              className="text-xs text-primary underline print:hidden"
              onClick={() => baixarCSV('paridade', paridade.porMes)}
            >
              CSV
            </button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="secondary">Feminino: {paridade.total.feminino}</Badge>
              <Badge variant="secondary">Masculino: {paridade.total.masculino}</Badge>
              <Badge variant="outline">Outro: {paridade.total.outro}</Badge>
              <Badge variant="outline">Não informado: {paridade.total.nao_informado}</Badge>
              <Badge>Proporção feminina: {Math.round(paridade.total.propFeminino * 100)}%</Badge>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={paridadeMes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" fontSize={11} />
                <YAxis domain={[0, 100]} fontSize={11} unit="%" />
                <Tooltip />
                <Bar dataKey="feminino" fill="hsl(280 50% 45%)" name="% feminino" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
