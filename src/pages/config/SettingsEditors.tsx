import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { createStage, listStages, updateStage } from '@/data/repositories/stages'
import { createEixo, listEixos, updateEixo } from '@/data/repositories/eixos'
import {
  getLatestChecklistVersion,
  listChecklistTemplates,
  saveNewChecklistVersion,
  type ChecklistItemEdit,
} from '@/data/repositories/checklists'

// --- Etapas do Kanban -------------------------------------------------------
export function StagesEditor() {
  const qc = useQueryClient()
  const stages = useQuery({ queryKey: ['stages-all'], queryFn: () => listStages(true) })
  const inval = () => {
    qc.invalidateQueries({ queryKey: ['stages-all'] })
    qc.invalidateQueries({ queryKey: ['stages'] })
  }
  const upd = useMutation({ mutationFn: (v: { id: string; patch: Parameters<typeof updateStage>[1] }) => updateStage(v.id, v.patch), onSuccess: inval })
  const add = useMutation({
    mutationFn: () => {
      const maxOrdem = Math.max(0, ...(stages.data ?? []).map((s) => s.ordem))
      return createStage({ nome: 'Nova etapa', ordem: maxOrdem + 10 })
    },
    onSuccess: inval,
  })

  const list = stages.data ?? []
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir
    const a = list[idx]
    const b = list[j]
    if (!a || !b) return
    upd.mutate({ id: a.id, patch: { ordem: b.ordem } })
    upd.mutate({ id: b.id, patch: { ordem: a.ordem } })
  }

  return (
    <div className="space-y-2">
      {list.map((s, idx) => (
        <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2">
          <Input
            className="h-8 w-44"
            defaultValue={s.nome}
            onBlur={(e) => e.target.value !== s.nome && upd.mutate({ id: s.id, patch: { nome: e.target.value } })}
          />
          <input
            type="color"
            className="h-8 w-10 rounded border border-input"
            value={s.cor ?? '#94a3b8'}
            onChange={(e) => upd.mutate({ id: s.id, patch: { cor: e.target.value } })}
          />
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={s.exige_checklist_completo}
              onChange={(e) => upd.mutate({ id: s.id, patch: { exige_checklist_completo: e.target.checked } })}
            />
            checklist p/ sair
          </label>
          <Button variant="ghost" size="sm" onClick={() => move(idx, -1)} disabled={idx === 0}>↑</Button>
          <Button variant="ghost" size="sm" onClick={() => move(idx, 1)} disabled={idx === list.length - 1}>↓</Button>
          <label className="ml-auto flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={s.ativo}
              onChange={(e) => upd.mutate({ id: s.id, patch: { ativo: e.target.checked } })}
            />
            ativa
          </label>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => add.mutate()}>+ Etapa</Button>
    </div>
  )
}

// --- Eixos temáticos --------------------------------------------------------
export function EixosEditor() {
  const qc = useQueryClient()
  const eixos = useQuery({ queryKey: ['eixos'], queryFn: () => listEixos() })
  const [novo, setNovo] = useState('')
  const inval = () => qc.invalidateQueries({ queryKey: ['eixos'] })
  const add = useMutation({ mutationFn: () => createEixo({ nome: novo.trim() }), onSuccess: () => { setNovo(''); inval() } })
  const upd = useMutation({ mutationFn: (v: { id: string; nome: string }) => updateEixo(v.id, { nome: v.nome }), onSuccess: inval })

  return (
    <div className="space-y-2">
      {eixos.data?.map((e) => (
        <div key={e.id} className="flex items-center gap-2">
          <Input className="h-8 w-64" defaultValue={e.nome} onBlur={(ev) => ev.target.value !== e.nome && upd.mutate({ id: e.id, nome: ev.target.value })} />
        </div>
      ))}
      <div className="flex gap-2">
        <Input className="h-8 w-64" placeholder="Novo eixo…" value={novo} onChange={(e) => setNovo(e.target.value)} />
        <Button variant="outline" size="sm" disabled={!novo.trim()} onClick={() => add.mutate()}>+ Eixo</Button>
      </div>
    </div>
  )
}

// --- Checklists (versionados) ----------------------------------------------
export function ChecklistEditor() {
  const qc = useQueryClient()
  const templates = useQuery({ queryKey: ['checklist-templates'], queryFn: () => listChecklistTemplates() })
  const [tplId, setTplId] = useState<string | null>(null)
  const templateId = tplId ?? templates.data?.[0]?.id ?? null

  const version = useQuery({
    queryKey: ['checklist-version', templateId],
    queryFn: () => getLatestChecklistVersion(templateId!),
    enabled: Boolean(templateId),
  })

  const [items, setItems] = useState<ChecklistItemEdit[]>([])
  const [dirty, setDirty] = useState(false)
  useEffect(() => {
    setItems(version.data?.items.map((i) => ({ ...i })) ?? [])
    setDirty(false)
  }, [version.data])

  const patch = (next: ChecklistItemEdit[]) => { setItems(next); setDirty(true) }
  const save = useMutation({
    mutationFn: () => saveNewChecklistVersion(templateId!, items),
    onSuccess: () => { setDirty(false); qc.invalidateQueries({ queryKey: ['checklist-version', templateId] }) },
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {templates.data?.map((t) => (
          <Button key={t.id} size="sm" variant={templateId === t.id ? 'default' : 'outline'} onClick={() => setTplId(t.id)}>
            {t.nome}
          </Button>
        ))}
      </div>
      {version.data && <p className="text-xs text-muted-foreground">Versão atual: v{version.data.versao}{dirty ? ` → gerará v${version.data.versao + 1}` : ''}</p>}

      <ul className="space-y-1">
        {items.map((it, idx) => (
          <li key={idx} className="flex items-center gap-2">
            <Input
              className="h-8 flex-1"
              value={it.label}
              onChange={(e) => patch(items.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))}
            />
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={it.obrigatorio}
                onChange={(e) => patch(items.map((x, i) => (i === idx ? { ...x, obrigatorio: e.target.checked } : x)))}
              />
              obrig.
            </label>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => patch(items.filter((_, i) => i !== idx))}>
              remover
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => patch([...items, { label: 'Novo item', ordem: (items.length + 1) * 10, obrigatorio: true }])}>
          + item
        </Button>
        <Button size="sm" className="ml-auto" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Salvando…' : 'Salvar como nova versão'}
        </Button>
      </div>
      {version.data === null && !version.isLoading && (
        <Badge variant="outline">Este checklist ainda não tem versão — adicione itens e salve.</Badge>
      )}
    </div>
  )
}
