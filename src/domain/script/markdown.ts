/**
 * Roteiro ↔ Markdown (spec §6.4). Convenção documentada:
 *   ## Seção            (rótulo da seção)
 *   _[marcador]_        (seções tipo marcador, sem texto do usuário)
 *   ### Pergunta N      (perguntas de um bloco)
 *   **Subcampo:** valor (subcampos da pergunta / campos opcionais do bloco)
 *
 * O parser é TOLERANTE: casa seções por rótulo e reporta o que não conseguiu
 * mapear (`unmapped`) — nunca descarta texto silenciosamente. Puro, sem persistência.
 */
import type {
  BlocoContent,
  EpisodeScriptContent,
  PerguntaContent,
  ScriptTemplateStructure,
  TextoContent,
} from './types'

const norm = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ')

// --- Serialização: roteiro → Markdown ---------------------------------------

export function scriptToMarkdown(
  template: ScriptTemplateStructure,
  content: EpisodeScriptContent,
): string {
  const out: string[] = []
  for (const section of template.sections) {
    out.push(`## ${section.label}`)

    if (section.type === 'marcador') {
      out.push(section.nota ? `_[marcador: ${section.nota}]_` : '_[marcador]_')
    } else if (section.type === 'texto') {
      const c = content[section.id]
      out.push(c && c.type === 'texto' ? c.text : '')
    } else {
      const c = content[section.id]
      const bloco: BlocoContent =
        c && c.type === 'bloco' ? c : { type: 'bloco', perguntas: [] }
      bloco.perguntas.forEach((p, i) => {
        out.push(`### Pergunta ${i + 1}`)
        for (const sf of section.subcampos) out.push(`**${sf.label}:** ${p[sf.key] ?? ''}`)
      })
      if (section.camposOpcionais && bloco.opcionais) {
        for (const of of section.camposOpcionais) {
          out.push(`**${of.label}:** ${bloco.opcionais[of.key] ?? ''}`)
        }
      }
    }
    out.push('') // linha em branco entre seções
  }
  return out.join('\n').trim() + '\n'
}

// --- Parse: Markdown → roteiro ----------------------------------------------

export interface ParseResult {
  content: EpisodeScriptContent
  unmapped: string[]
}

const H2 = /^##(?!#)\s+(.+?)\s*$/
const H3 = /^###\s+(.+?)\s*$/
const FIELD = /^\*\*(.+?):\*\*\s?(.*)$/
const MARCADOR = /^_\[marcador.*\]_$/

export function markdownToScript(
  template: ScriptTemplateStructure,
  markdown: string,
): ParseResult {
  const byLabel = new Map(template.sections.map((s) => [norm(s.label), s]))
  const content: EpisodeScriptContent = {}
  const unmapped: string[] = []

  const lines = markdown.split(/\r?\n/)

  // Agrupa por seção (## ...). Guarda linhas de corpo por rótulo casado.
  type Group = { label: string; body: string[] }
  const groups: Group[] = []
  let current: Group | null = null
  for (const line of lines) {
    const h2 = line.match(H2)
    if (h2) {
      current = { label: h2[1] ?? '', body: [] }
      groups.push(current)
    } else if (current) {
      current.body.push(line)
    } else if (line.trim() !== '') {
      unmapped.push(line) // texto antes da primeira seção
    }
  }

  for (const g of groups) {
    const section = byLabel.get(norm(g.label))
    if (!section) {
      unmapped.push(`## ${g.label}`)
      continue
    }
    if (section.type === 'marcador') {
      continue // sem conteúdo
    }
    if (section.type === 'texto') {
      const text = g.body
        .filter((l) => !MARCADOR.test(l.trim()))
        .join('\n')
        .trim()
      content[section.id] = { type: 'texto', text } satisfies TextoContent
      continue
    }

    // bloco_de_perguntas
    const subByLabel = new Map(section.subcampos.map((sf) => [norm(sf.label), sf.key]))
    const optByLabel = new Map(
      (section.camposOpcionais ?? []).map((sf) => [norm(sf.label), sf.key]),
    )
    const perguntas: PerguntaContent[] = []
    const opcionais: Record<string, string> = {}
    let cur: PerguntaContent | null = null

    const pushCur = () => {
      if (cur) {
        // garante todas as chaves de subcampo (default '') p/ round-trip estável
        const complete: PerguntaContent = {}
        for (const sf of section.subcampos) complete[sf.key] = cur[sf.key] ?? ''
        perguntas.push(complete)
      }
    }

    for (const raw of g.body) {
      const line = raw.trimEnd()
      if (H3.test(line)) {
        pushCur()
        cur = {}
        continue
      }
      const f = line.match(FIELD)
      if (f) {
        const label = norm(f[1] ?? '')
        const value = f[2] ?? ''
        if (subByLabel.has(label)) {
          if (!cur) cur = {}
          cur[subByLabel.get(label)!] = value
        } else if (optByLabel.has(label)) {
          opcionais[optByLabel.get(label)!] = value
        } else {
          unmapped.push(raw)
        }
        continue
      }
      if (line.trim() !== '') unmapped.push(raw)
    }
    pushCur()

    const bloco: BlocoContent = { type: 'bloco', perguntas }
    if (Object.keys(opcionais).length > 0) bloco.opcionais = opcionais
    content[section.id] = bloco
  }

  return { content, unmapped }
}
