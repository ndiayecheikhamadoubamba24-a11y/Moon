import { ArrowLeft, Award, BookOpen, CheckCircle2, Gamepad2, Info, KeyRound, Lock, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Checkbox, ErrorState, Field, Input, Loading, Modal, Notice, Pill, Select } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { fmtDate, fmtDateTime, relative, since } from '../../lib/format'
import { useApi } from '../../lib/hooks'
import { statusOf, type UserRow } from './Users'

type Detail = UserRow & {
  language: string
  usage: { modules_completed: number; badges: number; games_played: number }
  moderation: { reports: number; last_action: { action: string; at: string } | null }
  consented_at: string | null
  guardian_consent: boolean
}

const REASONS = ['Contenu inapproprié', 'Comportement abusif', 'Spam', 'Usurpation', 'Autre']

export default function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { can } = useAuth()
  const { data: u, loading, error, reload } = useApi<Detail>(`/admin/users/${id}`)
  const reports = useApi<{ data: { id: number; reason: string }[] }>(can('moderator') ? '/admin/reports?status=open' : null)
  const [modal, setModal] = useState<'suspend' | 'activate' | 'access' | 'delete' | null>(null)
  const [msg, setMsg] = useState<{ tone: 'mint' | 'danger'; text: string } | null>(null)

  const act = async (path: string, body: unknown, method: 'POST' | 'DELETE' = 'POST', after?: () => void) => {
    try {
      const r = await api<{ message?: string }>(path, { method, body })
      setModal(null)
      setMsg({ tone: 'mint', text: r?.message ?? 'Action effectuée.' })
      after ? after() : reload()
    } catch (e) {
      setMsg({ tone: 'danger', text: errorMessage(e) })
    }
  }

  if (loading && !u) return <Loading />
  if (error || !u) return <ErrorState message={error ?? ''} onRetry={reload} />
  const st = statusOf(u)

  return (
    <>
      <Link to="/utilisateurs" className="mb-4 flex items-center gap-1 font-bold text-muted hover:text-night">
        <ArrowLeft className="size-4" /> Utilisateurs
      </Link>
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-full bg-lavender text-2xl">⭐</div>
        <div>
          <h1 className="text-2xl font-black">{u.name}</h1>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono font-bold text-muted">{u.reference}</span>
            <Pill tone={st.tone}>{st.label}</Pill>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {u.status === 'suspended' ? (
            <Button variant="outline" onClick={() => setModal('activate')}>
              Réactiver
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setModal('suspend')}>
              Suspendre
            </Button>
          )}
          <Button variant="outline" icon={<KeyRound className="size-4" />} onClick={() => setModal('access')}>
            Aider à retrouver l'accès
          </Button>
          <Button variant="pink" icon={<Trash2 className="size-4" />} onClick={() => setModal('delete')}>
            Supprimer le compte
          </Button>
        </div>
      </div>
      {msg && (
        <div className="mb-4">
          <Notice tone={msg.tone}>{msg.text}</Notice>
        </div>
      )}
      {u.status === 'suspended' && (
        <div className="mb-4">
          <Notice tone="danger">
            Suspendu{u.suspended_until ? ` jusqu'au ${fmtDate(u.suspended_until)}` : " jusqu'à nouvel ordre"} — motif : {u.suspension_reason ?? '—'}
          </Notice>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="mb-3 font-black">Profil</h2>
          <dl className="space-y-2 text-sm">
            {[
              ["Tranche d'âge", u.age_range ?? '—'],
              ['Langue', u.language === 'wo' ? 'Wolof (WO)' : 'Français (FR)'],
              ['Région', u.region ?? '—'],
              ['Inscription', since(u.created_at)],
              ['Dernière activité', relative(u.last_activity_date)],
              ['Consentement', u.consented_at ? `Oui (${fmtDate(u.consented_at)})` : 'Non'],
              ['Accord parental', u.guardian_consent ? 'Oui' : '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-muted">{k}</dt>
                <dd className="font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <h2 className="mb-3 font-black">Utilisation</h2>
          <ul className="space-y-3 text-sm font-bold">
            <li className="flex items-center gap-2">
              <BookOpen className="size-4 text-purple" /> Modules terminés : {u.usage.modules_completed}
            </li>
            <li className="flex items-center gap-2">
              <Award className="size-4 text-purple" /> Badges gagnés : {u.usage.badges}
            </li>
            <li className="flex items-center gap-2">
              <Gamepad2 className="size-4 text-purple" /> Parties jouées : {u.usage.games_played}
            </li>
          </ul>
        </Card>
        <Card>
          <h2 className="mb-3 font-black">Modération</h2>
          <p className="text-sm">
            Signalements : <b>{u.moderation.reports}</b>
          </p>
          <p className="mt-2 text-sm">
            Dernière action : <b>{u.moderation.last_action ? `${u.moderation.last_action.action} · ${fmtDateTime(u.moderation.last_action.at)}` : 'aucune'}</b>
          </p>
        </Card>
      </div>
      <div className="mt-4">
        <Notice icon={<Info className="size-4 shrink-0" />}>Tu ne vois ni les données de santé, ni les échanges d'aide, ni l'identité de cette personne.</Notice>
      </div>

      <SuspendModal open={modal === 'suspend'} onClose={() => setModal(null)} reports={reports.data?.data ?? []} onConfirm={(b) => act(`/admin/users/${u.id}/suspend`, b)} />
      <ReasonModal
        open={modal === 'activate'}
        onClose={() => setModal(null)}
        title="Réactiver ce compte ?"
        intro={`Ce compte avait été suspendu pour : ${u.suspension_reason ?? '—'}.`}
        icon={<CheckCircle2 className="mx-auto size-12 text-mint" />}
        options={['Compte conforme aux règles', 'Erreur de modération', 'Fin de la sanction']}
        confirmLabel="Réactiver"
        onConfirm={(reason) => act(`/admin/users/${u.id}/activate`, { reason })}
      />
      <AccessModal
        open={modal === 'access'}
        onClose={() => setModal(null)}
        onConfirm={async (b) => {
          try {
            const r = await api<{ temporary_password: string | null; message: string }>(`/admin/users/${u.id}/reset-access`, { method: 'POST', body: b })
            setMsg({ tone: 'mint', text: r.message })
            return r.temporary_password
          } catch (e) {
            setMsg({ tone: 'danger', text: errorMessage(e) })
            setModal(null)
            return null
          }
        }}
      />
      <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={(reason) => act(`/admin/users/${u.id}`, { reason, confirm: true }, 'DELETE', () => navigate('/utilisateurs'))} />
    </>
  )
}

function SuspendModal({ open, onClose, onConfirm, reports }: { open: boolean; onClose: () => void; onConfirm: (b: unknown) => void; reports: { id: number; reason: string }[] }) {
  const [days, setDays] = useState<number | null>(7)
  const [reason, setReason] = useState(REASONS[0])
  const [report, setReport] = useState('')
  const [ok, setOk] = useState(false)
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Suspendre ce compte"
      wide
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={!ok} onClick={() => onConfirm({ days, reason, report_id: report || null })}>
            Confirmer la suspension
          </Button>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-4">
          <Field group label="Durée">
            <div className="flex gap-2">
              {[
                [7, '7 jours'],
                [30, '30 jours'],
                [null, "Jusqu'à nouvel ordre"],
              ].map(([v, l]) => (
                <Button key={String(v)} size="sm" variant={days === v ? 'night' : 'outline'} onClick={() => setDays(v as number | null)}>
                  {l as string}
                </Button>
              ))}
            </div>
          </Field>
          <Field label="Motif" required>
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
          </Field>
          <Field label="Lien avec un signalement">
            <Select value={report} onChange={(e) => setReport(e.target.value)}>
              <option value="">Aucun</option>
              {reports.map((r) => (
                <option key={r.id} value={r.id}>
                  SIG-{r.id} – {r.reason}
                </option>
              ))}
            </Select>
          </Field>
          <Checkbox checked={ok} onChange={setOk} label="Je confirme cette action" />
        </div>
        <div className="rounded-2xl bg-lavender-soft p-4 text-center text-sm">
          <p className="mb-2 font-black">Aperçu du message envoyé</p>
          <Lock className="mx-auto size-8 text-purple" />
          <p className="mt-2 font-bold">Ton compte est temporairement suspendu{days ? ` pour une durée de ${days} jours` : ''}.</p>
          <p className="mt-1 text-xs text-muted">Tu peux contacter notre équipe si tu as une question.</p>
        </div>
      </div>
    </Modal>
  )
}

function ReasonModal({ open, onClose, title, intro, icon, options, confirmLabel, onConfirm }: { open: boolean; onClose: () => void; title: string; intro: string; icon: React.ReactNode; options: string[]; confirmLabel: string; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState(options[0])
  return (
    <Modal open={open} onClose={onClose} title={title} footer={<Button onClick={() => onConfirm(reason)}>{confirmLabel}</Button>}>
      <div className="space-y-4 text-center">
        {icon}
        <p className="text-sm">{intro}</p>
        <Field label="Motif de la réactivation" required>
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            {options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  )
}

function AccessModal({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (b: { temporary_password: boolean; unlock: boolean }) => Promise<string | null> }) {
  const [temporary, setTemporary] = useState(true)
  const [password, setPassword] = useState<string | null>(null)
  const close = () => (setPassword(null), onClose())
  return (
    <Modal
      open={open}
      onClose={close}
      title="Aider cette personne à retrouver son accès"
      footer={
        password ? (
          <Button onClick={close}>Terminé</Button>
        ) : (
          <Button onClick={async () => setPassword(await onConfirm({ temporary_password: temporary, unlock: true }))}>Valider</Button>
        )
      }
    >
      {password ? (
        <div className="space-y-3 text-center">
          <p className="text-sm font-bold">Mot de passe temporaire :</p>
          <p className="rounded-2xl bg-lavender-soft py-4 font-mono text-3xl font-black tracking-widest select-all">{password}</p>
          <Notice tone="gold">Transmets-le uniquement à la personne, après avoir vérifié son identité. Il ne sera plus affiché. Elle pourra le changer dans son profil.</Notice>
        </div>
      ) : (
        <div className="space-y-3">
          <Checkbox checked={temporary} onChange={setTemporary} label="Créer un mot de passe temporaire" />
          <Notice>Tous ses appareils seront déconnectés. Vérifie d'abord l'identité de la personne (par exemple au centre ou par téléphone).</Notice>
        </div>
      )}
    </Modal>
  )
}

function DeleteModal({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('Demande de la personne')
  const [ok, setOk] = useState(false)
  const [typed, setTyped] = useState('')
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Supprimer définitivement ce compte ?"
      footer={
        <Button variant="danger" disabled={!ok || typed !== 'SUPPRIMER'} onClick={() => onConfirm(reason)}>
          Supprimer définitivement
        </Button>
      }
    >
      <div className="space-y-4">
        <Notice tone="danger">Cette action est irréversible. Elle effacera : profil, cycles, journal, progression, badges, scores.</Notice>
        <Field label="Motif" required>
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option>Demande de la personne</option>
            <option>Compte inactif depuis 24 mois</option>
            <option>Violation grave des règles</option>
            <option>Compte en double</option>
          </Select>
        </Field>
        <Checkbox checked={ok} onChange={setOk} label="J'ai compris que c'est irréversible" />
        <Field label="Tape SUPPRIMER pour confirmer">
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
