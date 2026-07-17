import { useMemo, useState, type FormEvent } from 'react'
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { listStages } from '@/data/repositories/stages'
import {
  createEpisodio,
  listBoardEpisodes,
  moveToStage,
  type BoardEpisode,
} from '@/data/repositories/episodios'
import { progressByEpisode, type StageProgress } from '@/data/repositories/checklists'
import type { PipelineStage } from '@/data/types'
import { ChecklistDrawer } from './kanban/ChecklistDrawer'

function EpisodeCard({
  ep,
  progress,
  onOpen,
}: {
  ep: BoardEpisode
  progress?: StageProgress
  onOpen: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: ep.id })
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 40 }
    : undefined
  const titulo = ep.titulo || ep.tema || 'Sem tema'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`cursor-grab rounded-md border border-border bg-background p-3 shadow-sm active:cursor-grabbing ${
        isDragging ? 'opacity-60' : ''
      }`}
      {...listeners}
      {...attributes}
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-tight">{titulo}</span>
        {ep.numero != null && (
          <Badge variant="outline" className="shrink-0">
            #{ep.numero}
          </Badge>
        )}
      </div>
      {ep.convidados.length > 0 && (
        <p className="mt-1 truncate text-xs text-muted-foreground">{ep.convidados.join(', ')}</p>
      )}
      <div className="mt-2 flex items-center gap-2">
        {ep.data_gravacao && (
          <span className="text-xs text-muted-foreground">
            🎙 {new Date(ep.data_gravacao).toLocaleDateString('pt-BR')}
          </span>
        )}
        {progress && progress.total > 0 && (
          <Badge
            variant={progress.done === progress.total ? 'secondary' : 'outline'}
            className="ml-auto"
          >
            ✓ {progress.done}/{progress.total}
          </Badge>
        )}
      </div>
    </div>
  )
}

function Column({
  stage,
  episodes,
  progressMap,
  onOpen,
}: {
  stage: PipelineStage
  episodes: BoardEpisode[]
  progressMap: Record<string, StageProgress>
  onOpen: (ep: BoardEpisode) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="h-3 w-3 rounded-full" style={{ background: stage.cor ?? '#94a3b8' }} />
        <h2 className="text-sm font-semibold">{stage.nome}</h2>
        <span className="text-xs text-muted-foreground">{episodes.length}</span>
        {stage.exige_checklist_completo && (
          <Badge variant="outline" className="ml-auto text-[10px]">
            checklist p/ sair
          </Badge>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-32 flex-1 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors ${
          isOver ? 'border-primary bg-accent/50' : 'border-border'
        }`}
      >
        {episodes.map((ep) => (
          <EpisodeCard
            key={ep.id}
            ep={ep}
            progress={progressMap[`${ep.id}:${ep.stage_id}`]}
            onOpen={() => onOpen(ep)}
          />
        ))}
        {episodes.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">vazio</p>
        )}
      </div>
    </div>
  )
}

export function KanbanPage() {
  const qc = useQueryClient()
  const [novaOpen, setNovaOpen] = useState(false)
  const [tema, setTema] = useState('')
  const [drawer, setDrawer] = useState<{ ep: BoardEpisode; stage: PipelineStage } | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const stages = useQuery({ queryKey: ['stages'], queryFn: () => listStages() })
  const episodes = useQuery({ queryKey: ['board'], queryFn: () => listBoardEpisodes() })
  const progress = useQuery({ queryKey: ['board-progress'], queryFn: () => progressByEpisode() })

  const firstStage = stages.data?.[0]

  const move = useMutation({
    mutationFn: ({ episodeId, stageId }: { episodeId: string; stageId: string }) =>
      moveToStage(episodeId, stageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board'] })
      qc.invalidateQueries({ queryKey: ['board-progress'] })
    },
    onError: (e) => alert(e instanceof Error ? e.message : 'Falha ao mover'),
  })

  const criar = useMutation({
    mutationFn: () => {
      if (!firstStage) throw new Error('Nenhuma etapa configurada')
      return createEpisodio({ tema: tema.trim() || null }, firstStage.id)
    },
    onSuccess: () => {
      setTema('')
      setNovaOpen(false)
      qc.invalidateQueries({ queryKey: ['board'] })
    },
    onError: (e) => alert(e instanceof Error ? e.message : 'Falha ao criar'),
  })

  const byStage = useMemo(() => {
    const map = new Map<string, BoardEpisode[]>()
    for (const s of stages.data ?? []) map.set(s.id, [])
    for (const ep of episodes.data ?? []) {
      const bucket = ep.stage_id && map.has(ep.stage_id) ? ep.stage_id : firstStage?.id
      if (bucket) map.get(bucket)!.push(ep)
    }
    return map
  }, [stages.data, episodes.data, firstStage?.id])

  function onDragEnd(e: DragEndEvent) {
    const episodeId = String(e.active.id)
    const overId = e.over ? String(e.over.id) : null
    if (!overId) return
    const ep = (episodes.data ?? []).find((x) => x.id === episodeId)
    if (!ep || ep.stage_id === overId) return

    // Enforcement: sair de uma etapa que exige checklist completo.
    const src = (stages.data ?? []).find((s) => s.id === ep.stage_id)
    if (src?.exige_checklist_completo) {
      const prog = progress.data?.[`${ep.id}:${ep.stage_id}`]
      if (prog && prog.obrigatoriosPendentes > 0) {
        alert(
          `“${src.nome}” exige o checklist obrigatório completo para avançar (${prog.obrigatoriosPendentes} item(ns) pendente(s)).`,
        )
        return
      }
    }
    move.mutate({ episodeId, stageId: overId })
  }

  if (stages.isLoading || episodes.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando quadro…</p>
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Produção</h1>
        <Button onClick={() => setNovaOpen(true)}>Nova pauta</Button>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {(stages.data ?? []).map((stage) => (
            <Column
              key={stage.id}
              stage={stage}
              episodes={byStage.get(stage.id) ?? []}
              progressMap={progress.data ?? {}}
              onOpen={(ep) => setDrawer({ ep, stage })}
            />
          ))}
        </div>
      </DndContext>

      {novaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg">
            <h2 className="mb-3 text-lg font-semibold">Nova pauta</h2>
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                criar.mutate()
              }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label htmlFor="tema">Tema / ideia</Label>
                <Input
                  id="tema"
                  autoFocus
                  placeholder="Ex.: Improbidade administrativa após a nova lei"
                  value={tema}
                  onChange={(e) => setTema(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Entra em <strong>{firstStage?.nome ?? 'primeira etapa'}</strong>. Convidado e datas
                  vêm depois.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setNovaOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={criar.isPending}>
                  {criar.isPending ? 'Criando…' : 'Criar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {drawer && (
        <ChecklistDrawer episode={drawer.ep} stage={drawer.stage} onClose={() => setDrawer(null)} />
      )}
    </div>
  )
}
