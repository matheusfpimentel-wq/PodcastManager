import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from './AuthProvider'

/** Login de usuário único. Primeiro acesso cria a conta (signup). */
export function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        const { needsConfirmation } = await signUp(email, password)
        if (needsConfirmation) {
          setInfo('Conta criada. Confirme pelo e-mail enviado e depois faça login.')
          setMode('login')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">Julgados e Comentados</CardTitle>
          <p className="text-sm text-muted-foreground">
            {mode === 'login' ? 'Entre para gerenciar a produção.' : 'Crie a conta do produtor.'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {info && <p className="text-sm text-muted-foreground">{info}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>
          <button
            type="button"
            className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setError(null)
              setInfo(null)
            }}
          >
            {mode === 'login' ? 'Primeiro acesso? Criar conta' : 'Já tenho conta — entrar'}
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
