import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { parseFile, type ParsedFile } from '@/lib/parseFile'
import { planImport, type ColumnMapping } from '@/domain/import/planImport'
import { listPresets, savePresetMapping } from '@/data/repositories/importPresets'
import {
  applyControleImport,
  fetchExistingEpisodios,
} from '@/data/repositories/importControle'
import { applySpotifyImport } from '@/data/repositories/importSpotify'
import { APPLY_SUPPORTED, TARGET_FIELDS } from '@/data/importTargets'
import type { ImportPreset } from '@/data/types'
import type { MappedRecord } from '@/domain/import/planImport'

function asMapping(json: unknown): ColumnMapping {
  return json && typeof json === 'object' ? (json as ColumnMapping) : {}
}
function asKeys(json: unknown): string[] {
  return Array.isArray(json) ? (json as string[]) : []
}

export function ImportarPage() {
  const qc = useQueryClient()
  const presets = useQuery({ queryKey: ['import-presets'], queryFn: () => listPresets() })

  const [presetId, setPresetId] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedFile | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [dedupKeys, setDedupKeys] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)

  const preset: ImportPreset | undefined = useMemo(
    () => presets.data?.find((p) => p.id === presetId) ?? presets.data?.[0],
    [presets.data, presetId],
  )
  const fields = preset ? (TARGET_FIELDS[preset.tipo] ?? []) : []
  const applySupported = preset ? APPLY_SUPPORTED.has(preset.tipo) : false

  // Registros existentes p/ detectar update vs create (só 'controle').
  // 'spotify' faz upsert idempotente no banco, então dispensa cross-ref aqui.
  const existing = useQuery({
    queryKey: ['existing-episodios'],
    queryFn: () => fetchExistingEpisodios(),
    enabled: preset?.tipo === 'controle',
  })

  function selectPreset(p: ImportPreset) {
    setPresetId(p.id)
    setMapping(asMapping(p.mapa_colunas))
    setDedupKeys(asKeys(p.chave_dedup))
    setParsed(null)
    setFileName('')
  }

  async function onFile(file: File) {
    setParseError(null)
    setFileName(file.name)
    try {
      const result = await parseFile(file)
      setParsed(result)
      // Auto-mapeia por nome idêntico de coluna quando o preset ainda não define.
      if (Object.keys(mapping).length === 0 && preset) {
        const auto: ColumnMapping = {}
        for (const f of TARGET_FIELDS[preset.tipo] ?? []) {
          const hit = result.headers.find((h) => h.toLowerCase() === f.label.toLowerCase())
          if (hit) auto[f.key] = hit
        }
        setMapping(auto)
      }
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Falha ao ler arquivo')
    }
  }

  const cleanMapping = useMemo(() => {
    const out: ColumnMapping = {}
    for (const [k, v] of Object.entries(mapping)) if (v) out[k] = v
    return out
  }, [mapping])

  const plan = useMemo(() => {
    if (!parsed) return null
    return planImport(parsed.rows, {
      mapping: cleanMapping,
      dedupKeys,
      existing: (existing.data ?? []) as MappedRecord[],
    })
  }, [parsed, cleanMapping, dedupKeys, existing.data])

  const apply = useMutation({
    mutationFn: async () => {
      if (!plan || !preset) throw new Error('Nada para aplicar')
      const report =
        preset.tipo === 'spotify'
          ? await applySpotifyImport(plan, fields)
          : await applyControleImport(plan, fields)
      // memoriza o mapeamento no preset para a próxima importação
      await savePresetMapping(preset.id, cleanMapping, dedupKeys)
      return report
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['existing-episodios'] })
      qc.invalidateQueries({ queryKey: ['board'] })
      qc.invalidateQueries({ queryKey: ['import-presets'] })
      qc.invalidateQueries({ queryKey: ['metrics'] })
    },
  })

  if (presets.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Importação</h1>

      {/* 1) Preset */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">1. Fonte</h2>
        <div className="flex flex-wrap gap-2">
          {presets.data?.map((p) => (
            <Button
              key={p.id}
              variant={preset?.id === p.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => selectPreset(p)}
            >
              {p.nome}
            </Button>
          ))}
        </div>
        {preset && !applySupported && (
          <p className="text-xs text-amber-600">
            Prévia disponível, mas a aplicação deste tipo ({preset.tipo}) entra numa fase
            posterior. “AT MEMBROS” é processado só no client (LGPD).
          </p>
        )}
      </section>

      {/* 2) Upload */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">2. Arquivo (CSV ou XLSX)</h2>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFile(f)
          }}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm hover:file:bg-accent"
        />
        {fileName && parsed && (
          <p className="text-xs text-muted-foreground">
            {fileName}: {parsed.rows.length} linha(s), {parsed.headers.length} coluna(s)
          </p>
        )}
        {parseError && <p className="text-sm text-destructive">{parseError}</p>}
      </section>

      {/* 3) Mapeamento */}
      {parsed && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">3. Mapear colunas → campos</h2>
          <div className="rounded-md border border-border">
            {fields.map((f) => (
              <div key={f.key} className="flex items-center gap-3 border-b border-border p-2 last:border-0">
                <span className="w-48 text-sm">
                  {f.label}
                  {dedupKeys.includes(f.key) && (
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      chave dedup
                    </Badge>
                  )}
                </span>
                <select
                  className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                  value={mapping[f.key] ?? ''}
                  onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
                >
                  <option value="">— não importar —</option>
                  {parsed.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Deduplicação por: <strong>{dedupKeys.join(', ') || '(nenhuma)'}</strong>
          </p>
        </section>
      )}

      {/* 4) Prévia */}
      {plan && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">4. Prévia</h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Criar: {plan.summary.criados}</Badge>
            <Badge variant="secondary">Atualizar: {plan.summary.atualizados}</Badge>
            <Badge variant="outline">Duplicados no arquivo: {plan.summary.duplicados}</Badge>
            <Badge variant={plan.summary.problemas > 0 ? 'destructive' : 'outline'}>
              Problemas: {plan.summary.problemas}
            </Badge>
          </div>

          {plan.problems.length > 0 && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <p className="mb-1 font-medium text-destructive">Linhas com problema (não aplicadas):</p>
              <ul className="list-disc pl-5">
                {plan.problems.slice(0, 8).map((p) => (
                  <li key={p.index}>
                    linha {p.index + 2}: {p.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              disabled={!applySupported || apply.isPending || plan.summary.criados + plan.summary.atualizados === 0}
              onClick={() => apply.mutate()}
            >
              {apply.isPending ? 'Aplicando…' : 'Aplicar importação'}
            </Button>
            {!applySupported && (
              <span className="text-xs text-muted-foreground">Aplicação indisponível para este tipo.</span>
            )}
          </div>

          {apply.isError && (
            <p className="text-sm text-destructive">
              {apply.error instanceof Error ? apply.error.message : 'Erro ao aplicar'}
            </p>
          )}
          {apply.data && (
            <div className="rounded-md border border-green-500/40 bg-green-500/5 p-3 text-sm">
              <p className="font-medium text-green-700 dark:text-green-400">
                Importado: {apply.data.criados} criado(s), {apply.data.atualizados} atualizado(s).
              </p>
              {apply.data.erros.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-destructive">
                  {apply.data.erros.slice(0, 8).map((er, i) => (
                    <li key={i}>
                      {er.contexto}: {er.motivo}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
