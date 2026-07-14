import { describe, expect, it } from 'vitest'
import { renderTemplate } from './renderTemplate'

describe('renderTemplate', () => {
  const context = {
    pessoa: { nome: 'Ana Ribeiro', tratamento: 'Dra.' },
    episodio: { tema: 'Improbidade', data_gravacao: '2026-07-14' },
    links: { spotify: 'https://spoti.fi/abc' },
  }

  it('resolves nested variables', () => {
    const { text, missing } = renderTemplate(
      'Prezada {{pessoa.tratamento}} {{pessoa.nome}} — tema: {{episodio.tema}}',
      context,
    )
    expect(text).toBe('Prezada Dra. Ana Ribeiro — tema: Improbidade')
    expect(missing).toEqual([])
  })

  it('never emits a missing variable as blank; leaves the raw token and reports it', () => {
    const { text, missing, tokens } = renderTemplate(
      'Contato: {{pessoa.telefone}} / {{links.spotify}}',
      context,
    )
    // The unresolved token stays verbatim so the UI can flag it in red.
    expect(text).toContain('{{pessoa.telefone}}')
    expect(text).toContain('https://spoti.fi/abc')
    expect(missing).toEqual(['pessoa.telefone'])
    expect(tokens.find((t) => t.path === 'pessoa.telefone')?.missing).toBe(true)
  })

  it('treats empty-string values as missing', () => {
    const { missing } = renderTemplate('{{pessoa.instagram}}', {
      pessoa: { instagram: '   ' },
    })
    expect(missing).toEqual(['pessoa.instagram'])
  })

  it('applies the extenso filter to dates (pt-BR, UTC-stable)', () => {
    const { text } = renderTemplate('{{episodio.data_gravacao | extenso}}', context)
    expect(text).toBe('14 de julho de 2026')
  })

  it('falls back to the raw string when a filter is unknown', () => {
    const { text, missing } = renderTemplate('{{episodio.tema | inexistente}}', context)
    expect(text).toBe('Improbidade')
    expect(missing).toEqual([])
  })

  it('supports custom filters passed via options', () => {
    const { text } = renderTemplate(
      '{{pessoa.nome | grito}}',
      context,
      { filters: { grito: (v) => `${String(v).toUpperCase()}!!!` } },
    )
    expect(text).toBe('ANA RIBEIRO!!!')
  })
})
