import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { listEpisodesWithDates } from '@/data/repositories/episodios'
import { listMessageTemplates } from '@/data/repositories/messageTemplates'
import { progressByEpisode } from '@/data/repositories/checklists'
import { completeTask, createTask, listOpenTasks } from '@/data/repositories/tasks'
import { computeReminderDate, parseRegraLembrete } from '@/domain/messages/reminders'

function fmtDia(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
const MS_DIA = 86_400_000

export function HojePage() {
  const qc = useQueryClient()
  const episodes = useQuery({ queryKey: ['episodes-dates'], queryFn: () => listEpisodesWithDates() })
  const templates = useQuery({ queryKey: ['message-templates'], queryFn: () => listMessageTemplates() })
  const progresso = useQuery({ queryKey: ['board-progress'], queryFn: () => progressByEpisode() })
  const tarefas = useQuery({ queryKey: ['open-tasks'], queryFn: () => listOpenTasks() })
  const [novaTarefa, setNovaTarefa] = useState('')

  const agora = Date.now()

  const lembretes = useMemo(() => {
    if (!episodes.data || !templates.data) return []
    const out: Array<{ key: string; data: Date; modelo: string; episodio: string; overdue: boolean }> = []
    for (const ep of episodes.data) {
      const nome = ep.titulo || ep.tema || (ep.numero ? `#${ep.numero}` : 'Episódio')
      for (const t of templates.data) {
        const regra = parseRegraLembrete(t.regra_lembrete)
        const d = computeReminderDate(regra, ep)
        if (!d) continue
        const diff = d.getTime() - agora
        if (diff <= 7 * MS_DIA) {
          out.push({ key: `${ep.id}-${t.id}`, data: d, modelo: t.nome, episodio: nome, overdue: diff < -MS_DIA })
        }
      }
    }
    return out.sort((a, b) => a.data.getTime() - b.data.getTime())
  }, [episodes.data, templates.data, agora])

  const proximasGravacoes = useMemo(() => {
    if (!episodes.data) return []
    return episodes.data
      .filter((e) => e.data_gravacao && new Date(e.data_gravacao).getTime() >= agora - MS_DIA)
      .sort((a, b) => new Date(a.data_gravacao!).getTime() - new Date(b.data_gravacao!).getTime())
      .slice(0, 5)
  }, [episodes.data, agora])

  const checklistPendentes = useMemo(() => {
    if (!episodes.data || !progresso.data) return []
    const nomeById = new Map(episodes.data.map((e) => [e.id, e.titulo || e.tema || `#${e.numero ?? ''}`]))
    const out: Array<{ id: string; nome: string; pendentes: number }> = []
    for (const [key, prog] of Object.entries(progresso.data)) {
      if (prog.obrigatoriosPendentes > 0) {
        const epId = key.split(':')[0]!
        const ep = episodes.data.find((e) => e.id === epId)
        if (ep && ep.stage_id && key === `${epId}:${ep.stage_id}`) {
          out.push({ id: epId, nome: nomeById.get(epId) ?? 'Episódio', pendentes: prog.obrigatoriosPendentes })
        }
      }
    }
    return out
  }, [episodes.data, progresso.data])

  const addTarefa = useMutation({
    mutationFn: () => createTask({ titulo: novaTarefa.trim(), origem: 'manual' }),
    onSuccess: () => {
      setNovaTarefa('')
      qc.invalidateQueries({ queryKey: ['open-tasks'] })
    },
  })
  const concluir = useMutation({
    mutationFn: (id: string) => completeTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['open-tasks'] }),
  })

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <h1 className="text-xl font-semibold tracking-tight">Hoje</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lembretes sugeridos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lembretes.length === 0 && <p className="text-sm text-muted-foreground">Nada nos próximos 7 dias.</p>}
            {lembretes.map((l) => (
              <div key={l.key} className="flex items-center gap-2 text-sm">
                <Badge variant={l.overdue ? 'destructive' : 'secondary'}>{fmtDia(l.data)}</Badge>
                <span className="min-w-0 flex-1 truncate">
                  <strong>{l.modelo}</strong> · {l.episodio}
                </span>
                <Link to="/comunicacao" className="text-xs text-primary underline">
                  gerar
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximas gravações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {proximasGravacoes.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma agendada.</p>}
            {proximasGravacoes.map((e) => (
              <div key={e.id} className="flex items-center gap-2 text-sm">
                <Badge variant="outline">{fmtDia(new Date(e.data_gravacao!))}</Badge>
                <Link to={`/episodios/${e.id}`} className="min-w-0 flex-1 truncate hover:underline">
                  {e.titulo || e.tema || 'Sem tema'}
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pendências de checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {checklistPendentes.length === 0 && <p className="text-sm text-muted-foreground">Tudo em dia.</p>}
            {checklistPendentes.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-sm">
                <Badge variant="destructive">{c.pendentes}</Badge>
                <Link to="/kanban" className="min-w-0 flex-1 truncate hover:underline">
                  {c.nome}
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Minhas tarefas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                if (novaTarefa.trim()) addTarefa.mutate()
              }}
              className="flex gap-2"
            >
              <Input placeholder="Nova pendência…" value={novaTarefa} onChange={(e) => setNovaTarefa(e.target.value)} />
              <Button type="submit" size="sm" disabled={addTarefa.isPending}>
                +
              </Button>
            </form>
            {tarefas.data?.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-primary" onChange={() => concluir.mutate(t.id)} />
                <span className="min-w-0 flex-1 truncate">{t.titulo}</span>
                {t.vence_em && (
                  <span className="text-xs text-muted-foreground">{fmtDia(new Date(t.vence_em))}</span>
                )}
              </div>
            ))}
            {(tarefas.data?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Sem pendências.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
