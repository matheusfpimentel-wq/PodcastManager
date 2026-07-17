import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { EpisodeScriptContent, ScriptSection, ScriptTemplateStructure } from '@/domain/script/types'

function fmtClock(seg: number): string {
  const m = Math.floor(seg / 60)
  const s = seg % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function SectionView({
  section,
  content,
}: {
  section: ScriptSection
  content: EpisodeScriptContent
}) {
  if (section.type === 'marcador') {
    return (
      <p className="text-2xl text-muted-foreground">
        🔖 {section.label}
        {section.nota ? ` — ${section.nota}` : ''}
      </p>
    )
  }
  if (section.type === 'texto') {
    const c = content[section.id]
    const text = c && c.type === 'texto' ? c.text : ''
    return (
      <p className="whitespace-pre-wrap text-2xl leading-relaxed">
        {text || <span className="text-muted-foreground">(vazio)</span>}
      </p>
    )
  }
  const c = content[section.id]
  const bloco = c && c.type === 'bloco' ? c : { type: 'bloco' as const, perguntas: [] }
  return (
    <div className="space-y-6">
      {bloco.perguntas.map((p, i) => (
        <div key={i} className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Pergunta {i + 1}
          </p>
          {section.subcampos.map((sf) => (
            <p key={sf.key} className="text-2xl leading-relaxed">
              <span className="text-base text-muted-foreground">{sf.label}: </span>
              {p[sf.key] || <span className="text-muted-foreground">(vazio)</span>}
            </p>
          ))}
        </div>
      ))}
      {section.camposOpcionais?.map((of) =>
        bloco.opcionais?.[of.key] ? (
          <p key={of.key} className="text-xl">
            <span className="text-base text-muted-foreground">{of.label}: </span>
            {bloco.opcionais[of.key]}
          </p>
        ) : null,
      )}
    </div>
  )
}

export function RecordingMode({
  estrutura,
  content,
  onClose,
}: {
  estrutura: ScriptTemplateStructure
  content: EpisodeScriptContent
  onClose: () => void
}) {
  const sections = estrutura.sections
  const [idx, setIdx] = useState(0)
  const [read, setRead] = useState<Set<string>>(new Set())
  const [seg, setSeg] = useState(0)
  const [rodando, setRodando] = useState(true)

  useEffect(() => {
    if (!rodando) return
    const t = setInterval(() => setSeg((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [rodando])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(i + 1, sections.length - 1))
      else if (e.key === 'ArrowLeft') setIdx((i) => Math.max(i - 1, 0))
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sections.length, onClose])

  const section = sections[idx]
  if (!section) return null
  const isRead = read.has(section.id)

  const toggleRead = () => {
    setRead((prev) => {
      const next = new Set(prev)
      if (next.has(section.id)) next.delete(section.id)
      else next.add(section.id)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-6 py-3">
        <Badge variant="secondary" className="text-base">
          ⏱ {fmtClock(seg)}
        </Badge>
        <Button variant="ghost" size="sm" onClick={() => setRodando((r) => !r)}>
          {rodando ? 'Pausar' : 'Retomar'}
        </Button>
        <span className="text-sm text-muted-foreground">
          Seção {idx + 1}/{sections.length} · {read.size} lida(s)
        </span>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={onClose}>
          Sair (Esc)
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center gap-3">
            <h1 className={`text-3xl font-bold ${isRead ? 'text-muted-foreground line-through' : ''}`}>
              {section.label}
            </h1>
            {isRead && <Badge variant="secondary">lida</Badge>}
          </div>
          <SectionView section={section} content={content} />
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-border px-6 py-3">
        <Button variant="outline" onClick={() => setIdx((i) => Math.max(i - 1, 0))} disabled={idx === 0}>
          ← Anterior
        </Button>
        <Button variant={isRead ? 'secondary' : 'default'} onClick={toggleRead}>
          {isRead ? 'Desmarcar lida' : 'Marcar como lida'}
        </Button>
        <Button
          variant="outline"
          className="ml-auto"
          onClick={() => setIdx((i) => Math.min(i + 1, sections.length - 1))}
          disabled={idx === sections.length - 1}
        >
          Próxima →
        </Button>
      </div>
    </div>
  )
}
