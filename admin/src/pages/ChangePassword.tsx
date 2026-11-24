import { KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { MoonLogo } from '../components/Layout'
import { Button, Field, Input, Modal, Notice } from '../components/ui'
import { ApiError, errorMessage } from '../lib/api'
import { ROLE_LABELS, useAuth } from '../lib/auth'

/** Règles minimales, vérifiées aussi par l'API. */
function checks(pw: string) {
  return [
    { ok: pw.length >= 8, label: 'Au moins 8 caractères' },
    {
      ok: /[A-Za-z]/.test(pw) && /\d/.test(pw),
      label: 'Des lettres et au moins un chiffre',
    },
  ]
}

function PasswordForm({ askCurrent, onDone, submitLabel }: { askCurrent: boolean; onDone?: () => void; submitLabel: string }) {
  const { changePassword, loginPassword } = useAuth()
  const [current, setCurrent] = useState('')
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const rules = checks(pw)
  const valid = rules.every((r) => r.ok) && pw === confirm && (!askCurrent || current)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setErrors({})
    try {
      await changePassword(askCurrent ? current : (loginPassword() ?? ''), pw, confirm)
      onDone?.()
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.errors).length) {
        setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])))
        if (err.errors.current_password && !askCurrent) setError('Le mot de passe provisoire a expiré : reconnecte-toi.')
      } else setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {askCurrent && (
        <Field label="Mot de passe actuel" required error={errors.current_password}>
          <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </Field>
      )}
      <Field label="Nouveau mot de passe" required error={errors.password}>
        <Input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
      </Field>
      <ul className="space-y-1 text-xs font-semibold">
        {rules.map((r) => (
          <li key={r.label} className={r.ok ? 'text-emerald-700' : 'text-muted'}>
            {r.ok ? '✓' : '•'} {r.label}
          </li>
        ))}
      </ul>
      <Field label="Confirmer le nouveau mot de passe" required error={confirm && pw !== confirm ? 'Les deux mots de passe ne sont pas identiques.' : undefined}>
        <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      </Field>
      {error && <Notice tone="danger">{error}</Notice>}
      <Button type="submit" loading={loading} disabled={!valid} className="w-full">
        {submitLabel}
      </Button>
    </form>
  )
}

/** Premier accès : la personne remplace le mot de passe donné par l'administrateur avant d'entrer. */
export default function FirstPassword() {
  const { staff, loginPassword, logout } = useAuth()
  return (
    <div className="flex min-h-full items-center justify-center bg-night p-4">
      <div className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-8 shadow-2xl">
        <div className="flex items-center gap-2">
          <MoonLogo size={40} />
          <div>
            <div className="text-2xl font-black">Bienvenue {staff?.name}</div>
            <div className="text-sm font-bold text-muted">{staff && ROLE_LABELS[staff.role]}</div>
          </div>
        </div>
        <Notice tone="lavender" icon={<KeyRound className="size-5" />}>
          Ton compte a été créé avec un mot de passe provisoire. Choisis maintenant ton mot de passe personnel : personne d'autre ne le connaîtra, pas même l'administrateur.
        </Notice>
        <PasswordForm askCurrent={!loginPassword()} submitLabel="Enregistrer et accéder à la plateforme" />
        <button onClick={logout} className="block w-full text-center text-sm font-bold text-purple hover:underline">
          Se déconnecter
        </button>
      </div>
    </div>
  )
}

/** Changement volontaire, depuis le menu. */
export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [done, setDone] = useState(false)
  const close = () => (setDone(false), onClose())
  return (
    <Modal open={open} onClose={close} title="Changer mon mot de passe">
      {done ? (
        <div className="space-y-4">
          <Notice tone="mint">Mot de passe modifié. Tes autres appareils ont été déconnectés.</Notice>
          <Button className="w-full" onClick={close}>
            Fermer
          </Button>
        </div>
      ) : (
        <PasswordForm askCurrent submitLabel="Enregistrer" onDone={() => setDone(true)} />
      )}
    </Modal>
  )
}
