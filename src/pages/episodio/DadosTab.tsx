import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  getEpisodioEdit,
  listEpisodePessoas,
  updateEpisodio,
} from '@/data/repositories/episodios'
import { createEixo, listEixos } from '@/data/repositories/eixos'
import { addPessoaToEpisode, removePessoaFromEpisode } from '@/data/repositories/episodioPessoas'
import { listPessoas } from '@/data/repositories/pessoas'
import type { PapelEpisodio } from '@/data/types'

const PAPEIS: PapelEpisodio[] = ['convidado', 'host', 'participacao_especial', 'cogitado']

function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
function localInputToIso(v: string): string | null {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function PessoaPicker({ onPick }: { onPick: (id: string, nome: string) => void }) {
  const [busca, setBusca] = useState('')
  const results = useQuery({
    queryKey: ['pessoas-pick', busca],
    queryFn: () => listPessoas({ busca }),
    enabled: busca.trim().length >= 2,
  })
  return (
    <div>
      <Input placeholder="Buscar pessoa (2+ letras)…" value={busca} onChange={(e) => setBusca(e.target.value)} />
      {results.data && results.data.length > 0 && busca.trim().length >= 2 && (
        <ul className="mt-1 max-h-40 overflow-y-auto rounded-md border border-border">
          {results.data.slice(0, 8).map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => {
                  onPick(p.id, p.nome)
                  setBusca('')
                }}
              >
                {p.nome}
                {p.cargo_atual ? ` · ${p.cargo_atual}` : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function DadosTab({ episodeId }: { episodeId: string }) {
  const qc = useQueryClient()
  const ep = useQuery({ queryKey: ['episodio-edit', episodeId], queryFn: () => getEpisodioEdit(episodeId) })
  const eixos = useQuery({ queryKey: ['eixos'], queryFn: () => listEixos() })
  const pessoas = useQuery({
    queryKey: ['episode-pessoas', episodeId],
    queryFn: () => listEpisodePessoas(episodeId),
  })

  const [form, setForm] = useState({
    numero: '',
    titulo: '',
    tema: '',
    eixo_id: '',
    data_gravacao: '',
    data_lancamento: '',
    duracao_min: '',
    spotify: '',
    site_mppr: '',
    youtube: '',
    form_autorizacao_imagem: '',
    notas: '',
  })
  const [papelNovo, setPapelNovo] = useState<PapelEpisodio>('convidado')
  const [novoEixo, setNovoEixo] = useState('')

  useEffect(() => {
    if (!ep.data) return
    const l = ep.data.links
    setForm({
      numero: ep.data.numero?.toString() ?? '',
      titulo: ep.data.titulo ?? '',
      tema: ep.data.tema ?? '',
      eixo_id: ep.data.eixo_id ?? '',
      data_gravacao: isoToLocalInput(ep.data.data_gravacao),
      data_lancamento: ep.data.data_lancamento ?? '',
      duracao_min: ep.data.duracao_seg ? String(Math.round(ep.data.duracao_seg / 60)) : '',
      spotify: (l.spotify as string) ?? '',
      site_mppr: (l.site_mppr as string) ?? '',
      youtube: (l.youtube as string) ?? '',
      form_autorizacao_imagem: (l.form_autorizacao_imagem as string) ?? '',
      notas: ep.data.notas ?? '',
    })
  }, [ep.data])

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  const save = useMutation({
    mutationFn: () =>
      updateEpisodio(episodeId, {
        numero: form.numero.trim() ? Number(form.numero) : null,
        titulo: form.titulo.trim() || null,
        tema: form.tema.trim() || null,
        eixo_id: form.eixo_id || null,
        data_gravacao: localInputToIso(form.data_gravacao),
        data_lancamento: form.data_lancamento || null,
        duracao_seg: form.duracao_min.trim() ? Math.round(Number(form.duracao_min) * 60) : null,
        links: {
          ...ep.data?.links,
          spotify: form.spotify.trim(),
          site_mppr: form.site_mppr.trim(),
          youtube: form.youtube.trim(),
          form_autorizacao_imagem: form.form_autorizacao_imagem.trim(),
        },
        notas: form.notas.trim() || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['episodio-edit', episodeId] })
      qc.invalidateQueries({ queryKey: ['board'] })
      qc.invalidateQueries({ queryKey: ['episodio-header', episodeId] })
    },
  })

  const criarEixo = useMutation({
    mutationFn: () => createEixo({ nome: novoEixo.trim() }),
    onSuccess: (e) => {
      setNovoEixo('')
      qc.invalidateQueries({ queryKey: ['eixos'] })
      set('eixo_id', e.id)
    },
  })

  const vincular = useMutation({
    mutationFn: ({ id, papel }: { id: string; papel: PapelEpisodio }) =>
      addPessoaToEpisode(episodeId, id, papel),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['episode-pessoas', episodeId] }),
  })
  const desvincular = useMutation({
    mutationFn: ({ id, papel }: { id: string; papel: string }) =>
      removePessoaFromEpisode(episodeId, id, papel),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['episode-pessoas', episodeId] }),
  })

  if (ep.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Número</Label>
          <Input type="number" value={form.numero} onChange={(e) => set('numero', e.target.value)} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Título</Label>
          <Input value={form.titulo} onChange={(e) => set('titulo', e.target.value)} />
        </div>
        <div className="space-y-1.5 md:col-span-3">
          <Label>Tema</Label>
          <Input value={form.tema} onChange={(e) => set('tema', e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Eixo temático</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={form.eixo_id}
            onChange={(e) => set('eixo_id', e.target.value)}
          >
            <option value="">— sem eixo —</option>
            {eixos.data?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
          <div className="flex gap-1">
            <Input className="h-8" placeholder="Novo eixo…" value={novoEixo} onChange={(e) => setNovoEixo(e.target.value)} />
            <Button type="button" variant="outline" size="sm" disabled={!novoEixo.trim()} onClick={() => criarEixo.mutate()}>
              criar
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Data de gravação</Label>
          <Input type="datetime-local" value={form.data_gravacao} onChange={(e) => set('data_gravacao', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Data de lançamento</Label>
          <Input type="date" value={form.data_lancamento} onChange={(e) => set('data_lancamento', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Duração (min)</Label>
          <Input type="number" value={form.duracao_min} onChange={(e) => set('duracao_min', e.target.value)} />
        </div>
      </div>

      {/* Links */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Link Spotify</Label>
          <Input value={form.spotify} onChange={(e) => set('spotify', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Link site MPPR</Label>
          <Input value={form.site_mppr} onChange={(e) => set('site_mppr', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Link YouTube</Label>
          <Input value={form.youtube} onChange={(e) => set('youtube', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Form. autorização de imagem</Label>
          <Input value={form.form_autorizacao_imagem} onChange={(e) => set('form_autorizacao_imagem', e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Notas</Label>
        <Textarea value={form.notas} onChange={(e) => set('notas', e.target.value)} />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? 'Salvando…' : 'Salvar dados'}
        </Button>
      </div>

      {/* Convidados / participantes */}
      <div className="space-y-2 rounded-md border border-border p-3">
        <h3 className="text-sm font-semibold">Convidados e participantes</h3>
        {pessoas.data?.map((p) => (
          <div key={`${p.pessoa_id}-${p.papel}`} className="flex items-center gap-2 text-sm">
            <Badge variant="secondary">{p.papel}</Badge>
            <span className="min-w-0 flex-1 truncate">{p.nome}</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => desvincular.mutate({ id: p.pessoa_id, papel: p.papel })}
            >
              remover
            </Button>
          </div>
        ))}
        {(pessoas.data?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Nenhum vinculado.</p>}

        <div className="flex items-end gap-2 pt-2">
          <div className="flex-1">
            <Label className="text-xs">Adicionar pessoa</Label>
            <PessoaPicker onPick={(id) => vincular.mutate({ id, papel: papelNovo })} />
          </div>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={papelNovo}
            onChange={(e) => setPapelNovo(e.target.value as PapelEpisodio)}
          >
            {PAPEIS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-muted-foreground">
          Ao vincular, a pessoa precisa já existir no CRM (aba Pessoas). Host: use o papel “host”.
        </p>
      </div>
    </div>
  )
}
