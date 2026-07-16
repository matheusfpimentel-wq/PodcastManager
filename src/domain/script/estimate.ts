/**
 * Estimativa de tempo de fala (spec §6.4): contagem de palavras ÷ palavras-por-
 * minuto (configurável em settings; default 150). Puro e testável.
 */
import type {
  BlocoContent,
  EpisodeScriptContent,
  ScriptTemplateStructure,
  TextoContent,
} from './types'

export function countWords(text: string): number {
  const t = text.trim()
  if (t === '') return 0
  return t.split(/\s+/).length
}

/** Palavras de um conteúdo de seção (texto ou bloco de perguntas). */
export function sectionWordCount(content: TextoContent | BlocoContent | undefined): number {
  if (!content) return 0
  if (content.type === 'texto') return countWords(content.text)
  // bloco: soma todos os subcampos de todas as perguntas + opcionais
  let total = 0
  for (const pergunta of content.perguntas) {
    for (const val of Object.values(pergunta)) total += countWords(val)
  }
  if (content.opcionais) {
    for (const val of Object.values(content.opcionais)) total += countWords(val)
  }
  return total
}

export interface SectionEstimate {
  sectionId: string
  label: string
  palavras: number
  segundos: number
}

export interface ScriptEstimate {
  ppm: number
  totalPalavras: number
  totalSegundos: number
  porSecao: SectionEstimate[]
  /** Duração-alvo (segundos) para comparação, se fornecida. */
  alvoSegundos?: number
  estourou?: boolean
}

export function estimateScript(
  template: ScriptTemplateStructure,
  content: EpisodeScriptContent,
  opts: { ppm?: number; alvoMinutos?: number } = {},
): ScriptEstimate {
  const ppm = opts.ppm && opts.ppm > 0 ? opts.ppm : 150
  const porSecao: SectionEstimate[] = []
  let totalPalavras = 0

  for (const section of template.sections) {
    if (section.type === 'marcador') continue
    const c = content[section.id]
    const palavras = sectionWordCount(
      c && (c.type === 'texto' || c.type === 'bloco') ? c : undefined,
    )
    totalPalavras += palavras
    porSecao.push({
      sectionId: section.id,
      label: section.label,
      palavras,
      segundos: Math.round((palavras / ppm) * 60),
    })
  }

  const totalSegundos = Math.round((totalPalavras / ppm) * 60)
  const alvoSegundos = opts.alvoMinutos ? opts.alvoMinutos * 60 : undefined
  return {
    ppm,
    totalPalavras,
    totalSegundos,
    porSecao,
    alvoSegundos,
    estourou: alvoSegundos !== undefined ? totalSegundos > alvoSegundos : undefined,
  }
}
