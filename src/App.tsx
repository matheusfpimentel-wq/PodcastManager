import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AuthProvider, useAuth } from '@/auth/AuthProvider'
import { LoginPage } from '@/auth/LoginPage'
import { PessoasPage } from '@/pages/PessoasPage'

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
        Módulo em construção. A tela será implementada na fase correspondente do roadmap.
      </p>
    </div>
  )
}

function Shell() {
  const { signOut, session } = useAuth()
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
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {session?.user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/hoje" replace />} />
          <Route path="/hoje" element={<Placeholder title="Hoje" />} />
          <Route path="/kanban" element={<Placeholder title="Pipeline de produção" />} />
          <Route path="/pessoas" element={<PessoasPage />} />
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

function Gate() {
  const { configured, loading, session } = useAuth()

  if (!configured) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="text-xl font-semibold">Supabase não configurado</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> em
          <code> .env.local</code> (veja <code>.env.example</code>) e recarregue.
        </p>
      </div>
    )
  }
  if (loading) {
    return <div className="py-24 text-center text-sm text-muted-foreground">Carregando…</div>
  }
  return session ? <Shell /> : <LoginPage />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
