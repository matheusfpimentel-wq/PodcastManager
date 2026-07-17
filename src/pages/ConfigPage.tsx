import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { getLatestVersion, listTemplates } from '@/data/repositories/scriptTemplates'
import { TemplateEditor } from './config/TemplateEditor'

export function ConfigPage() {
  const qc = useQueryClient()
  const templates = useQuery({ queryKey: ['script-templates'], queryFn: () => listTemplates() })
  const [selected, setSelected] = useState<string | null>(null)

  const templateId = selected ?? templates.data?.[0]?.id ?? null

  const version = useQuery({
    queryKey: ['template-version', templateId],
    queryFn: () => getLatestVersion(templateId!),
    enabled: Boolean(templateId),
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Configurações</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Templates de roteiro</h2>
        <p className="text-xs text-muted-foreground">
          Edite a estrutura do roteiro pela interface. Salvar cria uma{' '}
          <strong>nova versão</strong>; episódios já criados mantêm a versão com que foram feitos.
        </p>

        <div className="flex flex-wrap gap-2">
          {templates.data?.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={templateId === t.id ? 'default' : 'outline'}
              onClick={() => setSelected(t.id)}
            >
              {t.nome}
            </Button>
          ))}
        </div>

        {version.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {version.data && templateId && (
          <TemplateEditor
            key={version.data.versionId}
            templateId={templateId}
            versao={version.data.versao}
            estrutura={version.data.estrutura}
            onSaved={() => qc.invalidateQueries({ queryKey: ['template-version', templateId] })}
          />
        )}
      </section>

      <section className="space-y-1">
        <h2 className="text-sm font-semibold text-muted-foreground">Demais parâmetros</h2>
        <p className="text-xs text-muted-foreground">
          Etapas do Kanban, checklists, eixos temáticos, palavras-por-minuto e regra de convidado
          repetido — edição pela UI em bloco posterior. Já ajustáveis via banco enquanto isso.
        </p>
      </section>
    </div>
  )
}
