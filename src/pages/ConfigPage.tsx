import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { getLatestVersion, listTemplates } from '@/data/repositories/scriptTemplates'
import { TemplateEditor } from './config/TemplateEditor'
import { ChecklistEditor, EixosEditor, StagesEditor } from './config/SettingsEditors'

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

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Etapas do pipeline (Kanban)</h2>
        <p className="text-xs text-muted-foreground">
          Adicione, renomeie, reordene, defina cor e “checklist para sair”. Ex.: criar “Revisão”
          entre Roteirização e Gravado.
        </p>
        <StagesEditor />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Checklists por etapa</h2>
        <p className="text-xs text-muted-foreground">
          Editar itens gera <strong>nova versão</strong>; episódios que já instanciaram o checklist
          mantêm a versão anterior.
        </p>
        <ChecklistEditor />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Eixos temáticos</h2>
        <EixosEditor />
      </section>

      <section className="space-y-1">
        <h2 className="text-sm font-semibold text-muted-foreground">Outros parâmetros</h2>
        <p className="text-xs text-muted-foreground">
          Palavras-por-minuto, duração-alvo, regra de convidado repetido, links institucionais e
          dias-parado: ajustáveis via banco (tela dedicada em polimento).
        </p>
      </section>
    </div>
  )
}
