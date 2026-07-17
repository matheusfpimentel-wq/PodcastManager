import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  createPessoa,
  listParticipacoes,
  updatePessoa,
} from '@/data/repositories/pessoas'
import { getSetting } from '@/data/repositories/settings'
import { GENEROS, GENERO_LABEL, type GeneroPessoa, type Pessoa } from '@/data/types'

interface Props {
  pessoa: Pessoa | null // null => criar
  onClose: () => void
}

interface FormState {
  nome: string
  tratamento: string
  cargo_atual: string
  comarca_lotacao: string
  email: string
  telefone: string
  instagram: string
  genero: GeneroPessoa
  tags: string
  notas: string
}

function toState(p: Pessoa | null): FormState {
  return {
    nome: p?.nome ?? '',
    tratamento: p?.tratamento ?? '',
    cargo_atual: p?.cargo_atual ?? '',
    comarca_lotacao: p?.comarca_lotacao ?? '',
    email: p?.email ?? '',
    telefone: p?.telefone ?? '',
    instagram: p?.instagram ?? '',
    genero: p?.genero ?? 'nao_informado',
    tags: (p?.tags ?? []).join(', '),
    notas: p?.notas ?? '',
  }
}

function trimOrNull(v: string): string | null {
  const t = v.trim()
  return t === '' ? null : t
}

export function PessoaForm({ pessoa, onClose }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState<FormState>(() => toState(pessoa))
  const [error, setError] = useState<string | null>(null)

  // Regra de convidado repetido: buscar participações + a configuração da regra.
  const participacoes = useQuery({
    queryKey: ['participacoes', pessoa?.id],
    queryFn: () => listParticipacoes(pessoa!.id),
    enabled: Boolean(pessoa?.id),
  })
  const regra = useQuery({
    queryKey: ['setting', 'regra_convidado_repetido'],
    queryFn: () => getSetting<string>('regra_convidado_repetido'),
  })

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: form.nome.trim(),
        tratamento: trimOrNull(form.tratamento),
        cargo_atual: trimOrNull(form.cargo_atual),
        comarca_lotacao: trimOrNull(form.comarca_lotacao),
        email: trimOrNull(form.email),
        telefone: trimOrNull(form.telefone),
        instagram: trimOrNull(form.instagram),
        genero: form.genero,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        notas: trimOrNull(form.notas),
      }
      if (pessoa) return updatePessoa(pessoa.id, payload)
      return createPessoa(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pessoas'] })
      onClose()
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Erro ao salvar'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (form.nome.trim() === '') {
      setError('Nome é obrigatório.')
      return
    }
    setError(null)
    mutation.mutate()
  }

  const temParticipacoes = (participacoes.data?.length ?? 0) > 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-lg rounded-lg border border-border bg-card p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{pessoa ? 'Editar pessoa' : 'Nova pessoa'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Alerta de convidado repetido (§6.2): padrão é alertar, não bloquear. */}
        {temParticipacoes && (
          <div className="mb-4 rounded-md border border-amber-400/50 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="font-medium">
              Já participou de {participacoes.data!.length} episódio(s)
              {regra.data === 'bloquear' ? ' — regra: bloquear' : ' — regra: alertar'}
            </p>
            <ul className="mt-1 list-disc pl-5">
              {participacoes.data!.slice(0, 5).map((p) => (
                <li key={`${p.episodio_id}-${p.papel}`}>
                  {p.numero ? `#${p.numero} ` : ''}
                  {p.titulo || p.tema || 'Episódio'} · {p.papel}
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" value={form.nome} onChange={(e) => set('nome', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tratamento">Tratamento</Label>
              <Input
                id="tratamento"
                placeholder="Dr., Dra., Promotor(a)…"
                value={form.tratamento}
                onChange={(e) => set('tratamento', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="genero">Gênero</Label>
              <select
                id="genero"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.genero}
                onChange={(e) => set('genero', e.target.value as GeneroPessoa)}
              >
                {GENEROS.map((g) => (
                  <option key={g} value={g}>
                    {GENERO_LABEL[g]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cargo">Cargo atual</Label>
              <Input
                id="cargo"
                value={form.cargo_atual}
                onChange={(e) => set('cargo_atual', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comarca">Comarca / lotação</Label>
              <Input
                id="comarca"
                value={form.comarca_lotacao}
                onChange={(e) => set('comarca_lotacao', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={form.telefone}
                onChange={(e) => set('telefone', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                placeholder="@usuario"
                value={form.instagram}
                onChange={(e) => set('instagram', e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
              <Input
                id="tags"
                placeholder="patrimônio público, consumidor…"
                value={form.tags}
                onChange={(e) => set('tags', e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="notas">Notas</Label>
              <Textarea id="notas" value={form.notas} onChange={(e) => set('notas', e.target.value)} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            {pessoa && (
              <Badge variant="outline" className="mr-auto">
                origem: {pessoa.origem}
              </Badge>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
