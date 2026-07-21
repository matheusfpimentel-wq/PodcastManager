/**
 * Normalização de transcrição a partir de arquivos de legenda (.vtt/.srt) ou
 * texto puro (.txt). Função pura, sem I/O — recebe o conteúdo do arquivo e o
 * nome, devolve texto limpo (sem timestamps, índices ou cabeçalho WEBVTT).
 */

const SRT_INDEX = /^\d+$/
// 00:00:01,000 --> 00:00:04,000  (srt usa vírgula; vtt usa ponto; hora opcional)
const TIMECODE = /^\d{1,2}:\d{2}(?::\d{2})?[.,]\d{3}\s*-->\s*\d{1,2}:\d{2}(?::\d{2})?[.,]\d{3}/
const CUE_TAG = /<[^>]+>/g // <c>, <00:00:01.000>, etc.

export function cleanSubtitles(raw: string): string {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n')
  const out: string[] = []
  for (const lineRaw of lines) {
    const line = lineRaw.trim()
    if (line === '') {
      // preserva quebra de parágrafo, sem acumular vazias
      if (out.length > 0 && out[out.length - 1] !== '') out.push('')
      continue
    }
    if (line === 'WEBVTT') continue
    if (line.startsWith('NOTE ') || line === 'NOTE') continue
    if (SRT_INDEX.test(line)) continue
    if (TIMECODE.test(line)) continue
    out.push(line.replace(CUE_TAG, '').trim())
  }
  // remove vazias nas pontas
  while (out.length > 0 && out[0] === '') out.shift()
  while (out.length > 0 && out[out.length - 1] === '') out.pop()
  return out.join('\n')
}

/** Decide se o arquivo é legenda (precisa de limpeza) pelo nome/extensão. */
export function isSubtitleFile(fileName: string): boolean {
  return /\.(vtt|srt)$/i.test(fileName.trim())
}

/** Processa o texto bruto de um arquivo conforme o tipo. */
export function processTranscriptFile(fileName: string, raw: string): string {
  return isSubtitleFile(fileName) ? cleanSubtitles(raw) : raw.replace(/\r\n?/g, '\n').trim()
}
