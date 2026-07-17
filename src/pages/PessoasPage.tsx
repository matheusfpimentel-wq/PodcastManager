import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { deletePessoa, listPessoas } from '@/data/repositories/pessoas'
import type { Pessoa } from '@/data/types'
import { PessoaForm } from './pessoas/PessoaForm'

export function PessoasPage() {
  const qc = useQueryClient()
  const [busca, setBusca] = useState('')
  const [debounced, setDebounced] = useState('')
  const [editing, setEditing] = useState<Pessoa | null | 'new'>(null)

  // debounce simples da busca
  useEffect(() => {
    const id = setTimeout(() => setDebounced(busca), 300)
    return () => clearTimeout(id)
  }, [busca])

  const pessoas = useQuery({
    queryKey: ['pessoas', debounced],
    queryFn: () => listPessoas({ busca: debounced }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deletePessoa(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pessoas'] }),
  })

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Pessoas</h1>
        <Button onClick={() => setEditing('new')}>Nova pessoa</Button>
      </div>

      <form
        className="mb-4"
        onSubmit={(e) => {
          e.preventDefault()
          setDebounced(busca)
        }}
      >
        <Input
          placeholder="Buscar por nome, cargo, comarca, tags…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onBlur={() => setDebounced(busca)}
        />
      </form>

      {pessoas.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {pessoas.isError && (
        <p className="text-sm text-destructive">
          {pessoas.error instanceof Error ? pessoas.error.message : 'Erro ao carregar'}
        </p>
      )}

      {pessoas.data && pessoas.data.length === 0 && (
        <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhuma pessoa ainda. Clique em “Nova pessoa”.
        </p>
      )}

      <ul className="divide-y divide-border rounded-md border border-border">
        {pessoas.data?.map((p) => (
          <li key={p.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">
                  {p.tratamento ? `${p.tratamento} ` : ''}
                  {p.nome}
                </span>
                {p.origem === 'at_membros' && (
                  <Badge variant="secondary" className="shrink-0">
                    AT MEMBROS
                  </Badge>
                )}
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {[p.cargo_atual, p.comarca_lotacao].filter(Boolean).join(' · ') || '—'}
              </p>
              {p.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {p.tags.map((t) => (
                    <Badge key={t} variant="outline">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>
              Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => {
                if (confirm(`Excluir ${p.nome}?`)) remove.mutate(p.id)
              }}
            >
              Excluir
            </Button>
          </li>
        ))}
      </ul>

      {editing !== null && (
        <PessoaForm pessoa={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
