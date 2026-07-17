import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  createCitacao,
  deleteCitacao,
  listCitacoes,
  updateCitacao,
  type Citacao,
} from '@/data/repositories/citacoes'

const TIPOS = ['REsp', 'HC', 'RE', 'Tema', 'Súmula', 'Lei', 'PL', 'Dado', 'Outro']

export function CitacoesTab({ episodeId }: { episodeId: string }) {
  const qc = useQueryClient()
  const citacoes = useQuery({
    queryKey: ['citacoes', episodeId],
    queryFn: () => listCitacoes(episodeId),
  })

  const [tipo, setTipo] = useState('REsp')
  const [identificador, setIdentificador] = useState('')
  const [orgao, setOrgao] = useState('')
  const [oQueFixou, setOQueFixou] = useState('')
  const [fonteUrl, setFonteUrl] = useState('')

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['citacoes', episodeId] })
    qc.invalidateQueries({ queryKey: ['citacoes-count', episodeId] })
  }

  const add = useMutation({
    mutationFn: () =>
      createCitacao({
        episodio_id: episodeId,
        tipo,
        identificador: identificador.trim() || null,
        orgao: orgao.trim() || null,
        o_que_fixou: oQueFixou.trim() || null,
        fonte_url: fonteUrl.trim() || null,
        status_verificacao: 'a_confirmar',
      }),
    onSuccess: () => {
      setIdentificador('')
      setOrgao('')
      setOQueFixou('')
      setFonteUrl('')
      invalidate()
    },
  })

  const toggleStatus = useMutation({
    mutationFn: (c: Citacao) =>
      updateCitacao(c.id, {
        status_verificacao: c.status_verificacao === 'verificado' ? 'a_confirmar' : 'verificado',
      }),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteCitacao(id),
    onSuccess: invalidate,
  })

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          add.mutate()
        }}
        className="grid grid-cols-2 gap-2 rounded-md border border-border p-3 md:grid-cols-6"
      >
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          {TIPOS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <Input placeholder="Número/ID" value={identificador} onChange={(e) => setIdentificador(e.target.value)} />
        <Input placeholder="Órgão" value={orgao} onChange={(e) => setOrgao(e.target.value)} />
        <Input
          className="md:col-span-2"
          placeholder="O que fixou"
          value={oQueFixou}
          onChange={(e) => setOQueFixou(e.target.value)}
        />
        <Input placeholder="Fonte (URL)" value={fonteUrl} onChange={(e) => setFonteUrl(e.target.value)} />
        <Button type="submit" className="md:col-span-6" disabled={add.isPending}>
          {add.isPending ? 'Adicionando…' : 'Adicionar citação'}
        </Button>
      </form>

      {citacoes.data && citacoes.data.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma citação registrada.</p>
      )}

      <ul className="divide-y divide-border rounded-md border border-border">
        {citacoes.data?.map((c) => (
          <li key={c.id} className="flex items-start gap-3 p-3 text-sm">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{c.tipo ?? '—'}</Badge>
                <span className="font-medium">{c.identificador ?? 's/ número'}</span>
                {c.orgao && <span className="text-muted-foreground">· {c.orgao}</span>}
                <button
                  type="button"
                  onClick={() => toggleStatus.mutate(c)}
                  title="Alternar verificação"
                >
                  <Badge variant={c.status_verificacao === 'verificado' ? 'secondary' : 'destructive'}>
                    {c.status_verificacao === 'verificado' ? 'verificado' : 'a confirmar'}
                  </Badge>
                </button>
              </div>
              {c.o_que_fixou && <p className="mt-1">{c.o_que_fixou}</p>}
              {c.fonte_url && (
                <a
                  href={c.fonte_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary underline"
                >
                  fonte
                </a>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => remove.mutate(c.id)}
            >
              Excluir
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
