/**
 * Message-template rendering (spec §6.6).
 *
 * Pure domain logic — no persistence, no React. Renders templates such as:
 *   "Prezado(a) {{pessoa.tratamento}} {{pessoa.nome}}, gravaremos em
 *    {{episodio.data_gravacao | extenso}}. Ouça em {{links.spotify}}."
 *
 * A variable with no value is NEVER silently emitted as blank: the token is
 * reported as `missing` so the UI can highlight it in red before sending.
 *
 * Filters are a small extensible registry (data-friendly): the set of filters
 * is not the "format" of the program, so keeping it in code is fine, but new
 * ones can be added without touching the parser.
 */

export type TemplateContext = Record<string, unknown>

export interface RenderedToken {
  /** The full original token including braces, e.g. "{{pessoa.nome}}". */
  raw: string
  /** The variable path, e.g. "pessoa.nome". */
  path: string
  /** Optional filter name, e.g. "extenso". */
  filter?: string
  /** The rendered value, or the raw token when missing. */
  output: string
  /** True when the path resolved to null/undefined/empty string. */
  missing: boolean
}

export interface RenderResult {
  /** Fully rendered text. Missing tokens are left as their raw `{{...}}` form. */
  text: string
  /** Every token encountered, in order, with resolution metadata. */
  tokens: RenderedToken[]
  /** Distinct paths that could not be resolved (for red highlighting / blocking). */
  missing: string[]
}

export type TemplateFilter = (value: unknown, ctx: TemplateContext) => string

const TOKEN_RE = /\{\{\s*([^}|]+?)\s*(?:\|\s*([^}]+?)\s*)?\}\}/g

/** Resolve a dotted path (e.g. "pessoa.nome") against a nested context object. */
function resolvePath(ctx: TemplateContext, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined
    return (acc as Record<string, unknown>)[key]
  }, ctx)
}

function isEmpty(value: unknown): boolean {
  return value == null || (typeof value === 'string' && value.trim() === '')
}

/** Date → "14 de julho de 2026" (pt-BR). Accepts Date or ISO/parseable string. */
export const extensoFilter: TemplateFilter = (value) => {
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export const DEFAULT_FILTERS: Record<string, TemplateFilter> = {
  extenso: extensoFilter,
  upper: (v) => String(v).toUpperCase(),
  lower: (v) => String(v).toLowerCase(),
}

export interface RenderOptions {
  filters?: Record<string, TemplateFilter>
}

export function renderTemplate(
  template: string,
  context: TemplateContext,
  options: RenderOptions = {},
): RenderResult {
  const filters = { ...DEFAULT_FILTERS, ...options.filters }
  const tokens: RenderedToken[] = []
  const missing = new Set<string>()

  const text = template.replace(TOKEN_RE, (raw, rawPath: string, rawFilter?: string) => {
    const path = rawPath.trim()
    const filter = rawFilter?.trim()
    const value = resolvePath(context, path)

    if (isEmpty(value)) {
      missing.add(path)
      tokens.push({ raw, path, filter, output: raw, missing: true })
      return raw
    }

    let output: string
    if (filter) {
      const fn = filters[filter]
      output = fn ? fn(value, context) : String(value)
    } else {
      output = String(value)
    }

    tokens.push({ raw, path, filter, output, missing: false })
    return output
  })

  return { text, tokens, missing: [...missing] }
}
