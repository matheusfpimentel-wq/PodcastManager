import { describe, expect, it } from 'vitest'
import { cleanSubtitles, isSubtitleFile, processTranscriptFile } from './parse'

describe('cleanSubtitles', () => {
  it('remove cabeçalho WEBVTT, timecodes e tags de cue', () => {
    const vtt = [
      'WEBVTT',
      '',
      '00:00:01.000 --> 00:00:04.000',
      '<c>Olá</c>, bem-vindos ao episódio.',
      '',
      '00:00:04.000 --> 00:00:07.500',
      'Hoje falamos de improbidade.',
      '',
    ].join('\n')
    expect(cleanSubtitles(vtt)).toBe('Olá, bem-vindos ao episódio.\n\nHoje falamos de improbidade.')
  })

  it('remove índices numéricos e timecodes com vírgula do SRT', () => {
    const srt = ['1', '00:00:01,000 --> 00:00:04,000', 'Primeira fala.', '', '2', '00:00:04,000 --> 00:00:06,000', 'Segunda fala.'].join('\n')
    expect(cleanSubtitles(srt)).toBe('Primeira fala.\n\nSegunda fala.')
  })
})

describe('isSubtitleFile', () => {
  it('detecta .vtt e .srt, ignora .txt', () => {
    expect(isSubtitleFile('ep12.vtt')).toBe(true)
    expect(isSubtitleFile('ep12.SRT')).toBe(true)
    expect(isSubtitleFile('ep12.txt')).toBe(false)
  })
})

describe('processTranscriptFile', () => {
  it('texto puro só normaliza quebras de linha', () => {
    expect(processTranscriptFile('nota.txt', 'linha 1\r\nlinha 2\r\n')).toBe('linha 1\nlinha 2')
  })
  it('legenda passa pela limpeza', () => {
    const srt = '1\n00:00:01,000 --> 00:00:02,000\nfala\n'
    expect(processTranscriptFile('leg.srt', srt)).toBe('fala')
  })
})
