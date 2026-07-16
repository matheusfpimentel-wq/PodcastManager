import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { getStageChecklist, toggleCheck } from '@/data/repositories/checklists'
import type { BoardEpisode } from '@/data/repositories/episodios'
import type { PipelineStage } from '@/data/types'

interface Props {
  episode: BoardEpisode
  stage: PipelineStage
  onClose: () => void
}

/** Painel lateral com o checklist do episódio na sua etapa atual. */
export function ChecklistDrawer({ episode, stage, onClose }: Props) {
  const qc = useQueryClient()
  const checklist = useQuery({
    queryKey: ['checklist', episode.id, stage.id],
    queryFn: () => getStageChecklist(episode.id, stage.id),
  })

  const toggle = useMutation({
    mutationFn: ({ checkId, concluido }: { checkId: string; concluido: boolean }) =>
      toggleCheck(checkId, concluido),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checklist', episode.id, stage.id] })
      qc.invalidateQueries({ queryKey: ['board-progress'] })
    },
  })

  const titulo = episode.titulo || episode.tema || (episode.numero ? `#${episode.numero}` : 'Episódio')

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        className="h-full w-full max-w-sm overflow-y-auto border-l border-border bg-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Etapa: <span style={{ color: stage.cor ?? undefined }}>{stage.nome}</span>
        </p>

        {checklist.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {checklist.data === null && !checklist.isLoading && (
          <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Esta etapa não tem checklist.
          </p>
        )}

        {checklist.data && (
          <ul className="space-y-2">
            {checklist.data.checks.map((c) => (
              <li key={c.checkId} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-primary"
                  checked={c.concluido}
                  onChange={(e) => toggle.mutate({ checkId: c.checkId, concluido: e.target.checked })}
                />
                <span className={c.concluido ? 'text-muted-foreground line-through' : ''}>
                  {c.label}
                  {c.obrigatorio && <span className="ml-1 text-destructive">*</span>}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </aside>
    </div>
  )
}
