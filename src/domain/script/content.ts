/**
 * Helpers puros para o conteúdo do roteiro dado um template (defaults, blocos).
 */
import type {
  BlocoContent,
  EpisodeScriptContent,
  PerguntaContent,
  QuestionSubfield,
  ScriptTemplateStructure,
  TextoContent,
} from './types'

/** Pergunta vazia com todas as chaves de subcampo definidas ('' cada). */
export function emptyPergunta(subcampos: QuestionSubfield[]): PerguntaContent {
  const p: PerguntaContent = {}
  for (const sf of subcampos) p[sf.key] = ''
  return p
}

/**
 * Garante que o conteúdo tenha uma entrada para cada seção editável do template,
 * preenchendo defaults (texto vazio; bloco com `perguntasPadrao` perguntas vazias).
 * Preserva o que já existe. Não muta a entrada.
 */
export function ensureContent(
  estrutura: ScriptTemplateStructure,
  content: EpisodeScriptContent,
): EpisodeScriptContent {
  const out: EpisodeScriptContent = {}
  for (const section of estrutura.sections) {
    if (section.type === 'marcador') continue
    const existing = content[section.id]
    if (section.type === 'texto') {
      out[section.id] =
        existing && existing.type === 'texto'
          ? existing
          : ({ type: 'texto', text: '' } satisfies TextoContent)
    } else {
      if (existing && existing.type === 'bloco') {
        // completa chaves de subcampo faltantes em cada pergunta
        const perguntas = existing.perguntas.map((p) => {
          const full: PerguntaContent = {}
          for (const sf of section.subcampos) full[sf.key] = p[sf.key] ?? ''
          return full
        })
        const bloco: BlocoContent = { type: 'bloco', perguntas }
        if (existing.opcionais) bloco.opcionais = existing.opcionais
        out[section.id] = bloco
      } else {
        out[section.id] = {
          type: 'bloco',
          perguntas: Array.from({ length: Math.max(1, section.perguntasPadrao) }, () =>
            emptyPergunta(section.subcampos),
          ),
        } satisfies BlocoContent
      }
    }
  }
  return out
}
