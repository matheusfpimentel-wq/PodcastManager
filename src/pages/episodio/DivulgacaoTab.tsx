import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { getPromo, savePromo, type Peca, type PromoStatus } from '@/data/repositories/episodePromo'

const PECAS: Array<{ key: Peca; label: string }> = [
  { key: 'spotify', label: 'Descrição do Spotify' },
  { key: 'site_mppr', label: 'Texto institucional (site MPPR)' },
  { key: 'instagram', label: 'Legenda do Instagram' },
  { key: 'whatsapp', label: 'Mensagem de WhatsApp' },
  { key: 'youtube', label: 'Nota do YouTube' },
]
const STATUS: PromoStatus[] = ['rascunho', 'pronto', 'publicado']

type Textos = Record<Peca, string>
type Status = Record<Peca, PromoStatus>

export function DivulgacaoTab({ episodeId }: { episodeId: string }) {
  const qc = useQueryClient()
  const promo = useQuery({ queryKey: ['promo', episodeId], queryFn: () => getPromo(episodeId) })

  const [textos, setTextos] = useState<Textos>({
    spotify: '', site_mppr: '', instagram: '', whatsapp: '', youtube: '',
  })
  const [status, setStatus] = useState<Status>({
    spotify: 'rascunho', site_mppr: 'rascunho', instagram: 'rascunho', whatsapp: 'rascunho', youtube: 'rascunho',
  })

  useEffect(() => {
    if (!promo.data) return
    setTextos({
      spotify: promo.data.spotify,
      site_mppr: promo.data.site_mppr,
      instagram: promo.data.instagram,
      whatsapp: promo.data.whatsapp,
      youtube: promo.data.youtube,
    })
    const s = (promo.data.status ?? {}) as Partial<Status>
    setStatus({
      spotify: s.spotify ?? 'rascunho',
      site_mppr: s.site_mppr ?? 'rascunho',
      instagram: s.instagram ?? 'rascunho',
      whatsapp: s.whatsapp ?? 'rascunho',
      youtube: s.youtube ?? 'rascunho',
    })
  }, [promo.data])

  const save = useMutation({
    mutationFn: () => savePromo(episodeId, { ...textos, status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promo', episodeId] }),
  })

  if (promo.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Cole aqui o pacote de divulgação (redigido fora). O sistema guarda, organiza e serve — e os
        links colados alimentam as variáveis <code>{'{{links.*}}'}</code> do Modelo de Lançamento.
      </p>
      {PECAS.map((p) => (
        <div key={p.key} className="space-y-1.5 rounded-md border border-border p-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold">{p.label}</label>
            <select
              className="ml-auto h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={status[p.key]}
              onChange={(e) => setStatus((s) => ({ ...s, [p.key]: e.target.value as PromoStatus }))}
            >
              {STATUS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(textos[p.key])}
            >
              Copiar
            </Button>
          </div>
          <Textarea
            value={textos[p.key]}
            onChange={(e) => setTextos((t) => ({ ...t, [p.key]: e.target.value }))}
          />
        </div>
      ))}
      <div className="flex items-center justify-end gap-2">
        {promo.data && (
          <div className="mr-auto flex flex-wrap gap-1">
            {PECAS.map((p) => (
              <Badge
                key={p.key}
                variant={status[p.key] === 'publicado' ? 'secondary' : 'outline'}
              >
                {p.key}: {status[p.key]}
              </Badge>
            ))}
          </div>
        )}
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? 'Salvando…' : 'Salvar divulgação'}
        </Button>
      </div>
    </div>
  )
}
