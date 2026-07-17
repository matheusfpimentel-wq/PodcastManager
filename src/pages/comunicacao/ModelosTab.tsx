import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  createMessageTemplate,
  deactivateMessageTemplate,
  listMessageTemplates,
  updateMessageTemplate,
  type MessageTemplate,
} from '@/data/repositories/messageTemplates'
import { AVAILABLE_VARS } from '@/domain/messages/context'
import { parseRegraLembrete } from '@/domain/messages/reminders'
import type { Json } from '@/data/database.types'

type Base = '' | 'data_gravacao' | 'data_lancamento'

export function ModelosTab() {
  const qc = useQueryClient()
  const templates = useQuery({ queryKey: ['message-templates'], queryFn: () => listMessageTemplates() })
  const [selId, setSelId] = useState<string | null>(null)

  const selected = templates.data?.find((t) => t.id === selId) ?? templates.data?.[0] ?? null

  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
      <div className="space-y-2">
        <div className="flex flex-col gap-1">
          {templates.data?.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelId(t.id)}
              className={`rounded-md px-3 py-2 text-left text-sm ${
                selected?.id === t.id ? 'bg-secondary' : 'hover:bg-accent'
              }`}
            >
              {t.nome}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={async () => {
            const novo = await createMessageTemplate({
              nome: `Modelo ${(templates.data?.length ?? 0) + 1}`,
              canal: 'whatsapp',
              corpo: 'Olá, {{pessoa.nome}}!',
              ordem: (templates.data?.length ?? 0) * 10 + 100,
            })
            qc.invalidateQueries({ queryKey: ['message-templates'] })
            setSelId(novo.id)
          }}
        >
          + Novo modelo
        </Button>
      </div>

      {selected ? <Editor key={selected.id} template={selected} /> : <p className="text-sm text-muted-foreground">Nenhum modelo.</p>}
    </div>
  )
}

function Editor({ template }: { template: MessageTemplate }) {
  const qc = useQueryClient()
  const regra = parseRegraLembrete(template.regra_lembrete)
  const [nome, setNome] = useState(template.nome)
  const [canal, setCanal] = useState(template.canal)
  const [assunto, setAssunto] = useState(template.assunto ?? '')
  const [corpo, setCorpo] = useState(template.corpo)
  const [base, setBase] = useState<Base>(regra?.base ?? '')
  const [offset, setOffset] = useState<number>(regra?.offset_dias ?? 0)

  useEffect(() => {
    setNome(template.nome)
    setCanal(template.canal)
    setAssunto(template.assunto ?? '')
    setCorpo(template.corpo)
    const r = parseRegraLembrete(template.regra_lembrete)
    setBase(r?.base ?? '')
    setOffset(r?.offset_dias ?? 0)
  }, [template])

  const save = useMutation({
    mutationFn: () =>
      updateMessageTemplate(template.id, {
        nome,
        canal,
        assunto: assunto.trim() || null,
        corpo,
        regra_lembrete: (base ? { base, offset_dias: offset } : null) as Json,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['message-templates'] }),
  })

  const remove = useMutation({
    mutationFn: () => deactivateMessageTemplate(template.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['message-templates'] }),
  })

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Canal</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={canal}
            onChange={(e) => setCanal(e.target.value)}
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="email">E-mail</option>
            <option value="generico">Genérico</option>
          </select>
        </div>
      </div>

      {canal === 'email' && (
        <div className="space-y-1.5">
          <Label>Assunto (e-mail)</Label>
          <Input value={assunto} onChange={(e) => setAssunto(e.target.value)} />
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Corpo (use variáveis {`{{...}}`})</Label>
        <Textarea className="min-h-[180px] font-mono text-sm" value={corpo} onChange={(e) => setCorpo(e.target.value)} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Regra de lembrete</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={base}
            onChange={(e) => setBase(e.target.value as Base)}
          >
            <option value="">Sem lembrete automático</option>
            <option value="data_gravacao">Relativo à data de gravação</option>
            <option value="data_lancamento">Relativo à data de lançamento</option>
          </select>
        </div>
        {base && (
          <div className="space-y-1.5">
            <Label>Offset (dias; ex.: −1 = véspera)</Label>
            <Input type="number" value={offset} onChange={(e) => setOffset(Number(e.target.value) || 0)} />
          </div>
        )}
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Variáveis disponíveis (clique para copiar)</p>
        <div className="flex flex-wrap gap-1">
          {AVAILABLE_VARS.map((v) => (
            <button
              key={v.path}
              type="button"
              title={v.descricao}
              onClick={() => setCorpo((c) => `${c}{{${v.path}}}`)}
            >
              <Badge variant="outline" className="cursor-pointer">{`{{${v.path}}}`}</Badge>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? 'Salvando…' : 'Salvar modelo'}
        </Button>
        <Button
          variant="ghost"
          className="ml-auto text-destructive"
          onClick={() => {
            if (confirm(`Desativar "${template.nome}"?`)) remove.mutate()
          }}
        >
          Excluir
        </Button>
      </div>
    </div>
  )
}
