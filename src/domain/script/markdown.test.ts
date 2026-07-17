import { describe, expect, it } from 'vitest'
import { markdownToScript, scriptToMarkdown } from './markdown'
import type { EpisodeScriptContent, ScriptTemplateStructure } from './types'

const template: ScriptTemplateStructure = {
  sections: [
    { id: 'cold', type: 'texto', label: 'Cold Open' },
    { id: 'vinheta', type: 'marcador', label: 'Vinheta' },
    { id: 'abertura', type: 'texto', label: 'Abertura' },
    {
      id: 'bloco1',
      type: 'bloco_de_perguntas',
      label: 'Bloco 1',
      subcampos: [
        { key: 'contexto', label: 'Contexto breve' },
        { key: 'pergunta', label: 'Pergunta aberta' },
        { key: 'debate', label: 'Três pontos de debate' },
      ],
      perguntasPadrao: 3,
      camposOpcionais: [{ key: 'olhar_mp', label: 'Olhar do MP' }],
    },
  ],
}

const content: EpisodeScriptContent = {
  cold: { type: 'texto', text: 'Uma abertura instigante sobre o tema.' },
  abertura: { type: 'texto', text: 'Bem-vindos ao Julgados e Comentados.' },
  bloco1: {
    type: 'bloco',
    perguntas: [
      { contexto: 'Contexto da primeira', pergunta: 'O que mudou?', debate: 'a; b; c' },
      { contexto: 'Segunda', pergunta: 'E agora?', debate: 'd; e; f' },
    ],
    opcionais: { olhar_mp: 'Perspectiva institucional do MP.' },
  },
}

describe('scriptToMarkdown', () => {
  it('emite ## seção, marcador, ### Pergunta N e **subcampos**', () => {
    const md = scriptToMarkdown(template, content)
    expect(md).toContain('## Cold Open')
    expect(md).toContain('_[marcador]_')
    expect(md).toContain('### Pergunta 1')
    expect(md).toContain('**Contexto breve:** Contexto da primeira')
    expect(md).toContain('**Olhar do MP:** Perspectiva institucional do MP.')
  })
})

describe('round-trip Markdown ↔ template (teste obrigatório §9.2)', () => {
  it('serializar e re-parsear preserva o conteúdo', () => {
    const md = scriptToMarkdown(template, content)
    const { content: back, unmapped } = markdownToScript(template, md)
    expect(unmapped).toEqual([])
    expect(back).toEqual(content)
  })

  it('é estável em nova ida-e-volta (idempotente)', () => {
    const md1 = scriptToMarkdown(template, content)
    const parsed1 = markdownToScript(template, md1).content
    const md2 = scriptToMarkdown(template, parsed1)
    expect(md2).toBe(md1)
  })
})

describe('tolerância do parser', () => {
  it('reporta seções desconhecidas em unmapped sem descartar em silêncio', () => {
    const md = `## Cold Open
Texto ok

## Seção Inexistente
conteúdo perdido?

## Abertura
Abertura ok`
    const { content: back, unmapped } = markdownToScript(template, md)
    expect(back.cold).toEqual({ type: 'texto', text: 'Texto ok' })
    expect(back.abertura).toEqual({ type: 'texto', text: 'Abertura ok' })
    expect(unmapped).toContain('## Seção Inexistente')
  })

  it('reporta subcampo desconhecido dentro de um bloco', () => {
    const md = `## Bloco 1
### Pergunta 1
**Contexto breve:** ok
**Campo Fantasma:** ??`
    const { unmapped } = markdownToScript(template, md)
    expect(unmapped.some((l) => l.includes('Campo Fantasma'))).toBe(true)
  })
})
