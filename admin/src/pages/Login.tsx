import { useState, type FormEvent } from 'react'
import { MoonLogo } from '../components/Layout'
import { Button, Field, Input, Notice } from '../components/ui'
import { errorMessage } from '../lib/api'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(email, password)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-night p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-8 shadow-2xl">
        <div className="flex items-center gap-2">
          <MoonLogo size={40} />
          <div>
            <div className="text-2xl font-black">Moon</div>
            <div className="text-sm font-bold text-muted">Back-office de l'équipe</div>
          </div>
        </div>
        <Field label="E-mail">
          <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Mot de passe">
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && <Notice tone="danger">{error}</Notice>}
        <Button type="submit" loading={loading} className="w-full">
          Me connecter
        </Button>
        <p className="text-center text-xs text-muted">Accès réservé à l'équipe Moon. Toutes les actions sont journalisées.</p>
      </form>
    </div>
  )
}
