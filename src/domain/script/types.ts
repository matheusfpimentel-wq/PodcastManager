/**
 * Modelo do template de roteiro (spec §6.4) — versionado, dirigido por dados.
 * O editor NÃO conhece o formato do programa; ele renderiza esta estrutura.
 * Puro, sem React/persistência.
 */

export type SectionType = 'marcador' | 'texto' | 'bloco_de_perguntas'

interface BaseSection {
  /** id estável dentro do template (não muda entre versões ao renomear rótulo). */
  id: string
  type: SectionType
  /** Rótulo exibido (ex.: "Cold Open", "Vinheta", "Bloco 1"). Renomeável por versão. */
  label: string
}

/** Ponto fixo sem texto do usuário (ex.: Vinheta, Spot ESMP). */
export interface MarcadorSection extends BaseSection {
  type: 'marcador'
  /** Nota opcional exibida (ex.: "~30s"). */
  nota?: string
}

/** Campo de texto simples (ex.: Cold Open, Abertura, Recapitulação, Takeaways). */
export interface TextoSection extends BaseSection {
  type: 'texto'
  placeholder?: string
  /** Dica de duração em segundos (ex.: contextualização ~30s), opcional. */
  duracaoAlvoSeg?: number
}

/** Subcampo de uma pergunta (definido no template, não no código). */
export interface QuestionSubfield {
  key: string
  label: string
}

/** Grupo repetível de perguntas; subcampos definidos no template. */
export interface BlocoPerguntasSection extends BaseSection {
  type: 'bloco_de_perguntas'
  subcampos: QuestionSubfield[]
  /** Nº padrão/mínimo de perguntas (ex.: 3). Episódio pode adicionar mais ("P4 em diante"). */
  perguntasPadrao: number
  /** Campos opcionais do bloco inteiro (ex.: "Olhar do MP"). */
  camposOpcionais?: QuestionSubfield[]
}

export type ScriptSection = MarcadorSection | TextoSection | BlocoPerguntasSection

/** Estrutura versionada (JSON imutável após uso por um episódio). */
export interface ScriptTemplateStructure {
  sections: ScriptSection[]
}

// --- Conteúdo do roteiro de um episódio (preenche uma versão de template) ---

export interface TextoContent {
  type: 'texto'
  text: string
}

/** Uma pergunta = valores por subcampo (key do subcampo → texto). */
export type PerguntaContent = Record<string, string>

export interface BlocoContent {
  type: 'bloco'
  perguntas: PerguntaContent[]
  /** valores dos campos opcionais do bloco (key → texto). */
  opcionais?: Record<string, string>
}

export type SectionContent = TextoContent | BlocoContent

/** Conteúdo do roteiro, keyed pelo id da seção. Marcadores não têm conteúdo. */
export type EpisodeScriptContent = Record<string, SectionContent>
