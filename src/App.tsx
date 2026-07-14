import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { cn } from '@/lib/utils'

/**
 * Application shell. Navigation mirrors the functional modules of the spec.
 * Pages are intentionally placeholders until the schema is approved and each
 * phase is implemented (see docs/roadmap in CLAUDE.md).
 */

const NAV = [
  { to: '/hoje', label: 'Hoje' },
  { to: '/kanban', label: 'Produção' },
  { to: '/pessoas', label: 'Pessoas' },
  { to: '/episodios', label: 'Episódios' },
  { to: '/acervo', label: 'Acervo' },
  { to: '/metricas', label: 'Métricas' },
  { to: '/importar', label: 'Importar' },
  { to: '/config', label: 'Configurações' },
] as const

function Placeholder({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-muted-foreground">
        Módulo em construção. A fundação do projeto está pronta; esta tela será
        implementada na fase correspondente do roadmap.
      </p>
    </div>
  )
}

export default function App() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center gap-6">
          <span className="font-semibold tracking-tight">Julgados e Comentados</span>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="container py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/hoje" replace />} />
          <Route path="/hoje" element={<Placeholder title="Hoje" />} />
          <Route path="/kanban" element={<Placeholder title="Pipeline de produção" />} />
          <Route path="/pessoas" element={<Placeholder title="Pessoas (CRM)" />} />
          <Route path="/episodios" element={<Placeholder title="Episódios" />} />
          <Route path="/acervo" element={<Placeholder title="Acervo pesquisável" />} />
          <Route path="/metricas" element={<Placeholder title="Métricas" />} />
          <Route path="/importar" element={<Placeholder title="Importação" />} />
          <Route path="/config" element={<Placeholder title="Configurações" />} />
          <Route path="*" element={<Placeholder title="Página não encontrada" />} />
        </Routes>
      </main>
    </div>
  )
}
