import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { listBoardEpisodes } from '@/data/repositories/episodios'

export function EpisodiosPage() {
  const episodes = useQuery({ queryKey: ['board'], queryFn: () => listBoardEpisodes() })

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Episódios</h1>

      {episodes.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {episodes.data && episodes.data.length === 0 && (
        <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhum episódio ainda. Crie uma pauta na aba <strong>Produção</strong>.
        </p>
      )}

      <ul className="divide-y divide-border rounded-md border border-border">
        {episodes.data?.map((ep) => (
          <li key={ep.id}>
            <Link to={`/episodios/${ep.id}`} className="flex items-center gap-3 p-3 hover:bg-accent/50">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {ep.numero != null && <Badge variant="outline">#{ep.numero}</Badge>}
                  <span className="truncate font-medium">{ep.titulo || ep.tema || 'Sem tema'}</span>
                </div>
                {ep.convidados.length > 0 && (
                  <p className="truncate text-sm text-muted-foreground">{ep.convidados.join(', ')}</p>
                )}
              </div>
              <span className="text-sm text-muted-foreground">Roteiro →</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
