/**
 * Edições de template como operações IMUTÁVEIS (spec §princípio nº1 + §6.4).
 *
 * Toda edição retorna uma NOVA estrutura sem tocar na anterior. Assim, salvar
 * uma edição vira uma nova VERSÃO no banco, e episódios que referenciam a versão
 * antiga nunca quebram retroativamente. Puro, sem persistência.
 */
import type { ScriptSection, ScriptTemplateStructure } from './types'

/** Cópia profunda — base de toda edição imutável. */
export function cloneStructure(s: ScriptTemplateStructure): ScriptTemplateStructure {
  return structuredClone(s)
}

/** Próximo número de versão dado o maior número existente (ou 0). */
export function nextVersionNumber(maiorAtual: number): number {
  return Math.max(0, Math.floor(maiorAtual)) + 1
}

export function renameSection(
  s: ScriptTemplateStructure,
  sectionId: string,
  label: string,
): ScriptTemplateStructure {
  const next = cloneStructure(s)
  const sec = next.sections.find((x) => x.id === sectionId)
  if (sec) sec.label = label
  return next
}

export function addSection(
  s: ScriptTemplateStructure,
  section: ScriptSection,
  atIndex?: number,
): ScriptTemplateStructure {
  const next = cloneStructure(s)
  const i = atIndex === undefined ? next.sections.length : Math.max(0, Math.min(atIndex, next.sections.length))
  next.sections.splice(i, 0, structuredClone(section))
  return next
}

export function removeSection(
  s: ScriptTemplateStructure,
  sectionId: string,
): ScriptTemplateStructure {
  const next = cloneStructure(s)
  next.sections = next.sections.filter((x) => x.id !== sectionId)
  return next
}

export function reorderSection(
  s: ScriptTemplateStructure,
  fromIndex: number,
  toIndex: number,
): ScriptTemplateStructure {
  const next = cloneStructure(s)
  const list = next.sections
  if (fromIndex < 0 || fromIndex >= list.length) return next
  const moved = list.splice(fromIndex, 1)[0]
  if (!moved) return next
  const dest = Math.max(0, Math.min(toIndex, list.length))
  list.splice(dest, 0, moved)
  return next
}

/** Ajusta o nº padrão de perguntas de um bloco (ex.: Bloco 1 de 3 → 4). */
export function setPerguntasPadrao(
  s: ScriptTemplateStructure,
  sectionId: string,
  n: number,
): ScriptTemplateStructure {
  const next = cloneStructure(s)
  const sec = next.sections.find((x) => x.id === sectionId)
  if (sec && sec.type === 'bloco_de_perguntas') sec.perguntasPadrao = Math.max(0, Math.floor(n))
  return next
}
