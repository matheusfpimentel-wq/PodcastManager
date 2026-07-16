import { describe, expect, it } from 'vitest'
import {
  addSection,
  nextVersionNumber,
  removeSection,
  renameSection,
  reorderSection,
  setPerguntasPadrao,
} from './version'
import type { ScriptTemplateStructure } from './types'

function base(): ScriptTemplateStructure {
  return {
    sections: [
      { id: 'cold', type: 'texto', label: 'Cold Open' },
      { id: 'vinheta', type: 'marcador', label: 'Vinheta' },
      {
        id: 'bloco1',
        type: 'bloco_de_perguntas',
        label: 'Bloco 1',
        subcampos: [{ key: 'pergunta', label: 'Pergunta aberta' }],
        perguntasPadrao: 3,
      },
    ],
  }
}

describe('imutabilidade das edições de template (teste obrigatório §9.4)', () => {
  it('renameSection não muta a estrutura original', () => {
    const original = base()
    const snapshot = structuredClone(original)
    const nova = renameSection(original, 'bloco1', 'Bloco Um')

    expect(nova).not.toBe(original)
    expect(nova.sections.find((s) => s.id === 'bloco1')?.label).toBe('Bloco Um')
    // original intacto — episódios na versão antiga não quebram
    expect(original).toEqual(snapshot)
    expect(original.sections.find((s) => s.id === 'bloco1')?.label).toBe('Bloco 1')
  })

  it('setPerguntasPadrao gera nova versão sem alterar a anterior (Bloco 1: 3 → 4)', () => {
    const original = base()
    const nova = setPerguntasPadrao(original, 'bloco1', 4)
    expect(nova.sections.find((s) => s.id === 'bloco1')).toMatchObject({ perguntasPadrao: 4 })
    // antiga permanece com 3
    expect(original.sections.find((s) => s.id === 'bloco1')).toMatchObject({ perguntasPadrao: 3 })
  })

  it('add/remove/reorder retornam novas estruturas sem mutar a original', () => {
    const original = base()
    const snapshot = structuredClone(original)

    const comRevisao = addSection(
      original,
      { id: 'revisao', type: 'texto', label: 'Revisão' },
      2,
    )
    expect(comRevisao.sections.map((s) => s.id)).toEqual(['cold', 'vinheta', 'revisao', 'bloco1'])

    const semVinheta = removeSection(original, 'vinheta')
    expect(semVinheta.sections.some((s) => s.id === 'vinheta')).toBe(false)

    const reordenado = reorderSection(original, 0, 2)
    expect(reordenado.sections[reordenado.sections.length - 1]?.id).toBe('cold')

    // original nunca mudou em nenhuma das operações
    expect(original).toEqual(snapshot)
  })
})

describe('nextVersionNumber', () => {
  it('incrementa a partir do maior número existente', () => {
    expect(nextVersionNumber(0)).toBe(1)
    expect(nextVersionNumber(3)).toBe(4)
  })
})
