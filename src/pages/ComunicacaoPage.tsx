import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { GerarTab } from './comunicacao/GerarTab'
import { ModelosTab } from './comunicacao/ModelosTab'

export function ComunicacaoPage() {
  const [tab, setTab] = useState<'gerar' | 'modelos'>('gerar')
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Comunicação</h1>
      <div className="mb-4 flex gap-1">
        <Button variant={tab === 'gerar' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('gerar')}>
          Gerar mensagem
        </Button>
        <Button variant={tab === 'modelos' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('modelos')}>
          Modelos
        </Button>
      </div>
      {tab === 'gerar' ? <GerarTab /> : <ModelosTab />}
    </div>
  )
}
