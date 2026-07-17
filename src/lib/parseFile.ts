import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { RawRow } from '@/domain/import/planImport'

/**
 * Parsing de planilhas NO CLIENT (spec §6.1 / LGPD): CSV via PapaParse, XLSX via
 * SheetJS. Retorna cabeçalhos e linhas como objetos { header: valor }.
 */

export interface ParsedFile {
  headers: string[]
  rows: RawRow[]
}

function parseCsv(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (res) => {
        const headers = res.meta.fields ?? []
        resolve({ headers, rows: res.data as RawRow[] })
      },
      error: (err) => reject(new Error(`Falha ao ler CSV: ${err.message}`)),
    })
  })
}

async function parseXlsx(file: File): Promise<ParsedFile> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const firstSheetName = wb.SheetNames[0]
  if (!firstSheetName) return { headers: [], rows: [] }
  const sheet = wb.Sheets[firstSheetName]
  if (!sheet) return { headers: [], rows: [] }
  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: null, raw: true })
  const headers = rows.length > 0 ? Object.keys(rows[0] as object) : []
  return { headers, rows }
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv') || file.type === 'text/csv') return parseCsv(file)
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseXlsx(file)
  // fallback: tenta CSV
  return parseCsv(file)
}
