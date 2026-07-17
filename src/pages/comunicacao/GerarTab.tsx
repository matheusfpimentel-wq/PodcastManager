import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { listBoardEpisodes, getEpisodioContext, listEpisodePessoas } from '@/data/repositories/episodios'
import { listMessageTemplates } from '@/data/repositories/messageTemplates'
import { getSetting } from '@/data/repositories/settings'
import { listLogByEpisode, logCommunication } from '@/data/repositories/communicationLog'
import { buildMessageContext } from '@/domain/messages/context'
import { renderTemplate } from '@/domain/messages/renderTemplate'

function waLink(telefone: string | null, texto: string): string | null {
  if (!telefone) return null
  let digits = telefone.replace(/\D/g, '')
  if (digits === '') return null
  if (digits.length <= 11) digits = `55${digits}` // assume BR se sem código de país
  return `https://wa.me/${digits}?text=${encodeURIComponent(texto)}`
}

export function GerarTab() {
  const qc = useQueryClient()
  const [episodeId, setEpisodeId] = useState('')
  const [pessoaId, setPessoaId] = useState('')
  const [templateId, setTemplateId] = useState('')

  const episodes = useQuery({ queryKey: ['board'], queryFn: () => listBoardEpisodes() })
  const templates = useQuery({ queryKey: ['message-templates'], queryFn: () => listMessageTemplates() })
  const linksInst = useQuery({
    queryKey: ['setting', 'links_institucionais'],
    queryFn: () => getSetting<Record<string, unknown>>('links_institucionais'),
  })
  const episodio = useQuery({
    queryKey: ['episodio-context', episodeId],
    queryFn: () => getEpisodioContext(episodeId),
    enabled: Boolean(episodeId),
  })
  const pessoas = useQuery({
    queryKey: ['episode-pessoas', episodeId],
    queryFn: () => listEpisodePessoas(episodeId),
    enabled: Boolean(episodeId),
  })
  const log = useQuery({
    queryKey: ['comm-log', episodeId],
    queryFn: () => listLogByEpisode(episodeId),
    enabled: Boolean(episodeId),
  })

  // seleciona defaults quando os dados chegam
  useEffect(() => {
    if (templates.data && !templateId && templates.data[0]) setTemplateId(templates.data[0].id)
  }, [templates.data, templateId])
  useEffect(() => {
    setPessoaId(pessoas.data?.[0]?.pessoa_id ?? '')
  }, [pessoas.data])

  const template = templates.data?.find((t) => t.id === templateId)
  const pessoa = pessoas.data?.find((p) => p.pessoa_id === pessoaId) ?? null

  const rendered = useMemo(() => {
    if (!template) return null
    const ctx = buildMessageContext({
      pessoa,
      episodio: episodio.data,
      linksInstitucionais: linksInst.data ?? {},
    })
    const body = renderTemplate(template.corpo, ctx)
    const subject = template.assunto ? renderTemplate(template.assunto, ctx) : null
    return { body, subject }
  }, [template, pessoa, episodio.data, linksInst.data])

  const registrar = useMutation({
    mutationFn: (canal: string) =>
      logCommunication({
        episodio_id: episodeId || null,
        pessoa_id: pessoaId || null,
        template_id: templateId || null,
        canal,
        assunto: rendered?.subject?.text ?? null,
        conteudo_renderizado: rendered?.body.text ?? null,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comm-log', episodeId] }),
  })

  const texto = rendered?.body.text ?? ''
  const wa = waLink(pessoa?.telefone ?? null, texto)
  const mail = pessoa?.email
    ? `mailto:${pessoa.email}?subject=${encodeURIComponent(rendered?.subject?.text ?? '')}&body=${encodeURIComponent(texto)}`
    : null

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Episódio</span>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2"
            value={episodeId}
            onChange={(e) => setEpisodeId(e.target.value)}
          >
            <option value="">— selecione —</option>
            {episodes.data?.map((ep) => (
              <option key={ep.id} value={ep.id}>
                {ep.numero ? `#${ep.numero} ` : ''}
                {ep.titulo || ep.tema || 'Sem tema'}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Pessoa</span>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2"
            value={pessoaId}
            onChange={(e) => setPessoaId(e.target.value)}
            disabled={!episodeId}
          >
            <option value="">— sem convidado —</option>
            {pessoas.data?.map((p) => (
              <option key={p.pessoa_id} value={p.pessoa_id}>
                {p.nome} ({p.papel})
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Modelo</span>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            {templates.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      {rendered && (
        <div className="space-y-2">
          {rendered.subject && (
            <p className="text-sm">
              <span className="text-muted-foreground">Assunto: </span>
              {rendered.subject.text}
            </p>
          )}
          <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-sm">
            {texto}
          </pre>

          {rendered.body.missing.length > 0 && (
            <div className="text-sm">
              <span className="text-destructive">Variáveis sem valor (revise antes de enviar): </span>
              {rendered.body.missing.map((m) => (
                <Badge key={m} variant="destructive" className="ml-1">
                  {m}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(texto)
                registrar.mutate('copiado')
              }}
            >
              Copiar
            </Button>
            <Button
              size="sm"
              disabled={!wa}
              onClick={() => {
                if (wa) window.open(wa, '_blank')
                registrar.mutate('whatsapp')
              }}
            >
              WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!mail}
              onClick={() => {
                if (mail) window.open(mail, '_blank')
                registrar.mutate('email')
              }}
            >
              E-mail
            </Button>
          </div>
          {!wa && pessoa && <p className="text-xs text-muted-foreground">Sem telefone cadastrado para WhatsApp.</p>}
        </div>
      )}

      {episodeId && (log.data?.length ?? 0) > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Histórico de comunicações</h3>
          <ul className="divide-y divide-border rounded-md border border-border text-sm">
            {log.data?.map((l) => (
              <li key={l.id} className="p-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{l.canal ?? '—'}</Badge>
                  <span className="font-medium">{l.modelo ?? 'modelo removido'}</span>
                  {l.pessoa && <span className="text-muted-foreground">→ {l.pessoa}</span>}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(l.enviadoEm).toLocaleString('pt-BR')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
