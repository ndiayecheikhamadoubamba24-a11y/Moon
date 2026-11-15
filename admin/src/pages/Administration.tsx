import { CheckCircle2, Copy, Eye, EyeOff, KeyRound, RefreshCw, Settings, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, ErrorState, Field, Input, Loading, Modal, Notice, PageHeader, Pagination, Pill, Select, Table, Tabs, useConfirm } from '../components/ui'
import { api, ApiError, errorMessage, type Paginated } from '../lib/api'
import { ROLE_LABELS, useAuth } from '../lib/auth'
import { fmtDate, fmtDateTime } from '../lib/format'
import { useApi } from '../lib/hooks'

type Log = { id: number; action: string; subject_type: string | null; subject_id: number | null; meta: Record<string, unknown> | null; ip_address: string | null; created_at: string; user: { name: string; role: string } | null }

export default function Administration() {
  const [tab, setTab] = useState<'team' | 'audit'>('team')
  return (
    <>
      <PageHeader icon={<Settings className="text-purple" />} title="Administration" crumbs={['Administration']} actions={<Tabs tabs={[{ value: 'team', label: 'Équipe' }, { value: 'audit', label: "Journal d'audit" }]} value={tab} onChange={setTab} />} />
      {tab === 'team' ? <Team /> : <Audit />}
    </>
  )
}

type Member = { id: number; name: string; email: string; role: string; status: string; last_activity_date: string | null; created_at: string; must_change_password: boolean }

/** Ce que chaque poste voit dans le back-office (affiché lors de la création). */
const ROLE_SCOPES: Record<string, string> = {
  super_admin: 'Tout le back-office, y compris la gestion de l’équipe',
  educator: 'Modules, jeux et défis, conseils et FAQ, publications, annonces',
  moderator: 'Signalements et comptes des utilisatrices',
  support: 'Demandes d’aide, centres et contacts, publications, annonces',
}

/** Mot de passe provisoire lisible à l'oral (sans 0/O ni 1/l). */
function generatePassword() {
  const pick = (set: string, n: number) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (x) => set[x % set.length]).join('')
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'
  return pick(letters, 4) + pick('23456789', 2) + pick(letters, 4)
}

type Credentials = { name: string; email: string; role: string; password: string }

/** Récapitulatif à transmettre à la personne : le mot de passe provisoire n'est plus affiché ensuite. */
function CredentialsCard({ c, onClose }: { c: Credentials; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const text = `Bonjour ${c.name},\nVoici ton accès au back-office Moon (${ROLE_LABELS[c.role]}) :\nAdresse : ${window.location.origin}/admin\nE-mail : ${c.email}\nMot de passe provisoire : ${c.password}\nÀ ta première connexion, tu choisiras ton mot de passe personnel.`
  const copy = () =>
    navigator.clipboard
      .writeText(text)
      .then(() => setCopied(true))
      .catch(() => setCopied(false))
  return (
    <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-center gap-2 font-black text-emerald-800">
        <CheckCircle2 className="size-5" /> Accès prêt pour {c.name}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted">E-mail</dt>
        <dd className="font-bold break-all">{c.email}</dd>
        <dt className="text-muted">Mot de passe</dt>
        <dd className="font-mono text-base font-black tracking-wider">{c.password}</dd>
        <dt className="text-muted">Poste</dt>
        <dd className="font-bold">{ROLE_LABELS[c.role]}</dd>
      </dl>
      <p className="text-xs text-muted">
        Transmets ces informations de façon sûre (de vive voix, message privé). À sa première connexion, la personne devra choisir son propre mot de passe. Ce mot de passe provisoire ne sera plus
        affiché.
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" icon={<Copy className="size-4" />} onClick={copy}>
          {copied ? 'Copié !' : 'Copier le message'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Terminé
        </Button>
      </div>
    </div>
  )
}

function Team() {
  const { staff: me } = useAuth()
  const { data, loading, error, reload } = useApi<Member[]>('/admin/staff')
  const blank = () => ({ name: '', email: '', role: 'educator', password: generatePassword() })
  const [f, setF] = useState(blank)
  const [show, setShow] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ tone: 'mint' | 'danger'; text: string } | null>(null)
  const [created, setCreated] = useState<Credentials | null>(null)
  const [saving, setSaving] = useState(false)
  const [reset, setReset] = useState<Member | null>(null)
  const [resetDone, setResetDone] = useState<Credentials | null>(null)
  const confirm = useConfirm()

  const create = async () => {
    setSaving(true)
    setErrors({})
    setMsg(null)
    try {
      await api('/admin/staff', { method: 'POST', body: f })
      setCreated({ name: f.name, email: f.email.trim().toLowerCase(), role: f.role, password: f.password })
      setF(blank())
      reload()
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.errors).length) setErrors(Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k, v[0]])))
      else setMsg({ tone: 'danger', text: errorMessage(e) })
    } finally {
      setSaving(false)
    }
  }
  const changeRole = async (m: Member, role: string) => {
    if (role === 'user' && !confirm(`Retirer l’accès de ${m.name} ? La personne ne pourra plus se connecter au back-office.`)) return
    try {
      await api(`/admin/users/${m.id}/role`, { method: 'PATCH', body: { role } })
      setMsg({ tone: 'mint', text: role === 'user' ? `Accès de ${m.name} retiré.` : `${m.name} est maintenant : ${ROLE_LABELS[role]}.` })
      reload()
    } catch (e) {
      setMsg({ tone: 'danger', text: errorMessage(e) })
    }
  }
  const doReset = async (m: Member) => {
    const password = generatePassword()
    try {
      await api(`/admin/staff/${m.id}/password`, { method: 'POST', body: { password } })
      setResetDone({ name: m.name, email: m.email, role: m.role, password })
      reload()
    } catch (e) {
      setMsg({ tone: 'danger', text: errorMessage(e) })
      setReset(null)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card>
        {msg && (
          <div className="mb-3">
            <Notice tone={msg.tone}>{msg.text}</Notice>
          </div>
        )}
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <Table empty={!data?.length} head={['Membre', 'Poste', 'Statut', '']}>
            {data?.map((m) => {
              const self = m.id === me?.id
              return (
                <tr key={m.id}>
                  <td className="px-3 py-2.5">
                    <div className="font-bold">
                      {m.name} {self && <Pill>moi</Pill>}
                    </div>
                    <div className="text-xs break-all text-muted">{m.email}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Select value={m.role} disabled={self} onChange={(e) => changeRole(m, e.target.value)} className="min-w-48" aria-label={`Poste de ${m.name}`}>
                      {Object.entries(ROLE_LABELS).map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                      <option value="user">Retirer l'accès</option>
                    </Select>
                  </td>
                  <td className="px-3 py-2.5">
                    {m.status === 'suspended' ? <Pill tone="pink">Suspendu</Pill> : m.must_change_password ? <Pill tone="gold">1re connexion attendue</Pill> : <Pill tone="mint">Actif</Pill>}
                    <div className="mt-1 text-xs whitespace-nowrap text-muted">Ajouté le {fmtDate(m.created_at)}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {!self && (
                      <Button size="sm" variant="ghost" className="whitespace-nowrap" icon={<KeyRound className="size-4" />} onClick={() => (setResetDone(null), setReset(m))}>
                        Réinitialiser
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </Table>
        )}
      </Card>

      <Card className="space-y-3 self-start">
        <h2 className="flex items-center gap-2 font-black">
          <UserPlus className="size-5" /> Créer un compte
        </h2>
        {created ? (
          <CredentialsCard c={created} onClose={() => setCreated(null)} />
        ) : (
          <>
            <Field label="Nom complet" required error={errors.name}>
              <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex. Awa Ndiaye" />
            </Field>
            <Field label="E-mail" required error={errors.email} hint="La personne se connectera avec cet e-mail.">
              <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="prenom.nom@moon.sn" />
            </Field>
            <Field label="Poste" required hint={ROLE_SCOPES[f.role]}>
              <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
                {Object.entries(ROLE_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Mot de passe provisoire" required error={errors.password} hint="Au moins 8 caractères. La personne le remplacera à sa première connexion." group>
              <div className="flex gap-2">
                <Input type={show ? 'text' : 'password'} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} className="font-mono" aria-label="Mot de passe provisoire" />
                <Button type="button" size="sm" variant="ghost" onClick={() => setShow(!show)} aria-label={show ? 'Masquer' : 'Afficher'}>
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setF({ ...f, password: generatePassword() })} aria-label="Générer un autre mot de passe" title="Générer">
                  <RefreshCw className="size-4" />
                </Button>
              </div>
            </Field>
            <Button className="w-full" onClick={create} loading={saving} disabled={!f.name.trim() || !f.email.trim() || f.password.length < 8}>
              Créer le compte
            </Button>
          </>
        )}
      </Card>

      <Modal open={!!reset} onClose={() => setReset(null)} title={`Nouveau mot de passe pour ${reset?.name ?? ''}`}>
        {resetDone ? (
          <CredentialsCard c={resetDone} onClose={() => setReset(null)} />
        ) : (
          <div className="space-y-4">
            <p className="text-sm">
              Un mot de passe provisoire va être créé. {reset?.name} sera déconnecté(e) de tous ses appareils et devra choisir un nouveau mot de passe personnel à la prochaine connexion.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setReset(null)}>
                Annuler
              </Button>
              <Button onClick={() => reset && doReset(reset)}>Créer le mot de passe</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function Audit() {
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)
  const { data, loading, error, reload } = useApi<Paginated<Log>>(`/admin/audit-logs?page=${page}${action ? `&action=${action}` : ''}`)
  return (
    <Card>
      <div className="mb-3 flex gap-2">
        <Select value={action} onChange={(e) => (setAction(e.target.value), setPage(1))} className="w-auto">
          <option value="">Toutes les actions</option>
          {['module', 'question', 'user', 'help_request', 'report', 'resource', 'announcement', 'staff'].map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
      </div>
      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <Table empty={!data?.data.length} head={['Date', 'Membre', 'Action', 'Objet', 'Détails']}>
          {data?.data.map((l) => (
            <tr key={l.id}>
              <td className="px-3 py-2 whitespace-nowrap">{fmtDateTime(l.created_at)}</td>
              <td className="px-3 py-2">
                {l.user?.name ?? '—'} {l.user && <Pill>{ROLE_LABELS[l.user.role] ?? l.user.role}</Pill>}
              </td>
              <td className="px-3 py-2 font-mono text-xs">{l.action}</td>
              <td className="px-3 py-2">{l.subject_type ? `${l.subject_type} #${l.subject_id}` : '—'}</td>
              <td className="max-w-xs truncate px-3 py-2 font-mono text-[11px] text-muted">{l.meta ? JSON.stringify(l.meta) : ''}</td>
            </tr>
          ))}
        </Table>
      )}
      {data && <Pagination page={data.current_page} last={data.last_page} onChange={setPage} />}
    </Card>
  )
}
