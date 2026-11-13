import { ArrowLeft, Lock } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, Card, Checkbox, ErrorState, Field, Input, Loading, Modal, Notice, Pill, Select, Textarea, cx } from '../../components/ui'
import { api, errorMessage, type Paginated } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { fmtDateTime } from '../../lib/format'
import { useApi } from '../../lib/hooks'
import { HELP_STATUS, HELP_TYPES } from './HelpQueue'

type Thread = {
  id: number
  type: string
  subject: string | null
  message: string
  priority: string
  status: string
  is_anonymous: boolean
  faq_consent: boolean
  created_at: string
  assigned_to: number | null
  user: { name: string; age_range: string | null } | null
  messages: { id: number; body: string; from_staff: boolean; is_internal: boolean; created_at: string; sender: { name: string } | null }[]
}

export default function HelpThread() {
  const { id } = useParams()
  const { staff } = useAuth()
  const { data: h, loading, error, reload } = useApi<Thread>(`/admin/help-requests/${id}`)
  const team = useApi<Paginated<{ id: number; name: string; role: string }>>('/admin/users?role=staff')
  const [body, setBody] = useState('')
  const [internal, setInternal] = useState(false)
  const [msg, setMsg] = useState('')
  const [faq, setFaq] = useState<{ question: string; answer: string } | null>(null)

  const patch = async (b: Record<string, unknown>) => {
    try {
      await api(`/admin/help-requests/${id}`, { method: 'PATCH', body: b })
      reload()
    } catch (e) {
      setMsg(errorMessage(e))
    }
  }
  const send = async () => {
    try {
      await api(`/admin/help-requests/${id}/messages`, { method: 'POST', body: { body, is_internal: internal } })
      setBody('')
      reload()
    } catch (e) {
      setMsg(errorMessage(e))
    }
  }
  const publishFaq = async () => {
    try {
      await api(`/admin/help-requests/${id}/faq`, { method: 'POST', body: faq })
      setFaq(null)
      setMsg('Publié dans la FAQ (sans le nom de la personne).')
    } catch (e) {
      setMsg(errorMessage(e))
    }
  }

  if (loading && !h) return <Loading />
  if (error || !h) return <ErrorState message={error ?? ''} onRetry={reload} forbidden={error?.includes('rôle')} />

  return (
    <>
      <Link to="/demandes" className="mb-4 flex items-center gap-1 font-bold text-muted hover:text-night">
        <ArrowLeft className="size-4" /> Demandes d'aide
      </Link>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-black">{h.subject || HELP_TYPES[h.type]}</h1>
        {h.priority === 'urgent' && <Pill tone="danger">Urgente</Pill>}
        <Pill tone={HELP_STATUS[h.status].tone}>{HELP_STATUS[h.status].label}</Pill>
      </div>
      {msg && (
        <div className="mb-4">
          <Notice>{msg}</Notice>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <div className="space-y-3">
            <Bubble mine={false} name={h.user?.name ?? 'Anonyme'} body={h.message} at={h.created_at} />
            {h.messages.map((m) => (
              <Bubble key={m.id} mine={m.from_staff} internal={m.is_internal} name={m.from_staff ? m.sender?.name ?? 'Équipe' : h.user?.name ?? 'Anonyme'} body={m.body} at={m.created_at} />
            ))}
          </div>
          {h.status !== 'resolved' && (
            <div className="mt-5 space-y-2 border-t border-line pt-4">
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={internal ? 'Note interne (jamais visible dans l\'app)…' : 'Ta réponse, bienveillante et claire…'} className={internal ? 'bg-gold-soft' : ''} />
              <div className="flex items-center justify-between">
                <Checkbox checked={internal} onChange={setInternal} label="Note interne" />
                <Button onClick={send} disabled={!body.trim()} variant={internal ? 'soft' : 'pink'}>
                  {internal ? 'Ajouter la note' : 'Répondre dans l\'app'}
                </Button>
              </div>
            </div>
          )}
        </Card>
        <div className="space-y-4">
          <Card className="space-y-3">
            <Field label="Priorité">
              <Select value={h.priority} onChange={(e) => patch({ priority: e.target.value })}>
                <option value="normal">Normale</option>
                <option value="urgent">Urgente</option>
              </Select>
            </Field>
            <Field label="Assignée à">
              <Select value={h.assigned_to ?? ''} onChange={(e) => patch({ assigned_to: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Personne</option>
                {staff && <option value={staff.id}>Moi</option>}
                {team.data?.data
                  .filter((t) => t.id !== staff?.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Statut">
              <Select value={h.status} onChange={(e) => patch({ status: e.target.value })}>
                {Object.entries(HELP_STATUS).map(([k, s]) => (
                  <option key={k} value={k}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          </Card>
          <Card className="text-sm">
            <p>
              <b>Type :</b> {HELP_TYPES[h.type]}
            </p>
            <p>
              <b>De :</b> {h.user?.name ?? 'Anonyme'} {h.user?.age_range && `(${h.user.age_range} ans)`}
            </p>
            {h.is_anonymous && (
              <p className="mt-2 flex items-center gap-1 text-xs text-muted">
                <Lock className="size-3" /> Demande anonyme : l'identité n'est pas affichée.
              </p>
            )}
            {h.faq_consent && (
              <Button size="sm" variant="soft" className="mt-3 w-full" onClick={() => setFaq({ question: h.message, answer: h.messages.find((m) => m.from_staff && !m.is_internal)?.body ?? '' })}>
                Publier dans la FAQ
              </Button>
            )}
          </Card>
        </div>
      </div>
      <Modal
        open={!!faq}
        onClose={() => setFaq(null)}
        title="Publier dans la FAQ"
        footer={
          <Button onClick={publishFaq} disabled={!faq?.question || !faq?.answer}>
            Publier
          </Button>
        }
      >
        <div className="space-y-3">
          <Notice tone="gold">Reformule la question pour retirer tout détail personnel.</Notice>
          <Field label="Question">
            <Input value={faq?.question ?? ''} onChange={(e) => setFaq({ ...faq!, question: e.target.value })} />
          </Field>
          <Field label="Réponse">
            <Textarea value={faq?.answer ?? ''} onChange={(e) => setFaq({ ...faq!, answer: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </>
  )
}

function Bubble({ mine, internal, name, body, at }: { mine: boolean; internal?: boolean; name: string; body: string; at: string }) {
  return (
    <div className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className={cx('max-w-[85%] rounded-2xl px-4 py-3 text-sm', internal ? 'border border-dashed border-gold bg-gold-soft' : mine ? 'bg-lavender' : 'border border-line bg-white')}>
        <div className="mb-1 text-xs font-black text-purple">
          {name} {internal && '· note interne'}
        </div>
        <p className="whitespace-pre-wrap">{body}</p>
        <div className="mt-1 text-[11px] text-muted">{fmtDateTime(at)}</div>
      </div>
    </div>
  )
}
