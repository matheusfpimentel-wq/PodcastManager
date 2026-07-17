import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { saveNewVersion } from '@/data/repositories/scriptTemplates'
import type {
  BlocoPerguntasSection,
  ScriptSection,
  ScriptTemplateStructure,
} from '@/domain/script/types'

const uid = (p: string) => `${p}_${crypto.randomUUID().slice(0, 8)}`

interface Props {
  templateId: string
  versao: number
  estrutura: ScriptTemplateStructure
  onSaved: () => void
}

/**
 * Editor de template (config, não código). Edita uma cópia local e SALVA COMO
 * NOVA VERSÃO — episódios que usam versões anteriores não mudam (§10).
 */
export function TemplateEditor({ templateId, versao, estrutura, onSaved }: Props) {
  const qc = useQueryClient()
  const [sections, setSections] = useState<ScriptSection[]>(() =>
    structuredClone(estrutura.sections),
  )
  const [dirty, setDirty] = useState(false)

  const patch = (next: ScriptSection[]) => {
    setSections(next)
    setDirty(true)
  }
  const replaceAt = (idx: number, sec: ScriptSection) =>
    patch(sections.map((s, i) => (i === idx ? sec : s)))

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir
    if (j < 0 || j >= sections.length) return
    const next = [...sections]
    const tmp = next[idx]!
    next[idx] = next[j]!
    next[j] = tmp
    patch(next)
  }

  const save = useMutation({
    mutationFn: () => saveNewVersion(templateId, { sections }),
    onSuccess: () => {
      setDirty(false)
      qc.invalidateQueries({ queryKey: ['template-version', templateId] })
      onSaved()
    },
    onError: (e) => alert(e instanceof Error ? e.message : 'Falha ao salvar'),
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Versão atual: v{versao}</span>
        {dirty && <Badge variant="outline">alterações não salvas → gerará v{versao + 1}</Badge>}
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => patch([...sections, { id: uid('texto'), type: 'texto', label: 'Nova seção' }])}>
            + Texto
          </Button>
          <Button size="sm" variant="outline" onClick={() => patch([...sections, { id: uid('marc'), type: 'marcador', label: 'Novo marcador' }])}>
            + Marcador
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              patch([
                ...sections,
                {
                  id: uid('bloco'),
                  type: 'bloco_de_perguntas',
                  label: 'Novo bloco',
                  perguntasPadrao: 3,
                  subcampos: [{ key: uid('sf'), label: 'Pergunta aberta' }],
                },
              ])
            }
          >
            + Bloco
          </Button>
        </div>
      </div>

      <ul className="space-y-2">
        {sections.map((sec, idx) => (
          <li key={sec.id} className="rounded-md border border-border p-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{sec.type === 'bloco_de_perguntas' ? 'bloco' : sec.type}</Badge>
              <Input
                className="flex-1"
                value={sec.label}
                onChange={(e) => replaceAt(idx, { ...sec, label: e.target.value })}
              />
              <Button variant="ghost" size="sm" onClick={() => move(idx, -1)} disabled={idx === 0}>
                ↑
              </Button>
              <Button variant="ghost" size="sm" onClick={() => move(idx, 1)} disabled={idx === sections.length - 1}>
                ↓
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => patch(sections.filter((_, i) => i !== idx))}
              >
                remover
              </Button>
            </div>

            {sec.type === 'bloco_de_perguntas' && (
              <BlocoEditor bloco={sec} onChange={(b) => replaceAt(idx, b)} />
            )}
          </li>
        ))}
      </ul>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
          {save.isPending ? 'Salvando…' : 'Salvar como nova versão'}
        </Button>
      </div>
    </div>
  )
}

function BlocoEditor({
  bloco,
  onChange,
}: {
  bloco: BlocoPerguntasSection
  onChange: (b: BlocoPerguntasSection) => void
}) {
  const setSub = (i: number, label: string) =>
    onChange({ ...bloco, subcampos: bloco.subcampos.map((s, j) => (j === i ? { ...s, label } : s)) })

  return (
    <div className="mt-2 space-y-2 border-t border-border pt-2">
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Perguntas padrão</label>
        <Input
          type="number"
          min={0}
          className="h-8 w-20"
          value={bloco.perguntasPadrao}
          onChange={(e) => onChange({ ...bloco, perguntasPadrao: Math.max(0, Number(e.target.value) || 0) })}
        />
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Subcampos de cada pergunta</p>
        {bloco.subcampos.map((sf, i) => (
          <div key={sf.key} className="mb-1 flex items-center gap-2">
            <Input className="h-8 flex-1" value={sf.label} onChange={(e) => setSub(i, e.target.value)} />
            {bloco.subcampos.length > 1 && (
              <button
                type="button"
                className="text-xs text-destructive"
                onClick={() => onChange({ ...bloco, subcampos: bloco.subcampos.filter((_, j) => j !== i) })}
              >
                remover
              </button>
            )}
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({
              ...bloco,
              subcampos: [...bloco.subcampos, { key: `sf_${crypto.randomUUID().slice(0, 8)}`, label: 'Novo subcampo' }],
            })
          }
        >
          + subcampo
        </Button>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Campos opcionais do bloco (ex.: Olhar do MP)</p>
        {(bloco.camposOpcionais ?? []).map((sf, i) => (
          <div key={sf.key} className="mb-1 flex items-center gap-2">
            <Input
              className="h-8 flex-1"
              value={sf.label}
              onChange={(e) =>
                onChange({
                  ...bloco,
                  camposOpcionais: (bloco.camposOpcionais ?? []).map((s, j) =>
                    j === i ? { ...s, label: e.target.value } : s,
                  ),
                })
              }
            />
            <button
              type="button"
              className="text-xs text-destructive"
              onClick={() =>
                onChange({
                  ...bloco,
                  camposOpcionais: (bloco.camposOpcionais ?? []).filter((_, j) => j !== i),
                })
              }
            >
              remover
            </button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({
              ...bloco,
              camposOpcionais: [
                ...(bloco.camposOpcionais ?? []),
                { key: `opt_${crypto.randomUUID().slice(0, 8)}`, label: 'Novo campo' },
              ],
            })
          }
        >
          + campo opcional
        </Button>
      </div>
    </div>
  )
}
