import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { searchGlobal } from '@/data/repositories/search'

export function AcervoPage() {
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const id = setTimeout(() => setDebounced(term), 300)
    return () => clearTimeout(id)
  }, [term])

  const results = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => searchGlobal(debounced),
    enabled: debounced.trim().length >= 2,
  })

  const r = results.data
  const vazio = r && r.pessoas.length === 0 && r.episodios.length === 0 && r.citacoes.length === 0

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Acervo</h1>
      <Input
        placeholder="Buscar julgado, tema, pessoa… (ex.: “REsp 123”, “improbidade”)"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        autoFocus
      />
      <p className="text-xs text-muted-foreground">
        Busca em pessoas, episódios e citações. Use para responder “já cobrimos este julgado/tema?”.
      </p>

      {results.isFetching && <p className="text-sm text-muted-foreground">Buscando…</p>}
      {vazio && <p className="text-sm text-muted-foreground">Nada encontrado.</p>}

      {r && r.citacoes.length > 0 && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-muted-foreground">Citações / julgados</h2>
          <ul className="divide-y divide-border rounded-md border border-border text-sm">
            {r.citacoes.map((c) => (
              <li key={c.id} className="p-2">
                <Link to={`/episodios/${c.episodio_id}`} className="flex flex-wrap items-center gap-2 hover:underline">
                  <Badge variant="secondary">{c.tipo ?? '—'}</Badge>
                  <span className="font-medium">{c.identificador ?? 's/ número'}</span>
                  {c.orgao && <span className="text-muted-foreground">· {c.orgao}</span>}
                  {c.status_verificacao === 'a_confirmar' && <Badge variant="destructive">a confirmar</Badge>}
                </Link>
                {c.o_que_fixou && <p className="text-muted-foreground">{c.o_que_fixou}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {r && r.episodios.length > 0 && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-muted-foreground">Episódios</h2>
          <ul className="divide-y divide-border rounded-md border border-border text-sm">
            {r.episodios.map((e) => (
              <li key={e.id}>
                <Link to={`/episodios/${e.id}`} className="flex items-center gap-2 p-2 hover:bg-accent/50">
                  {e.numero != null && <Badge variant="outline">#{e.numero}</Badge>}
                  <span>{e.titulo || e.tema || 'Sem tema'}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {r && r.pessoas.length > 0 && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-muted-foreground">Pessoas</h2>
          <ul className="divide-y divide-border rounded-md border border-border text-sm">
            {r.pessoas.map((p) => (
              <li key={p.id} className="p-2">
                <span className="font-medium">{p.nome}</span>
                <span className="text-muted-foreground">
                  {[p.cargo_atual, p.comarca_lotacao].filter(Boolean).join(' · ') ? ` — ${[p.cargo_atual, p.comarca_lotacao].filter(Boolean).join(' · ')}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
