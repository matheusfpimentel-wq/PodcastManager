import { describe, expect, it } from 'vitest'
import { countWords, estimateScript, sectionWordCount } from './estimate'
import type { EpisodeScriptContent, ScriptTemplateStructure } from './types'

describe('countWords', () => {
  it('counts words ignoring extra whitespace', () => {
    expect(countWords('  um   dois três ')).toBe(3)
    expect(countWords('')).toBe(0)
  })
})

describe('sectionWordCount', () => {
  it('sums all subfields of all questions plus optionals in a bloco', () => {
    expect(
      sectionWordCount({
        type: 'bloco',
        perguntas: [
          { contexto: 'a b', pergunta: 'c d e' },
          { contexto: 'f', pergunta: 'g h' },
        ],
        opcionais: { olhar_mp: 'i j k' },
      }),
    ).toBe(2 + 3 + 1 + 2 + 3)
  })
})

describe('estimateScript', () => {
  const template: ScriptTemplateStructure = {
    sections: [
      { id: 'vinheta', type: 'marcador', label: 'Vinheta' },
      { id: 'abertura', type: 'texto', label: 'Abertura' },
      {
        id: 'bloco1',
        type: 'bloco_de_perguntas',
        label: 'Bloco 1',
        subcampos: [{ key: 'pergunta', label: 'Pergunta aberta' }],
        perguntasPadrao: 3,
      },
    ],
  }

  it('estimates seconds from words ÷ ppm and skips marcadores', () => {
    // 150 palavras a 150 ppm = 60s
    const abertura = Array.from({ length: 150 }, () => 'x').join(' ')
    const content: EpisodeScriptContent = {
      abertura: { type: 'texto', text: abertura },
      bloco1: { type: 'bloco', perguntas: [{ pergunta: 'a b c' }] },
    }
    const est = estimateScript(template, content, { ppm: 150, alvoMinutos: 1 })
    expect(est.totalPalavras).toBe(153)
    expect(est.porSecao.find((s) => s.sectionId === 'abertura')?.segundos).toBe(60)
    // marcador não aparece
    expect(est.porSecao.some((s) => s.sectionId === 'vinheta')).toBe(false)
    // 153 palavras > alvo de 60s (150 palavras) => estourou
    expect(est.estourou).toBe(true)
  })

  it('defaults ppm to 150 when not provided or invalid', () => {
    const est = estimateScript(template, {}, { ppm: 0 })
    expect(est.ppm).toBe(150)
  })
})
