import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { getEpisodioHeader } from '@/data/repositories/episodios'
import {
  getEpisodeScript,
  saveEpisodeScript,
  startEpisodeScript,
} from '@/data/repositories/episodeScripts'
import {
  getLatestVersion,
  listTemplates,
} from '@/data/repositories/scriptTemplates'
import { getSetting } from '@/data/repositories/settings'
import { countAConfirmar } from '@/data/repositories/citacoes'
import { ensureContent, emptyPergunta } from '@/domain/script/content'
import { estimateScript } from '@/domain/script/estimate'
import { markdownToScript, scriptToMarkdown } from '@/domain/script/markdown'
import type {
  BlocoContent,
  EpisodeScriptContent,
  ScriptTemplateStructure,
  TextoContent,
} from '@/domain/script/types'
import { CitacoesTab } from './roteiro/CitacoesTab'
import { RecordingMode } from './roteiro/RecordingMode'
import { DadosTab } from './episodio/DadosTab'
import { DivulgacaoTab } from './episodio/DivulgacaoTab'

function fmtTempo(seg: number): string {
  const m = Math.floor(seg / 60)
  const s = seg % 60
  return `${m}min ${String(s).padStart(2, '0')}s`
}

function EditorRoteiro({
  scriptId,
  estrutura,
  versao,
  inicial,
}: {
  scriptId: string
  estrutura: ScriptTemplateStructure
  versao: number
  inicial: EpisodeScriptContent
}) {
  const qc = useQueryClient()
  const [content, setContent] = useState<EpisodeScriptContent>(() =>
    ensureContent(estrutura, inicial),
  )
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importReport, setImportReport] = useState<string[] | null>(null)
  const [gravacao, setGravacao] = useState(false)
  const dirty = useRef(false)

  const settings = useQuery({
    queryKey: ['settings-roteiro'],
    queryFn: async () => ({
      ppm: (await getSetting<number>('ppm')) ?? 150,
      alvo: (await getSetting<number>('duracao_alvo_min')) ?? 50,
    }),
  })

  const save = useMutation({
    mutationFn: (c: EpisodeScriptContent) => saveEpisodeScript(scriptId, c),
    onSuccess: () => {
      dirty.current = false
      setSavedAt(new Date().toLocaleTimeString('pt-BR'))
      qc.invalidateQueries({ queryKey: ['episode-script'] })
    },
  })

  // autosave com debounce
  useEffect(() => {
    if (!dirty.current) return
    const id = setTimeout(() => save.mutate(content), 1500)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  const update = (next: EpisodeScriptContent) => {
    dirty.current = true
    setContent(next)
  }

  const estimate = useMemo(
    () =>
      estimateScript(estrutura, content, {
        ppm: settings.data?.ppm,
        alvoMinutos: settings.data?.alvo,
      }),
    [estrutura, content, settings.data],
  )

  function exportMarkdown() {
    const md = scriptToMarkdown(estrutura, content)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `roteiro.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  function doImport() {
    const { content: parsed, unmapped } = markdownToScript(estrutura, importText)
    update(ensureContent(estrutura, parsed))
    setImportReport(unmapped)
  }

  return (
    <div className="space-y-4">
      {/* barra de estimativa + ações */}
      <div className="sticky top-14 z-10 flex flex-wrap items-center gap-3 rounded-md border border-border bg-background/95 p-3 backdrop-blur print:hidden">
        <Badge variant={estimate.estourou ? 'destructive' : 'secondary'}>
          ⏱ {fmtTempo(estimate.totalSegundos)}
          {estimate.alvoSegundos ? ` / alvo ${fmtTempo(estimate.alvoSegundos)}` : ''}
        </Badge>
        <span className="text-xs text-muted-foreground">{estimate.totalPalavras} palavras</span>
        <span className="text-xs text-muted-foreground">versão do template: v{versao}</span>
        <div className="ml-auto flex items-center gap-2">
          {save.isPending ? (
            <span className="text-xs text-muted-foreground">salvando…</span>
          ) : savedAt ? (
            <span className="text-xs text-muted-foreground">salvo {savedAt}</span>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            Importar .md
          </Button>
          <Button variant="outline" size="sm" onClick={exportMarkdown}>
            Exportar .md
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            PDF / imprimir
          </Button>
          <Button variant="outline" size="sm" onClick={() => setGravacao(true)}>
            Modo gravação
          </Button>
          <Button size="sm" onClick={() => save.mutate(content)}>
            Salvar
          </Button>
        </div>
      </div>

      {/* seções */}
      {estrutura.sections.map((section) => {
        if (section.type === 'marcador') {
          return (
            <div key={section.id} className="rounded-md border border-dashed border-border p-3">
              <Badge variant="outline">marcador</Badge>{' '}
              <span className="font-medium">{section.label}</span>
              {section.nota && <span className="text-muted-foreground"> — {section.nota}</span>}
            </div>
          )
        }
        if (section.type === 'texto') {
          const c = content[section.id]
          const text = c && c.type === 'texto' ? c.text : ''
          const est = estimate.porSecao.find((s) => s.sectionId === section.id)
          return (
            <div key={section.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">{section.label}</label>
                <span className="text-xs text-muted-foreground">{est ? fmtTempo(est.segundos) : ''}</span>
              </div>
              <Textarea
                value={text}
                placeholder={section.placeholder}
                onChange={(e) =>
                  update({ ...content, [section.id]: { type: 'texto', text: e.target.value } satisfies TextoContent })
                }
              />
            </div>
          )
        }
        // bloco_de_perguntas
        const c = content[section.id]
        const bloco: BlocoContent = c && c.type === 'bloco' ? c : { type: 'bloco', perguntas: [] }
        return (
          <div key={section.id} className="space-y-2 rounded-md border border-border p-3">
            <h3 className="text-sm font-semibold">{section.label}</h3>
            {bloco.perguntas.map((p, i) => (
              <div key={i} className="space-y-1.5 rounded-md bg-muted/40 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Pergunta {i + 1}</span>
                  {bloco.perguntas.length > 1 && (
                    <button
                      type="button"
                      className="text-xs text-destructive"
                      onClick={() => {
                        const perguntas = bloco.perguntas.filter((_, j) => j !== i)
                        update({ ...content, [section.id]: { ...bloco, perguntas } })
                      }}
                    >
                      remover
                    </button>
                  )}
                </div>
                {section.subcampos.map((sf) => (
                  <div key={sf.key}>
                    <label className="text-xs text-muted-foreground">{sf.label}</label>
                    <Textarea
                      className="min-h-[52px]"
                      value={p[sf.key] ?? ''}
                      onChange={(e) => {
                        const perguntas = bloco.perguntas.map((pp, j) =>
                          j === i ? { ...pp, [sf.key]: e.target.value } : pp,
                        )
                        update({ ...content, [section.id]: { ...bloco, perguntas } })
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                update({
                  ...content,
                  [section.id]: {
                    ...bloco,
                    perguntas: [...bloco.perguntas, emptyPergunta(section.subcampos)],
                  },
                })
              }
            >
              + pergunta
            </Button>

            {section.camposOpcionais?.map((of) => (
              <div key={of.key} className="pt-2">
                <label className="text-xs text-muted-foreground">{of.label} (opcional)</label>
                <Textarea
                  className="min-h-[52px]"
                  value={bloco.opcionais?.[of.key] ?? ''}
                  onChange={(e) =>
                    update({
                      ...content,
                      [section.id]: {
                        ...bloco,
                        opcionais: { ...bloco.opcionais, [of.key]: e.target.value },
                      },
                    })
                  }
                />
              </div>
            ))}
          </div>
        )
      })}

      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden">
          <div className="w-full max-w-2xl rounded-lg border border-border bg-card p-5 shadow-lg">
            <h2 className="mb-2 text-lg font-semibold">Importar roteiro (Markdown)</h2>
            <p className="mb-2 text-xs text-muted-foreground">
              Convenção: <code>## Seção</code>, <code>### Pergunta N</code>, <code>**Subcampo:** valor</code>.
              O que não casar aparece no relatório abaixo (nada é descartado em silêncio).
            </p>
            <Textarea
              className="min-h-[220px] font-mono text-xs"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Cole o Markdown do roteiro aqui…"
            />
            {importReport && (
              <div className="mt-2 text-xs">
                {importReport.length === 0 ? (
                  <span className="text-green-600">Tudo mapeado ✓</span>
                ) : (
                  <div className="text-amber-600">
                    Não mapeado ({importReport.length}):
                    <ul className="list-disc pl-5">
                      {importReport.slice(0, 8).map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setImportOpen(false)
                  setImportReport(null)
                }}
              >
                Fechar
              </Button>
              <Button onClick={doImport}>Importar</Button>
            </div>
          </div>
        </div>
      )}

      {gravacao && (
        <RecordingMode estrutura={estrutura} content={content} onClose={() => setGravacao(false)} />
      )}
    </div>
  )
}

export function EpisodioRoteiroPage() {
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'dados' | 'roteiro' | 'citacoes' | 'divulgacao'>('roteiro')

  const header = useQuery({ queryKey: ['episodio-header', id], queryFn: () => getEpisodioHeader(id) })
  const script = useQuery({ queryKey: ['episode-script', id], queryFn: () => getEpisodeScript(id) })
  const aConfirmar = useQuery({
    queryKey: ['citacoes-count', id],
    queryFn: () => countAConfirmar(id),
  })
  const templates = useQuery({
    queryKey: ['script-templates'],
    queryFn: () => listTemplates(),
    enabled: script.data === null,
  })

  const start = useMutation({
    mutationFn: async (templateId: string) => {
      const version = await getLatestVersion(templateId)
      if (!version) throw new Error('Template sem versão')
      await startEpisodeScript(id, version.versionId)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['episode-script', id] }),
    onError: (e) => alert(e instanceof Error ? e.message : 'Falha ao iniciar'),
  })

  const titulo = header.data?.titulo || header.data?.tema || 'Episódio'

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-3 flex items-center gap-2 print:hidden">
        <Link to="/episodios" className="text-sm text-muted-foreground hover:text-foreground">
          ← Episódios
        </Link>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
        {header.data?.numero != null && <Badge variant="outline">#{header.data.numero}</Badge>}
        {(aConfirmar.data ?? 0) > 0 && (
          <Badge variant="destructive">{aConfirmar.data} citação(ões) a confirmar</Badge>
        )}
      </div>

      <div className="mb-4 flex gap-1 print:hidden">
        <Button variant={tab === 'dados' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('dados')}>
          Dados
        </Button>
        <Button variant={tab === 'roteiro' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('roteiro')}>
          Roteiro
        </Button>
        <Button variant={tab === 'citacoes' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('citacoes')}>
          Citações e fontes
        </Button>
        <Button variant={tab === 'divulgacao' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('divulgacao')}>
          Divulgação
        </Button>
      </div>

      {tab === 'dados' ? (
        <DadosTab episodeId={id} />
      ) : tab === 'divulgacao' ? (
        <DivulgacaoTab episodeId={id} />
      ) : tab === 'citacoes' ? (
        <CitacoesTab episodeId={id} />
      ) : script.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando roteiro…</p>
      ) : script.data ? (
        <EditorRoteiro
          scriptId={script.data.id}
          estrutura={script.data.estrutura}
          versao={script.data.versao}
          inicial={script.data.conteudo}
        />
      ) : (
        <div className="rounded-md border border-dashed border-border p-6 text-center">
          <p className="mb-3 text-sm text-muted-foreground">
            Este episódio ainda não tem roteiro. Escolha um template para começar:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {templates.data?.map((t) => (
              <Button key={t.id} size="sm" disabled={start.isPending} onClick={() => start.mutate(t.id)}>
                {t.nome}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
